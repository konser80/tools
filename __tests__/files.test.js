const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { purgeOldFiles } = require('../files');

const FILES = path.resolve(__dirname, '../files.js');
const INDEX = path.resolve(__dirname, '../index.js');

// ==============================================
// files.js должен грузиться сам по себе, без бареля: только в отдельном
// процессе видно, что реально попало в require.cache и в Array.prototype
// ==============================================
function runChild(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-test-'));
  const script = path.join(dir, 'child.js');

  fs.writeFileSync(script, `
    const FILES = ${JSON.stringify(FILES)};
    const INDEX = ${JSON.stringify(INDEX)};
    const DIR = ${JSON.stringify(dir)};
    ${body}
  `);

  let code = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  }
  catch (e) {
    code = e.status;
    stdout = e.stdout || '';
    stderr = e.stderr || '';
  }

  return { code, stdout, stderr, dir };
}
// ==============================================
function makeTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'purge-test-'));

  Object.entries(files).forEach(([rel, ageMs]) => {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'x');
    const when = new Date(Date.now() - ageMs);
    fs.utimesSync(full, when, when);
  });

  return root;
}
// ==============================================
const DAY = 86400000;

describe('files.js dependencies', () => {

  test('does not pull logger into the module cache', () => {
    const { stdout, stderr } = runChild(`
      require(FILES);
      const loaded = Object.keys(require.cache).filter((p) => /(logger|log4js)/.test(p));
      console.log(JSON.stringify(loaded));
    `);

    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual([]);
  });

  test('does not depend on Array.prototype.forEachAsync being patched', () => {
    const root = makeTree({ 'old.log': 40 * DAY });
    const { stdout, stderr } = runChild(`
      const { purgeOldFiles } = require(FILES);
      if (typeof [].forEachAsync === 'function') throw new Error('prototype already patched');
      purgeOldFiles(${JSON.stringify(root)}, '30d').then((res) => console.log(JSON.stringify(res)));
    `);

    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toEqual(['/old.log']);
  });

  test('index exposes purgeOldFiles when files.js is required first', () => {
    const { stdout, stderr } = runChild(`
      require(FILES);
      console.log(typeof require(INDEX).purgeOldFiles);
    `);

    expect(stderr).toBe('');
    expect(stdout.trim()).toBe('function');
  });

});

describe('purgeOldFiles', () => {

  test('deletes files older than the timeframe', async () => {
    const root = makeTree({ 'old.log': 40 * DAY });
    const res = await purgeOldFiles(root, '30d');

    expect(res).toEqual(['/old.log']);
    expect(fs.existsSync(path.join(root, 'old.log'))).toBe(false);
  });

  test('keeps files newer than the timeframe', async () => {
    const root = makeTree({ 'fresh.log': 2 * DAY });
    const res = await purgeOldFiles(root, '30d');

    expect(res).toEqual([]);
    expect(fs.existsSync(path.join(root, 'fresh.log'))).toBe(true);
  });

  test('walks subfolders and removes those left empty', async () => {
    const root = makeTree({ 'old/2026-01/trace.log': 40 * DAY });
    const res = await purgeOldFiles(root, '30d');

    expect(res).toEqual(expect.arrayContaining(['/old/2026-01/trace.log', '/old/2026-01']));
    expect(fs.existsSync(path.join(root, 'old/2026-01'))).toBe(false);
  });

  test('keeps a subfolder that still holds fresh files', async () => {
    const root = makeTree({ 'old/2026-01/trace.log': 40 * DAY, 'old/2026-01/error.log': 1 * DAY });
    await purgeOldFiles(root, '30d');

    expect(fs.existsSync(path.join(root, 'old/2026-01/error.log'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'old/2026-01'))).toBe(true);
  });

  test('returns false without a folder or a timeframe', async () => {
    await expect(purgeOldFiles(null, '30d')).resolves.toBe(false);
    await expect(purgeOldFiles('/tmp', null)).resolves.toBe(false);
  });

});

describe('purgeOldFiles with an extension filter', () => {

  test('deletes only matching files', async () => {
    const root = makeTree({ 'old.log': 40 * DAY, 'old.txt': 40 * DAY });
    const res = await purgeOldFiles(root, '30d', { ext: '.log' });

    expect(res).toEqual(['/old.log']);
    expect(fs.existsSync(path.join(root, 'old.txt'))).toBe(true);
  });

  test('accepts a list of extensions', async () => {
    const root = makeTree({ 'old.log': 40 * DAY, 'old.log.gz': 40 * DAY, 'old.txt': 40 * DAY });
    const res = await purgeOldFiles(root, '30d', { ext: ['.log', '.log.gz'] });

    expect(res).toEqual(expect.arrayContaining(['/old.log', '/old.log.gz']));
    expect(fs.existsSync(path.join(root, 'old.txt'))).toBe(true);
  });

  test('matches the tail of the name, not path.extname', async () => {
    const root = makeTree({ 'trace.log.gz': 40 * DAY });
    await purgeOldFiles(root, '30d', { ext: '.log.gz' });

    expect(fs.existsSync(path.join(root, 'trace.log.gz'))).toBe(false);
  });

  test('ignores case', async () => {
    const root = makeTree({ 'OLD.LOG': 40 * DAY });
    await purgeOldFiles(root, '30d', { ext: '.log' });

    expect(fs.existsSync(path.join(root, 'OLD.LOG'))).toBe(false);
  });

  test('keeps a subfolder held by a non-matching file', async () => {
    const root = makeTree({ 'old/2026-01/trace.log': 40 * DAY, 'old/2026-01/notes.txt': 40 * DAY });
    await purgeOldFiles(root, '30d', { ext: '.log' });

    expect(fs.existsSync(path.join(root, 'old/2026-01/trace.log'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'old/2026-01'))).toBe(true);
  });

  test('deletes everything when no filter is given', async () => {
    const root = makeTree({ 'old.log': 40 * DAY, 'old.txt': 40 * DAY });
    const res = await purgeOldFiles(root, '30d');

    expect(res).toEqual(expect.arrayContaining(['/old.log', '/old.txt']));
  });

  test('does not create the folder it was pointed at', async () => {
    const root = makeTree({});
    const missing = path.join(root, 'nope');
    const res = await purgeOldFiles(missing, '30d');

    expect(res).toEqual([]);
    expect(fs.existsSync(missing)).toBe(false);
  });

});
