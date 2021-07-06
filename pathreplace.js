const _ = require('lodash');
const dayjs = require('dayjs');
const validator = require('validator');

// ==============================================
function pathReplace(object, strPath, opt = { keep: false }) {
  if (!strPath) return strPath;
  if (typeof strPath !== 'string') return strPath;
  // opt:keep means keep notfound unchanged

  // const regex = /{(.+?)}/gi;
  const regex = /\{(\/.*?\/)?(\w+\.\w.*?)\}/gi;
  if (!strPath.match(regex)) return strPath;
  // example: {/\d{3,}/msg.text}

  const na = 'undefinedString';
  let res = strPath;
  let regexResult;

  while ((regexResult = regex.exec(strPath)) !== null) {
    const strfull = regexResult[0];
    const sregex = regexResult[1];
    const objpath = regexResult[2];

    // get value
    let replaceText = _.get(object, objpath, na).toString();

    // if we have sub-regex, apply it
    if (sregex) {
      const subRegex = new RegExp(sregex.slice(1, -1));
      const subResult = replaceText.match(subRegex);
      if (subResult && subResult[1]) replaceText = subResult[1];
    }

    if (typeof replaceText === 'string' && validator.isISO8601(replaceText)) replaceText = dayjs(replaceText).format('YYYY-MM-DD HH:mm:ss');

    if (replaceText !== na) res = res.replace(strfull, replaceText);
    if (replaceText === na && !opt.keep) res = res.replace(strfull, '');
  }
  return res.replace(/ +/g, ' ');
}

module.exports = pathReplace;
