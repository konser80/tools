const _ = require('lodash');
const dayjs = require('dayjs');
const validate = require('./validate');

const REG_FULL = /\{\?.*?(\{(\/.*?\/)?\w+\.[a-z0-9_.[\]]*?}).*?}/gi;
const REG_MINI = /\{(\/.*?\/)?(\w+\.\w.*?)\}/gi;

// example:
// this user{?, who {user.age} years old,} can do some job
// this {? button {/do_(.+)/btn.text} action} is great

// ==============================================
function objectReplace(obj, string, opt = { keep: false }) {
  if (!string) return string;
  if (typeof string !== 'string') return string;

  let out = string;
  let reg;

  // smart replace
  while ((reg = REG_FULL.exec(string)) !== null) {

    // console.debug(`LOOP. out = ${out}`);
    // console.debug(reg);
    // [0] full string
    // [1] sub-path in {}
    // [2] sub-regex - if any

    const subres = pathReplace(obj, reg[1], opt);

    // if replace result is empty - replace FULL string
    if (subres === '') {
      out = out.replace(reg[0], '');
    }
    else {
      // remove "{?" and "}"
      let newline = reg[0].slice(2, -1);
      // apply replace
      newline = newline.replace(reg[1], subres);
      out = out.replace(reg[0], newline);
    }
  }

  // and now - simple pathReplace
  out = pathReplace(obj, out, opt);

  // double lines & spaces
  out = out.replace(/ +/g, ' ');
  out = out.replace(/\n{3,}/gm, '\n\n');

  return out;
}

// ==============================================
function pathReplace(object, strPath, opt) {
  // opt:keep means keep notfound unchanged

  // const regex = /{(.+?)}/gi;
  if (!strPath.match(REG_MINI)) return strPath;
  // example: {/\d{3,}/msg.text}

  const na = 'undefined';
  let res = strPath;
  let regexResult;

  while ((regexResult = REG_MINI.exec(strPath)) !== null) {
    const strfull = regexResult[0];
    const sregex = regexResult[1];
    const objpath = regexResult[2];

    // get value
    let replaceText = _.get(object, objpath, na);
    if (replaceText === null) replaceText = 'null';
    replaceText = replaceText.toString().trim();

    // if we have sub-regex, apply it
    if (sregex) {
      const subRegex = new RegExp(sregex.slice(1, -1));
      const subResult = replaceText.match(subRegex);
      if (subResult && subResult[1]) replaceText = subResult[1];
    }

    if (typeof replaceText === 'string' && validate.isDateTime(replaceText)) replaceText = dayjs(replaceText).format('YYYY-MM-DD HH:mm:ss');

    if (replaceText !== na) res = res.replace(strfull, replaceText);
    if (replaceText === na && !opt.keep) res = res.replace(strfull, '');
  }
  return res;
}

module.exports = objectReplace;
