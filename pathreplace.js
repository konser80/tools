const _ = require('lodash');
const uuid = require('uuid');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const validate = require('./validate');
const tools = require('./index');

const DEBUG = false;
// we can't use global regex because of a lastIndex pointer =(
// const REG_FULL = /\{\?.*?(\{(\/.*?\/)?[a-z0-9[\]]+\.?[a-zа-я_][a-zа-я0-9_.[\]]*?}.*?)+}/gsi;
// const REG_MINI = /\{(\/.*?\/)?([a-z0-9[\]]+\.?[a-zа-я_][a-zа-я0-9:_.[\]]*?)\}/gi;
// const REG_RAND = /\{rnd\.(\d+)\}/gi;
// const REG_DIFF = /\{(\w+\.\w[^{}]*?)\.(after|before)\.(second|minute|hour|day|week|month|year)\}/gi;

// example:
// this user{?, who {user.age} years old,} can do some job
// this {? button {/do_(.+)/btn.text} action} is great

// ==============================================
function objectReplace(obj, somedata, options) {
  if (DEBUG) console.debug(`objectReplace ${somedata}`);

  if (somedata === undefined
    || somedata === null
    || typeof somedata === 'boolean') return somedata;

  const opt = { ...{
    true: 'true',
    false: 'false',
    null: 'null',
    undefined: '',
    empty: '',
    escape: undefined,
    crlf: undefined,
    array: undefined,
    date: true,
    dateformat: 'YYYY-MM-DD HH:mm:ss',
    tz: undefined,
  },
  ...options };

  // if (DEBUG) console.debug(options);

  // simple value
  if (typeof somedata !== 'object') {
    if (DEBUG) console.debug('call smartReplace for Simple Value');
    let res = smartReplace(obj, somedata, opt);

    if (DEBUG) console.debug('call multiReplace for last time');
    res = multiReplace(obj, res, opt).str;

    return res;
  }

  // first - change key NAMES
  Object.keys(somedata).forEach((key) => {
    if (DEBUG) console.debug('call smartReplace for keyName');
    const newkey = smartReplace(obj, key, opt);
    if (newkey === key) return;

    somedata[newkey] = somedata[key];
    delete somedata[key];
  });

  // then change values
  Object.keys(somedata).forEach((key) => {

    // recursive
    somedata[key] = objectReplace(obj, somedata[key], opt);
  });

  return somedata;
}

// ==============================================
function smartReplace(obj, strPath, opt) {
  if (DEBUG) console.debug(`try smartReplace '${strPath}'`);

  if (!strPath || typeof strPath !== 'string') return strPath;

  // user{? age {user.age} and name {user.name}},
  let out = strPath;

  const REG_FULL = /\{\?.*?(\{(\/.*?\/)?[a-z0-9[\]]+\.?[a-zа-я_][a-zа-я0-9_.[\]]*?}.*?)+}/gsi;
  const regexResult = REG_FULL.exec(strPath);
  if (regexResult) {
    // [0] full string
    // [1] sub-path in {}
    // [2] sub-regex - if any

    if (DEBUG) console.log(`smartReplace '${strPath}'`);

    // remove "{?" and "}"
    const subline = regexResult[0].slice(2, -1);
    if (DEBUG) console.debug(`call multiReplace with '${subline}'`);

    // we have to use FOUND var because of two and more paths in one string
    const res = multiReplace(obj, subline, opt);

    // if replace result is empty - replace FULL string
    if (res.replaced === 0) {
      if (DEBUG) console.debug(`smartReplace: not found, replacing '${regexResult[0]}' with empty`);
      out = out.replace(regexResult[0], '');
      if (DEBUG) console.debug(`smartReplace: out='${out}'`);
    }
    else {
      if (DEBUG) console.debug(`smartReplace: found = ${res.replaced}, replacing '${regexResult[0]}' with '${res.str}'`);
      // apply replace
      out = out.replace(regexResult[0], res.str);
      if (DEBUG) console.debug(`smartReplace: out='${out}'`);
    }

    // recursive
    if (out.match(REG_FULL)) {
      if (DEBUG) console.debug(`calling recursive smartReplace with ${out}'`);
      out = smartReplace(obj, out, opt);
    }
  }

  if (DEBUG) console.debug(`finally smartReplace res: ${out}`);
  return out;
}

