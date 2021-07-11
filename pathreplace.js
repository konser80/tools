const _ = require('lodash');
const dayjs = require('dayjs');
const validate = require('./validate');

const REG_FULL = /\{\?.*?(\{(\/.*?\/)?\w+\.[a-z0-9_.[\]]*?}.*?)+}/gi;
const REG_MINI = /\{(\/.*?\/)?(\w+\.\w.*?)\}/gi;

// example:
// this user{?, who {user.age} years old,} can do some job
// this {? button {/do_(.+)/btn.text} action} is great

// ==============================================
function objectReplace(obj, string, _opt) {
  // str.true: null = 'null'
  // str.false: null = ''

  if (!string) return string;
  if (typeof string !== 'string') return string;

  let out = string;
  let reg;

  const opt = { ...{
    // str: false,
    true: 'true',
    false: 'false',
    null: 'null',
    undefined: '',
    empty: ''
  },
  ..._opt };

  // smart replace
  while ((reg = REG_FULL.exec(string)) !== null) {

    // console.log(`LOOP. out = ${out}`);
    // console.debug(reg);
    // [0] full string
    // [1] sub-path in {}
    // [2] sub-regex - if any

    // user{? age {user.age} and name {user.name}},

    // remove "{?" and "}"
    let newline = reg[0].slice(2, -1);
    // console.debug(`[+] newline "${newline}"`);

    // we have to use FOUND var because of two and more paths in one string
    const [subres, found] = pathReplace(obj, newline, opt);

    // console.debug(`subres: ${subres}, found: ${found}`);
    // if replace result is empty - replace FULL string
    if (!found) {
      out = out.replace(reg[0], '');
    }
    else {
      // apply replace
      newline = subres;
      out = out.replace(reg[0], newline);
    }
  }

  // and now - simple pathReplace
  [out] = pathReplace(obj, out, opt); // first element is a string
  out = out.replace(/ +/g, ' ');
  out = out.replace(/\n{3,}/gm, '\n\n');

  return out;
}

// ==============================================
function pathReplace(object, strPath, opt) {

  if (!strPath.match(REG_MINI)) return [strPath, false];
  // example: {/\d{3,}/msg.text}

  let res = strPath;
  let regexResult;
  let found = false;

  while ((regexResult = REG_MINI.exec(strPath)) !== null) {

    const strfull = regexResult[0];
    const sregex = regexResult[1];
    const objpath = regexResult[2];

    // get value
    let replaceText = _.get(object, objpath);
    if (replaceText === '') replaceText = opt.empty;
    if (replaceText === null) replaceText = opt.null;
    if (replaceText === true) replaceText = opt.true;
    if (replaceText === false) replaceText = opt.false;
    if (replaceText === undefined) replaceText = opt.undefined;
    // if (opt.str && replaceText === null) replaceText = 'null';
    // replaceText = replaceText.toString().trim();

    // if we have sub-regex, apply it
    if (typeof replaceText === 'string' && sregex) {
      const subRegex = new RegExp(sregex.slice(1, -1));
      const subResult = replaceText.match(subRegex);
      if (subResult && subResult[1]) replaceText = subResult[1];
    }

    if (validate.isDateTime(replaceText)) replaceText = dayjs(replaceText).format('YYYY-MM-DD HH:mm:ss');

    if (replaceText !== '' && replaceText !== null) found = true;
    res = res.replace(strfull, replaceText);
  }
  return [res, found];
}

module.exports = objectReplace;
