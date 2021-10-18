const _ = require('lodash');
const dayjs = require('dayjs');
const validate = require('./validate');
const tools = require('./index');

const DEBUG = false;
const REG_FULL = /\{\?.*?(\{(\/.*?\/)?[a-z0-9[\]]+\.[a-zа-я_][a-zа-я0-9_.[\]]*?}.*?)+}/gsi;
const REG_MINI = /\{(\/.*?\/)?([a-z0-9[\]]+\.[a-zа-я_][a-zа-я0-9_.[\]]*?)\}/gi;
const REG_RAND = /\{rnd\.(\d+)\}/gi;
const REG_DIFF = /\{(\w+\.\w[^{}]*?)\.(after|before)\.(second|minute|hour|day|week|month|year)\}/gi;

// example:
// this user{?, who {user.age} years old,} can do some job
// this {? button {/do_(.+)/btn.text} action} is great

// ==============================================
function objectReplace(obj, somedata, options) {
  if (DEBUG) console.debug(`objectReplace ${somedata}`);

  if (somedata === undefined
    || somedata === null
    || typeof somedata === 'boolean') return somedata;

  // simple value
  if (typeof somedata !== 'object') {
    const res = stringReplace(obj, somedata, options);
    return res;
  }

  // first - change key NAMES
  Object.keys(somedata).forEach((key) => {
    const newkey = stringReplace(obj, key, options);
    if (newkey === key) return;

    somedata[newkey] = somedata[key];
    delete somedata[key];
  });

  // then change values
  Object.keys(somedata).forEach((key) => {

    // recursive
    somedata[key] = objectReplace(obj, somedata[key], options);
  });

  return somedata;
}

// ==============================================
function stringReplace(obj, string, _opt) {
  if (DEBUG) console.debug(`stringReplace ${string}`);

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
    empty: '',
    crlf: undefined,
    array: undefined,
    date: true,
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

  out = multiReplace(obj, out, opt);

  // and now - simple pathReplace
  [out] = pathReplace(obj, out, opt); // first element is a string
  out = out.replace(/ +/g, ' ');
  out = out.replace(/\n{3,}/gm, '\n\n');

  if (DEBUG) console.debug(`stringReplace res: ${out}`);
  return out;
}

// ==============================================
function multiReplace(object, strPath, opt) {
  if (DEBUG) console.debug(`multiReplace ${strPath}`);

  let res = strPath;

  res = dateDiffReplace(object, res, opt);
  res = randomReplace(res);

  if (DEBUG) console.debug(`multiReplace res: ${res}`);
  return res;
}

// ==============================================
function pathReplace(object, strPath, opt) {
  if (DEBUG) console.debug(`pathReplace '${strPath}'`);

  if (!strPath.match(REG_MINI)) return [strPath, false];
  // example: {/\d{3,}/msg.text}

  let res = strPath;
  let found = false;

  while (res.match(REG_MINI)) {

    // we need this because of 'res' change!
    const regexResult = REG_MINI.exec(res);

    if (DEBUG) console.debug(`regexResult ${tools.textify(regexResult)}`);

    const strfull = regexResult[0];
    const sregex = regexResult[1];
    const objpath = regexResult[2];

    // get value
    let replaceText = _.get(object, objpath);
    if (DEBUG) console.debug(`[ ] replaceText (before): '${typeof replaceText}' ${tools.textify(replaceText)}`);

    if (replaceText === '') replaceText = opt.empty;
    if (replaceText === null) replaceText = opt.null;
    if (replaceText === true) replaceText = opt.true;
    if (replaceText === false) replaceText = opt.false;
    if (replaceText === undefined) replaceText = opt.undefined;
    if (typeof replaceText === 'string' && opt.crlf !== undefined) {
      replaceText = replaceText.replace(/\n/g, opt.crlf);
    }
    // of this is an array of simple items, not array of objects
    if (Array.isArray(replaceText) && opt.array && typeof replaceText[0] !== 'object') {
      replaceText = replaceText.filter(Boolean).join(opt.array);
    }
    if (typeof replaceText === 'object') replaceText = tools.textify(replaceText);

    if (DEBUG) console.debug(`[ ] replaceText (after): '${typeof replaceText}' ${replaceText}`);

    // if (opt.str && replaceText === null) replaceText = 'null';
    // replaceText = replaceText.toString().trim();

    // if we have sub-regex, apply it
    if (typeof replaceText === 'string' && sregex) {
      try {
        const subRegex = new RegExp(sregex.slice(1, -1), 'i');
        const subResult = replaceText.match(subRegex);
        if (subResult && subResult[1]) replaceText = subResult[1];
      }
      catch (e) {
        console.error(`[-] tools.pathreplace: ${e.message}`);
        console.log(sregex.slice(1, -1));
      }
    }

    if (validate.isDateTime(replaceText) && opt.date) replaceText = dayjs(replaceText).format('YYYY-MM-DD HH:mm:ss');

    if (replaceText !== '' && replaceText !== null) found = true;
    res = res.replace(strfull, replaceText);
    if (DEBUG) console.debug(`res: ${res}`);
  }

  if (DEBUG) console.debug(`finish pathReplace res: ${res}`);
  return [res, found];
}

// ==============================================
function randomReplace(strPath) {
  if (DEBUG) console.debug(`randomReplace ${strPath}`);

  if (!strPath.match(REG_RAND)) return strPath;

  let res = strPath;
  let regexResult;

  while ((regexResult = REG_RAND.exec(strPath)) !== null) {

    const strfull = regexResult[0];
    const snumber = regexResult[1];
    const inumber = parseInt(snumber) || 100;

    const rnd = Math.round(Math.random() * inumber);
    const srnd = rnd.toString().padStart(snumber.length, '0');

    res = res.replace(strfull, srnd);
  }

  if (DEBUG) console.debug(`randomReplace res: ${res}`);
  return res;
}

// ==============================================
function dateDiffReplace(obj, strPath, opt) {
  if (DEBUG) console.debug(`dateDiffReplace ${strPath}`);

  if (!strPath.match(REG_DIFF)) return strPath;

  let res = strPath;
  let regexResult;

  while ((regexResult = REG_DIFF.exec(strPath)) !== null) {

    const strfull = regexResult[0];
    const objpath = regexResult[1];
    const afterbefore = regexResult[2];
    const interval = regexResult[3];

    const [objvalue] = pathReplace(obj, `{${objpath}}`, opt);

    let diff;
    if (dayjs(objvalue).isValid()) {

      const date2 = dayjs(objvalue);
      if (afterbefore === 'after') diff = dayjs().diff(date2, interval);
      if (afterbefore === 'before') diff = date2.diff(dayjs(), interval);
      if (DEBUG) console.log(`diff ${diff}`);
    }
    else {
      diff = null;
      if (DEBUG) console.log(`diff ${diff}`);
    }

    res = res.replace(strfull, diff);
  }

  if (DEBUG) console.debug(`dateDiffReplace res: ${res}`);
  return res;
}

module.exports = objectReplace;