// ==============================================
function multiReplace(object, strPath, opt) {
  if (DEBUG) console.log(`multiReplace '${strPath}'`);

  const res = { str: strPath, found: 0, replaced: 0 };
  let subres = {};

  do {
    subres = dateDiffReplace(object, res.str, opt);
    res.found += subres.found;
    res.replaced += subres.replaced;
    res.str = subres.str;
  } while (subres.found > 0);

  do {
    subres = randomReplace(res.str);
    res.found += subres.found;
    res.replaced += subres.replaced;
    res.str = subres.str;
  } while (subres.found > 0);

  do {
    subres = uuidReplace(res.str);
    res.found += subres.found;
    res.replaced += subres.replaced;
    res.str = subres.str;
  } while (subres.found > 0);

  do {
    subres = pathReplace(object, res.str, opt);
    res.found += subres.found;
    res.replaced += subres.replaced;
    res.str = subres.str;
  } while (subres.found > 0);

  if (DEBUG) console.log(`multiReplace found: ${res.found}`);

  if (res.found > 0) subres = multiReplace(object, res.str, opt);
  res.found += subres.found;
  res.replaced += subres.replaced;
  res.str = cleanEmpties(subres.str);

  if (DEBUG) console.log(`multiReplace returning res: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function uuidReplace(strPath) {
  if (DEBUG) console.debug(`try uuidReplace ${strPath}`);

  const res = { str: strPath, found: 0, replaced: 0 };
  const REG_UUID = /\{uuid\.?(v\d)?}/gi;
  const regexResult = REG_UUID.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`uuidReplace ${strPath}`);

  const strfull = regexResult[0];
  const ver = regexResult[1] || 'v4';

  const subres = uuid[ver]();
  res.str = strPath.replace(strfull, subres);
  if (subres !== '') res.replaced = 1;

  if (DEBUG) console.debug(`uuidReplace res: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function randomReplace(strPath) {
  if (DEBUG) console.debug(`try randomReplace ${strPath}`);

  const res = { str: strPath, found: 0, replaced: 0 };
  const REG_RAND = /\{rnd\.(\d+)\}/gi;
  const regexResult = REG_RAND.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`randomReplace ${strPath}`);

  const strfull = regexResult[0];
  const snumber = regexResult[1];
  const inumber = parseInt(snumber) || 100;

  const rnd = Math.round(Math.random() * inumber);
  const srnd = rnd.toString().padStart(snumber.length, '0');

  res.str = strPath.replace(strfull, srnd);
  if (srnd !== '') res.replaced = 1;

  if (DEBUG) console.debug(`randomReplace str: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function dateDiffReplace(obj, strPath, opt) {
  if (DEBUG) console.debug(`try dateDiffReplace '${strPath}'`);

  const res = { str: strPath, found: 0, replaced: 0 };
  const REG_DIFF = /\{([a-zа-я0-9_.[\]]+)\.(after|before)\.(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\}/gi;
  // const REG_DIFF = /\{(\w+\.\w[^{}]*?)\.(after|before)\.(second|minute|hour|day|week|month|year)\}/gi;
  const regexResult = REG_DIFF.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`dateDiffReplace '${strPath}'`);

  const strfull = regexResult[0];
  const objpath = regexResult[1];
  const afterbefore = regexResult[2];
  const interval = regexResult[3].replace(/s$/, ''); // remove last 's'

  const { str } = pathReplace(obj, `{${objpath}}`, opt);

  let diff;
  if (dayjs(str).isValid()) {

    if (DEBUG) console.log(`using tz: ${opt.tz}`);
    const date2 = dayjs.tz(str, opt.tz);
    if (afterbefore === 'after') diff = dayjs().tz(opt.tz).diff(date2, interval);
    if (afterbefore === 'before') diff = date2.tz(opt.tz).diff(dayjs(), interval);
    if (DEBUG) console.log(`diff ${diff}`);
  }
  else {
    diff = null;
    if (DEBUG) console.log(`diff ${diff}`);
  }

  res.str = strPath.replace(strfull, diff);
  if (diff !== '') res.replaced = 1;

  if (DEBUG) console.debug(`dateDiffReplace str: '${tools.textify(res)}'`);
  return res;
}
// ==============================================
function pathReplace(object, strPath, opt) {
  if (DEBUG) console.debug(`try pathReplace '${strPath}'`);

  const res = { str: strPath, found: 0, replaced: 0 };
  const REG_MINI = /\{(\/.*?\/)?([a-zа-я_][a-zа-я0-9:_.[\]]*?)\}/gi;
  // const REG_MINI = /\{(\/.*?\/)?([a-zа-я0-9_[\]]+\.?[a-zа-я_][a-zа-я0-9:_.[\]]*?)\}/gi;
  const regexResult = REG_MINI.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.log(`pathReplace ${tools.textify(regexResult)}`);

  const strfull = regexResult[0];
  const sregex = regexResult[1];
  const objpath = regexResult[2];
  regexResult.lastIndex = 0;

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

  if (validate.isDateTime(replaceText) && opt.date) {
    try {
      replaceText = dayjs(replaceText).tz(opt.tz).format(opt.dateformat);
    }
    catch (e) {
      console.error(`[-] ${e.message}`);
      replaceText = dayjs(replaceText).tz().format('YYYY-MM-DD HH:mm:ss');
    }
  }

  if (typeof replaceText === 'string' && opt.escape !== undefined && typeof opt.escape === 'string') {
    let newres = '';
    for (let i = 0; i < replaceText.length; i += 1) {
      // if (replaceText.charCodeAt(i) <= 126) newres += `\\${replaceText[i]}`;
      // if (replaceText.charCodeAt(i) > 126) newres += replaceText[i];
      if (opt.escape.indexOf(replaceText[i]) !== -1) {
        newres += `\\${replaceText[i]}`;
      }
      else {
        newres += replaceText[i];
      }
    }
    replaceText = newres;
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

      // in case we have subregex, but not match - we replace with ''
      if (!subResult) replaceText = '';
      if (subResult && subResult[1]) replaceText = subResult[1];
    }
    catch (e) {
      console.error(`[-] tools.pathreplace: ${e.message}`);
      console.log(sregex.slice(1, -1));
    }
  }

  res.str = strPath.replace(strfull, replaceText);
  if (replaceText !== '' && replaceText !== null) res.replaced = 1;

  if (DEBUG) console.debug(`pathReplace res: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function cleanEmpties(strPath) {
  if (!strPath || typeof strPath !== 'string') return strPath;
  let out = strPath;
  out = out.replace(/ +/g, ' ');
  out = out.replace(/\n{3,}/gm, '\n\n');
  return out;
}

module.exports = objectReplace;
