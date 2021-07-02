const _ = require('lodash');

// ==============================================
function pathReplace(object, strPath, opt = { keep: false }) {
  // opt:keep means keep notfound unchanged

  const na = 'undefinedString';
  const regex = /{(.+?)}/gi;
  let res = strPath;
  let regexResult;

  while ((regexResult = regex.exec(strPath)) !== null) {
    const replaceText = _.get(object, regexResult[1], na).toString();
    if (replaceText !== na) res = res.replace(regexResult[0], replaceText);
    if (replaceText === na && !opt.keep) res = res.replace(regexResult[0], '');
  }
  return res.replace(/ +/g, ' ');
}

module.exports = pathReplace;
