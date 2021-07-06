const _ = require('lodash');
const dayjs = require('dayjs');
const validator = require('validator');

// ==============================================
function pathReplace(object, strPath, opt = { keep: false }) {
  if (!strPath) return strPath;
  if (typeof strPath !== 'string') return strPath;
  // opt:keep means keep notfound unchanged

  const regex = /{(.+?)}/gi;
  if (!strPath.match(regex)) return strPath;

  const na = 'undefinedString';
  let res = strPath;
  let regexResult;

  while ((regexResult = regex.exec(strPath)) !== null) {
    let replaceText = _.get(object, regexResult[1], na).toString();

    if (typeof replaceText === 'string' && validator.isISO8601(replaceText)) replaceText = dayjs(replaceText).format('YYYY-MM-DD HH:mm:ss');

    if (replaceText !== na) res = res.replace(regexResult[0], replaceText);
    if (replaceText === na && !opt.keep) res = res.replace(regexResult[0], '');
  }
  return res.replace(/ +/g, ' ');
}

module.exports = pathReplace;
