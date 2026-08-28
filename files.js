const fs = require('fs/promises');
const dayjs = require('dayjs');
const path = require('path');
const { tftotime } = require('./timeframes');
const { forEachAsyncFn } = require('./arrays');

// ==============================================
// opts.ext — строка или массив расширений ('.log', ['.log', '.log.gz']).
// без него удаляем всё подряд: функция публичная, снаружи её зовут
// не только для логов
// ==============================================
async function removeOldFiles(folder, older, opts = {}) {
  if (!folder) return false;
  if (!older) return false;


  const now = dayjs().valueOf();
  const diff = tftotime(older || '30d');
  const earlier = now - diff;

  const res = await removeRecursive(earlier, folder, '', extList(opts.ext));
  return res;
}
// ==============================================
function extList(ext) {
  if (!ext) return null;

  const list = (Array.isArray(ext) ? ext : [ext])
    .filter(Boolean)
    .map((s) => s.toString().toLowerCase());

  return list.length ? list : null;
}
// ==============================================
// сравниваем хвост имени, а не path.extname: иначе не поймать
// составные расширения вроде .log.gz
// ==============================================
function extMatch(fname, exts) {
  if (!exts) return true;

  const name = fname.toLowerCase();
  return exts.some((ext) => name.endsWith(ext));
}
// ==============================================
async function removeRecursive(earlier, folder, sub = '', exts = null) {

  let flist = [];
  const newRoot = path.join(folder, sub);
  try {
    const list = await fs.readdir(newRoot);
    await forEachAsyncFn.call(list, async (fname) => {
      const stat = await fs.stat(path.join(newRoot, fname));

      // this is a folder
      if (!stat.isFile()) {
        const newSub = `${sub}/${fname}`;
        const sublist = await removeRecursive(earlier, folder, newSub, exts);
        flist = flist.concat(sublist);

        const remdir = await removeEmptyFolder(folder, newSub);
        if (remdir) flist.push(remdir);
        return true;
      }

      if (!extMatch(fname, exts)) return false;
      if (stat.mtimeMs > earlier) return false;

      // console.debug(`[+] delete file ${sub}/${fname}`, { ms: false });
      await fs.unlink(path.join(newRoot, fname));
      flist.push(`${sub}/${fname}`);
    });
  }
  catch (err) {
    // папки может не быть — ротация ещё не случилась, это не ошибка
    if (err.code === 'ENOENT') return flist;
    console.error(`[-] purgeOldFiles: ${err.message}`, { err });
  }
  return flist;
}
// ==============================================
async function removeEmptyFolder(folder, sub) {
  const newRoot = path.join(folder, sub);
  try {
    const list = await fs.readdir(newRoot);
    if (list.length !== 0) return null;

    // console.debug(`[+] delete folder ${sub}`, { ms: false });
    await fs.rmdir(newRoot);
  }
  catch (err) {
    console.error(`[-] ${err.message}`, { err });
    return null;
  }
  return sub;
}

module.exports.purgeOldFiles = removeOldFiles;
