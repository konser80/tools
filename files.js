const fs = require('fs/promises'); // eslint-disable-line
const dayjs = require('dayjs');
const path = require('path');
const { tftotime } = require('./timeframes');


// ==============================================
async function removeOldFiles(folder, older) {
  if (!folder) return false;

  const now = dayjs().valueOf();
  const diff = tftotime(older || '30d');
  const earlier = now - diff;

  try {
    await fs.mkdir(folder, { recursive: true });
  }
  catch (e) {}

  const res = await removeRecursive(earlier, folder);
  return res;
}
// ==============================================
async function removeRecursive(earlier, folder, sub = '') {

  let flist = [];
  const newRoot = path.join(folder, sub);
  try {
    const list = await fs.readdir(newRoot);
    await list.forEachAsync(async (fname) => {
      const stat = await fs.stat(path.join(newRoot, fname));

      // this is a folder
      if (!stat.isFile()) {
        const newSub = `${sub}/${fname}`;
        const sublist = await removeRecursive(earlier, folder, newSub);
        flist = flist.concat(sublist);

        const remdir = await removeEmptyFolder(folder, newSub);
        if (remdir) flist.push(remdir);
        return true;
      }

      if (stat.mtimeMs > earlier) return false;

      console.debug(`[+] delete file ${sub}/${fname}`, { ms: false });
      await fs.unlink(path.join(newRoot, fname));
      flist.push(`${sub}/${fname}`);
    });
  }
  catch (err) {
    if (err.code === 'ENOENT') return true;
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

    console.debug(`[+] delete folder ${sub}`, { ms: false });
    await fs.rmdir(newRoot);
  }
  catch (err) {
    console.error(`[-] ${err.message}`, { err });
  }
  return sub;
}

module.exports.purgeOldFiles = removeOldFiles;
