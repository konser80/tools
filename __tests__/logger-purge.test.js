const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { _startPurge: startPurge, _stopPurge: stopPurge } = require('../logger');

const LOGGER = path.resolve(__dirname, '../logger.js');
const DAY = 86400000;

// ==============================================
// таймер чистки заведён на сутки, поэтому время двигаем фейковыми таймерами.
// setImmediate не подменяем: только через него можно дождаться реального
// дискового ввода-вывода, который запускает purgeOldFiles
// ==============================================
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
});

afterEach(() => {
  stopPurge();
  jest.useRealTimers();
});

// ==============================================
function makeLogdir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purge-logs-'));

  Object.entries(files).forEach(([rel, ageMs]) => {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'x');
    const when = new Date(Date.now() - ageMs);
    fs.utimesSync(full, when, when);
  });

  return dir;
}
// ==============================================
// прокручивает сутки и ждёт, пока чистка реально доберётся до диска
// ==============================================
async function tickOneDay() {
  jest.advanceTimersByTime(DAY);
  for (let i = 0; i < 50; i += 1) await new Promise((r) => setImmediate(r)); // eslint-disable-line no-await-in-loop
}
// ==============================================
const exists = (dir, rel) => fs.existsSync(path.join(dir, rel));

// ==============================================
describe('startPurge', () => {

  test('удаляет старые ротированные логи через сутки', async () => {
    const dir = makeLogdir({ 'trace.old/2026-01/trace.log': 40 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();

    expect(exists(dir, 'trace.old/2026-01/trace.log')).toBe(false);
  });

  test('не трогает свежие ротированные логи', async () => {
    const dir = makeLogdir({ 'trace.old/2026-08/trace.log': 2 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();

    expect(exists(dir, 'trace.old/2026-08/trace.log')).toBe(true);
  });

  test('не трогает активные логи в корне папки', async () => {
    const dir = makeLogdir({ 'trace.log': 40 * DAY, 'error.log': 40 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();

    expect(exists(dir, 'trace.log')).toBe(true);
    expect(exists(dir, 'error.log')).toBe(true);
  });

  test('ничего не удаляет до наступления суток', async () => {
    const dir = makeLogdir({ 'trace.old/2026-01/trace.log': 40 * DAY });
    startPurge(dir, '30d');

    jest.advanceTimersByTime(DAY - 1000);
    for (let i = 0; i < 50; i += 1) await new Promise((r) => setImmediate(r)); // eslint-disable-line no-await-in-loop

    expect(exists(dir, 'trace.old/2026-01/trace.log')).toBe(true);
  });

  test('чистит каждые сутки, а не один раз', async () => {
    const dir = makeLogdir({ 'trace.old/2026-01/first.log': 40 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();
    expect(exists(dir, 'trace.old/2026-01/first.log')).toBe(false);

    fs.mkdirSync(path.join(dir, 'trace.old/2026-02'), { recursive: true });
    const second = path.join(dir, 'trace.old/2026-02/second.log');
    fs.writeFileSync(second, 'x');
    const when = new Date(Date.now() - 40 * DAY);
    fs.utimesSync(second, when, when);

    await tickOneDay();
    expect(fs.existsSync(second)).toBe(false);
  });

  test('чистит и ротированные error-логи', async () => {
    const dir = makeLogdir({ 'error.old/2026-01.log': 40 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();

    expect(exists(dir, 'error.old/2026-01.log')).toBe(false);
  });

  test('учитывает prefix в именах папок', async () => {
    const dir = makeLogdir({ 'bot_trace.old/2026-01/x.log': 40 * DAY, 'trace.old/2026-01/x.log': 40 * DAY });
    startPurge(dir, '30d', 'bot_');

    await tickOneDay();

    expect(exists(dir, 'bot_trace.old/2026-01/x.log')).toBe(false);
    expect(exists(dir, 'trace.old/2026-01/x.log')).toBe(true);
  });

  test('не трогает не-.log файлы в папке ротации', async () => {
    const dir = makeLogdir({ 'trace.old/2026-01/x.log': 40 * DAY, 'trace.old/2026-01/notes.txt': 40 * DAY });
    startPurge(dir, '30d');

    await tickOneDay();

    expect(exists(dir, 'trace.old/2026-01/x.log')).toBe(false);
    expect(exists(dir, 'trace.old/2026-01/notes.txt')).toBe(true);
  });

  test('не создаёт папок, пока ротации не было', async () => {
    const dir = makeLogdir({});
    startPurge(dir, '30d');

    await tickOneDay();

    expect(fs.readdirSync(dir)).toEqual([]);
  });

  test('повторный запуск не плодит таймеры', () => {
    const dir = makeLogdir({});
    startPurge(dir, '30d');
    startPurge(dir, '30d');

    expect(jest.getTimerCount()).toBe(1);
  });

  test('stopPurge останавливает чистку', async () => {
    const dir = makeLogdir({ 'trace.old/2026-01/trace.log': 40 * DAY });
    startPurge(dir, '30d');
    stopPurge();

    await tickOneDay();

    expect(jest.getTimerCount()).toBe(0);
    expect(exists(dir, 'trace.old/2026-01/trace.log')).toBe(true);
  });

  test('stopPurge без запущенной чистки не падает', () => {
    expect(() => stopPurge()).not.toThrow();
  });

});

// ==============================================
// страховка от того, ради чего чинился путь: startPurge ходит в
// <dir>/<prefix>trace.old, и это должно совпадать с тем, как streamroller
// на самом деле именует ротированные файлы. схему спрашиваем у неё самой
// ==============================================
describe('startPurge попадает в реальные папки ротации', () => {

  // streamroller приходит транзитивно через log4js — прямой зависимости нет,
  // но именно её схема именования тут и проверяется
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const fileNameFormatter = require('streamroller/lib/fileNameFormatter');

  const rotatedName = (dir, base, datepart) => fileNameFormatter({
    file: path.parse(path.join(dir, base)),
    keepFileExt: true,
    needsIndex: false,
    alwaysIncludeDate: true,
    compress: false,
  })({ date: datepart, index: 0 });

  test.each([
    ['trace.log', 'old/2026-01/2026-01-05'],
    ['error.log', 'old/2026-01'],
  ])('удаляет ротированный %s', async (base, datepart) => {
    const dir = makeLogdir({});
    const rotated = rotatedName(dir, base, datepart);

    fs.mkdirSync(path.dirname(rotated), { recursive: true });
    fs.writeFileSync(rotated, 'x');
    const when = new Date(Date.now() - 40 * DAY);
    fs.utimesSync(rotated, when, when);

    startPurge(dir, '30d');
    await tickOneDay();

    expect(fs.existsSync(rotated)).toBe(false);
  });

});

// ==============================================
describe('configureLogger с keep', () => {

  // отдельный процесс: только так видно, что таймер не держит процесс живым
  const runChild = (opts, body = '') => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'purge-child-'));
    const script = path.join(dir, 'child.js');

    fs.mkdirSync(path.join(dir, 'logs/trace.old/2026-01'), { recursive: true });
    const stale = path.join(dir, 'logs/trace.old/2026-01/trace.log');
    fs.writeFileSync(stale, 'x');
    const when = new Date(Date.now() - 40 * DAY);
    fs.utimesSync(stale, when, when);

    fs.writeFileSync(script, `
      const configureLogger = require(${JSON.stringify(LOGGER)});
      const log = configureLogger('silly', Object.assign({ dir: ${JSON.stringify(path.join(dir, 'logs'))} }, ${JSON.stringify(opts)}));
      ${body}
    `);

    let code = 0;
    let timedout = false;
    try {
      execFileSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', stdio: 'ignore', timeout: 5000 });
    }
    catch (e) {
      code = e.status;
      timedout = e.signal === 'SIGTERM';
    }

    return { code, timedout, stale };
  };

  test('таймер чистки не держит процесс живым', () => {
    const res = runChild({ keep: '30d' }, 'console.log("done");');

    expect(res.timedout).toBe(false);
    expect(res.code).toBe(0);
  });

  test('без keep чистка не запускается', () => {
    const res = runChild({}, 'console.log("done");');

    expect(res.timedout).toBe(false);
    expect(fs.existsSync(res.stale)).toBe(true);
  });

  test('logger.stopPurge доступен вызывающему коду', () => {
    const res = runChild({ keep: '30d' }, 'if (typeof log.stopPurge !== "function") process.exit(3); log.stopPurge();');

    expect(res.code).toBe(0);
  });

});
