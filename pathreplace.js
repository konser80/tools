const _ = require('lodash');
const uuid = require('uuid');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

const validate = require('./validate');
const tools = require('./index');

const DEBUG = false;

const REG_MINI = /\{(?<bool>!{0,2})(?<sub>\/.*?\/)?(?<main>[a-zа-я_][a-zа-я0-9:_\-.[\]]*?)\}/gi;
// const REG_MINI = /\{(\/.*?\/)?([a-zа-я_][a-zа-я0-9:_\-.[\]]*?)\}/gi;
const REG_FULL = /\{\?.*?(\{(\/.*?\/)?[a-z0-9_[\]]+\.?[a-zа-я_][a-zа-я0-9_.[\]]*?}.*?)+}/gsi;
const REG_RAND = /\{rnd\.(\d+)\}/gi;
const REGEX_ASNUMBER = /\{([a-zа-я0-9_.[\]{}]+)\.asnumber}/gi;
const REG_DIFF = /\{(?<pre>\/.*?\/)?(?<path>[a-zа-я0-9_.[\]{}]+)\.(?<ab>after|before)\.(?<tf>seconds?|minutes?|hours?|days?|weeks?|months?|years?|timeframes?|spell\.?(?<lang>[a-z]{2})?)\}/gi;
// const REG_DIFF = /\{([a-zа-я0-9_.[\]{}]+)\.(after|before)\.(seconds?|minutes?|hours?|days?|weeks?|months?|years?|timeframes?)\}/gi;
const REG_UUID = /\{uuid\.?(v\d)?}/gi;
const REGEX_TZ = /(\+\d{2}:\d{2}|Z)$/;
const REGEX_DIGITS = /^(\d+)$/;

// example:
// this user{?, who {user.age} years old,} can do some job
// this {? button {/do_(.+)/btn.text} action} is great

// ==============================================
function objectReplace(obj, somedata, options) {
  if (DEBUG) console.debug(`objectReplace "${somedata}"`);

  if (somedata === undefined
    || somedata === null
    || typeof somedata === 'boolean') return somedata;

  const opt = { ...{
    true: 'true',
    false: 'false',
    null: '',
    undefined: '',
    empty: '',
    escape: undefined,
    crlf: undefined,
    array: undefined,
    date: true,
    dateformat: 'YYYY-MM-DD HH:mm:ss',
    tz: undefined,
    random: false
  },
  ...options };

  if (DEBUG) console.debug(options);

  // simple value
  if (typeof somedata !== 'object') {
    if (DEBUG) console.debug('call smartReplace for Simple Value');
    let res = smartReplace(obj, somedata, opt);

    if (DEBUG) console.debug('call multiReplace for last time');
    res = multiReplace(obj, res, opt).str;

    if (DEBUG) console.debug('call randomTextReplace');
    res = randomTextReplace(obj, res, opt);

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

  // const REG_FULL = /\{\?.*?(\{(\/.*?\/)?[a-z0-9[\]]+\.?[a-zа-я_][a-zа-я0-9_.[\]]*?}.*?)+}/gsi;
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
  if (DEBUG) console.log(`call multiReplace '${strPath}'`);

  const res = { str: strPath, found: 0, replaced: 0 };
  let subres = {};


  let pathFound;
  do {
    // Шаг 1: Прогоняем dateDiffReplace, randomReplace, uuidReplace, asNumberReplace
    do {
      let subres;
      // dateDiffReplace
      subres = dateDiffReplace(object, res.str, opt);
      res.found += subres.found;
      res.replaced += subres.replaced;
      res.str = subres.str;
  
      // randomReplace
      subres = randomReplace(res.str);
      res.found += subres.found;
      res.replaced += subres.replaced;
      res.str = subres.str;
  
      // uuidReplace
      subres = uuidReplace(res.str);
      res.found += subres.found;
      res.replaced += subres.replaced;
      res.str = subres.str;
  
      // asNumberReplace
      subres = asNumberReplace(object, res.str, opt);
      res.found += subres.found;
      res.replaced += subres.replaced;
      res.str = subres.str;
    } while (subres.found > 0);
  
    // Шаг 2: pathReplace один раз
    const pathRes = pathReplace(object, res.str, opt);
    res.found += pathRes.found;
    res.replaced += pathRes.replaced;
    res.str = pathRes.str;
    pathFound = pathRes.found;
  
  } while (pathFound > 0); // Повторяем шаги 2-3, пока pathReplace возвращает найденные замены
  

  if (DEBUG) console.log(`...after multi-loop: ${tools.textify(res)}`);
  if (DEBUG) console.log(`...multiReplace found: ${res.found}`);

  // if (res.found > 0) subres = multiReplace(object, res.str, opt);
  // res.found += subres.found;
  // res.replaced += subres.replaced;
  res.str = cleanEmpties(res.str);
  // res.str = cleanEmpties(subres.str);

  if (DEBUG) console.log(`multiReplace returning res: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function uuidReplace(strPath) {
  if (DEBUG) console.debug(`try uuidReplace ${strPath}`);

  const res = { str: strPath, found: 0, replaced: 0 };
  REG_UUID.lastIndex = 0;
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
  REG_RAND.lastIndex = 0; // because of index pointer
  const regexResult = REG_RAND.exec(strPath);
  // console.debug(regexResult);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`randomReplace ${strPath}`);

  const strfull = regexResult[0];
  const snumber = regexResult[1];
  const inumber = parseInt(snumber) || 0;

  const rnd = Math.round(Math.random() * inumber);
  const srnd = rnd.toString().padStart(snumber.length, '0');

  res.str = strPath.replace(strfull, srnd);
  if (srnd !== '') res.replaced = 1;

  if (DEBUG) console.debug(`randomReplace str: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function asNumberReplace(obj, strPath, opt) {
  if (DEBUG) console.debug(`try asNumberReplace '${strPath}'`);
  const res = { str: strPath, found: 0, replaced: 0 };

  REGEX_ASNUMBER.lastIndex = 0;
  const regexResult = REGEX_ASNUMBER.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`asNumberReplace '${strPath}'`);
  if (DEBUG) console.debug(regexResult);

  const objpath = regexResult[0];
  const snumber = regexResult[1];

  if (DEBUG) console.debug(`call pathReplace from asNumberReplace with '{${snumber}}'`);
  const result = { str: `{${snumber}}`, found: 0, replaced: 0 };
  let subres = {};
  do {
    // replace datetime to universal format without timezone - do not use opt so
    subres = pathReplace(obj, result.str, { tz: opt.tz }); // do NOT use opt because of dateformat

    result.found += subres.found;
    result.replaced += subres.replaced;
    result.str = subres.str;
  } while (subres.found > 0);

  const { str } = result;
  if (DEBUG) console.debug(`=> return from pathReplace is '${str}'`);

  if (str === 'undefined') {
    if (DEBUG) console.debug(`undefined, returning empty`);
    res.str = strPath.replace(objpath, '');
    return res;
  }

  let value = parseFloat(str);
  if (!isNaN(value)) {
    value = value.toLocaleString('en-US');

    if (DEBUG) console.debug(`parsed, replacing '${objpath}' to '${value}'`);
    res.str = strPath.replace(objpath, value);
    res.replaced = 1;
  }
  else {
    if (DEBUG) console.debug(`not parsed, returned as is: '${str}'`);
    res.str = strPath.replace(objpath, str);
  }

  return res;
}

// ==============================================
function dateDiffReplace(obj, strPath, opt) {
  if (DEBUG) console.debug(`try dateDiffReplace '${strPath}'`);

  const res = { str: strPath, found: 0, replaced: 0 };

  // const REG_DIFF = /\{(\w+\.\w[^{}]*?)\.(after|before)\.(second|minute|hour|day|week|month|year)\}/gi;
  REG_DIFF.lastIndex = 0;
  const regexResult = REG_DIFF.exec(strPath);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.debug(`dateDiffReplace '${strPath}'`);
  if (DEBUG) console.debug(regexResult.groups);

  const strfull = regexResult[0];
  const objpath = regexResult.groups.path;
  // const objpath = regexResult[1];
  const afterbefore = regexResult.groups.ab;
  // const afterbefore = regexResult[2];
  let interval = regexResult.groups.tf.replace(/s$/, ''); // remove last 's'
  // let interval = regexResult[3].replace(/s$/, ''); // remove last 's'

  let timeframe = false;
  if (interval === 'timeframe') {
    interval = 'second';
    timeframe = true;
  }
  let spell = false;
  if (interval.startsWith('spell')) {
    interval = 'second';
    spell = true;
  }

  if (DEBUG) console.debug(`call pathReplace from Diff with '{${objpath}}'`);
  // we need this because of {user.products.{invoice.name}.start.before.minute}
  const result = { str: `{${objpath}}`, found: 0, replaced: 0 };
  let subres = {};
  do {
    // replace datetime to universal format without timezone - do not use opt so
    subres = pathReplace(obj, result.str, { tz: opt.tz }); // do NOT use opt because of dateformat

    result.found += subres.found;
    result.replaced += subres.replaced;
    result.str = subres.str;
  } while (subres.found > 0);

  const { str } = result;
  if (DEBUG) console.debug(`=> from pathReplace is '${str}'`);

  let diff;
  if (dayjs(str).isValid()) {
    if (DEBUG) console.log(`using tz: ${opt.tz}`);

    // if our string contains tz like +03:00 or ...000Z, so do not apply TZ parsing
    let date2;
    // const REGEX_TZ = /(\+\d{2}:\d{2}|Z)$/;
    if (str.match(REGEX_DIGITS)) {
      date2 = dayjs(parseInt(str));
      if (DEBUG) console.log(`parsing by timestamp: ${date2}`);
    }
    else if (str.match(REGEX_TZ) || !opt.tz) {
      date2 = dayjs(str);
      if (DEBUG) console.log(`parsing without tz: ${date2}`);
    }
    else {
      date2 = dayjs.tz(str, opt.tz);
      if (DEBUG) console.log(`parsing with tz: ${date2}`);
    }

    if (DEBUG) console.log(date2.toString());
    // if (DEBUG) console.log(dayjs());

    if (afterbefore === 'after') diff = (opt.tz) ? dayjs().tz(opt.tz).diff(date2, interval) : dayjs().diff(date2, interval);
    if (afterbefore === 'before') diff = (opt.tz) ? date2.tz(opt.tz).diff(dayjs(), interval) : date2.diff(dayjs(), interval);

    if (timeframe) diff = tools.timetotf2(diff * 1000);
    if (spell) diff = doSpell(diff, regexResult.groups.lang);

    // apply pre-regex
    diff = applySubRegex(diff, regexResult.groups.pre);

    if (DEBUG) console.log(`diff ${diff}`);
  }
  else {
    diff = '';
    if (DEBUG) console.log(`diff ${diff}`);
  }

  res.str = strPath.replace(strfull, diff);
  if (diff !== '') res.replaced = 1;

  if (DEBUG) console.debug(`dateDiffReplace str: '${tools.textify(res)}'`);
  return res;
}
// ==============================================
function pathReplace(object, strPath, opt) {
  if (DEBUG) console.debug(`try pathReplace '${strPath}' with opt ${JSON.stringify(opt)}`);

  const res = { str: strPath, found: 0, replaced: 0 };
  REG_MINI.lastIndex = 0;

  const regexResult = REG_MINI.exec(strPath);
  if (DEBUG) console.debug('regexResult', regexResult);
  if (!regexResult) return res;

  res.found = 1;
  if (DEBUG) console.log(`pathReplace ${tools.textify(regexResult)}`);

  const strfull = regexResult[0];
  const subRegex = regexResult.groups.sub;
  const objpath = regexResult.groups.main;
  const truefalse = regexResult.groups.bool;
  regexResult.lastIndex = 0;

  // get value
  let replaceText = _.get(object, objpath); // INCORRECT!!!
  if (DEBUG) console.debug(`[ ] replaceText (before): '${typeof replaceText}' ${tools.textify(replaceText)}`);

  // replaceText could be ANY type

  // if we have true-false flag
  if (truefalse) replaceText = filterTrueFalse(truefalse, replaceText, opt);

  if (replaceText === '') replaceText = opt.empty;
  if (replaceText === null) replaceText = opt.null;
  if (replaceText === true) replaceText = opt.true;
  if (replaceText === false) replaceText = opt.false;
  if (replaceText === undefined) {
    replaceText = (_.endsWith(objpath, '.length')) ? 0 : opt.undefined;
  }
  if (Array.isArray(replaceText) && opt.array && typeof replaceText[0] !== 'object') {
    replaceText = replaceText.filter(Boolean).join(opt.array);
  }
  // if (typeof replaceText === 'object') replaceText = tools.textify(replaceText, { crlf: false }); // WHY no crlf?
  if (typeof replaceText === 'object') replaceText = tools.textify(replaceText); // WHY no crlf?


  if (typeof replaceText === 'string' && opt.crlf !== undefined) {
    replaceText = replaceText.replace(/\n/g, opt.crlf);
    if (DEBUG) console.debug(`[ ] opt.crlf replace, result:`);
    if (DEBUG) console.debug(replaceText);
  }

  // if (DEBUG) console.debug(`z2: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
  // if (dayjs(replaceText).isValid() && opt.date) { // do NOT use dayjs validation - check JEST
  if (validate.isDateTime(replaceText) && opt.date) {
    try {
      // if (DEBUG) console.debug(`z2.1: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
      replaceText = (opt.tz)
        ? dayjs(replaceText).tz(opt.tz).format(opt.dateformat)
        : dayjs(replaceText).format(opt.dateformat);
      // replaceText = dayjs(replaceText).tz(opt.tz).format(opt.dateformat);
      // if (DEBUG) console.debug(`z2.2: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
    }
    catch (e) {
      console.error(`[-] ${e.message}`);
      replaceText = dayjs(replaceText).tz().format('YYYY-MM-DD HH:mm:ss');
    }
  }

  // if (DEBUG) console.debug(`z3: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
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

  // if (DEBUG) console.debug(`z4: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
  // if this is an array of simple items, not array of objects

  // fix $& behavior
  // if (DEBUG) console.debug(`z5: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
  if (typeof replaceText === 'string' && replaceText.includes('$')) replaceText = replaceText.replace(/\$/g, '$$$$');

  // if (DEBUG) console.debug(`z6: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
  if (DEBUG) console.debug(`[ ] replaceText (after): '${typeof replaceText}' ${replaceText}`);

  // if (opt.str && replaceText === null) replaceText = 'null';
  // replaceText = replaceText.toString().trim();

  // if we have sub-regex, apply it
  replaceText = applySubRegex(replaceText, subRegex);

  // if we have true-false flag
  // replaceText = filterTrueFalse(truefalse, replaceText, opt);

  res.str = strPath.replace(strfull, replaceText);
  if (replaceText !== '' && replaceText !== null) res.replaced = 1;

  if (DEBUG) console.debug(`pathReplace res: ${tools.textify(res)}`);
  return res;
}
// ==============================================
function cleanEmpties(strPath) {
  if (!strPath || typeof strPath !== 'string') return strPath;
  let out = strPath;
  // out = out.replace(/ +/g, ' '); // I need double spaces for <code> identation
  out = out.replace(/\n{3,}/gm, '\n\n');
  // out = out.trim(); // NEVER do trim
  return out;
}
// ==============================================
function filterTrueFalse(filter, input, opt) {
  let res = input;

  if (filter === '!') {
    res = (!input) ? opt.true : opt.false;
    if (DEBUG) console.debug(`[ ] ...apply true-false (${filter}) filter: ${res}`);
  }
  else if (filter === '!!') {
    res = (input) ? opt.true : opt.false;
    if (DEBUG) console.debug(`[ ] ...apply true-false (${filter}) filter: ${res}`);
  }
  return res;
}

// ==============================================
function applySubRegex(inputString, subregex) {

  // no subregex? return original string
  if (!subregex) return inputString;

  let result = inputString;
  if (typeof result === 'string' && subregex) {
    if (DEBUG) console.log(`applySubRegex ${subregex} to ${inputString}`);
    try {
      const subRegex = new RegExp(subregex.slice(1, -1), 'si');
      const subResult = result.match(subRegex);

      // in case we have subregex, but not match - we replace with ''
      if (!subResult) result = '';
      if (subResult && subResult[1]) result = subResult[1].trim();
    }
    catch (e) {
      if (DEBUG) console.error(`[-] tools.pathreplace: ${e.message}`);
      if (DEBUG) console.log(subregex.slice(1, -1));
    }
    if (DEBUG) console.log(`...subregex: ${result}`);
  }
  return result;
}

// ==============================================
function randomTextReplace(obj, str, opt) {
  if (!opt.random) {
    if (DEBUG) console.debug(`try opt.random is not true, return '${str}'`);
    return str;
  }

  if (DEBUG) console.debug(`try randomTextReplace '${str}'`);

  const res = tools.randomtext(str);
  if (DEBUG) console.debug(`return '${res}'`);
  return res;
}

// ==============================================
function doSpell(timeDifference, _lang = 'ru') {
  const lang = (_lang === 'ru') ? 'ru' : 'en';
  if (DEBUG) console.debug(`doSpell timeDifference ${timeDifference}`);

  const years = Math.floor(timeDifference / (60 * 60 * 24 * 365));
  const months = Math.floor(timeDifference / (60 * 60 * 24 * 30));
  const days = Math.floor(timeDifference / (60 * 60 * 24));
  const hours = Math.floor((timeDifference % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((timeDifference % (60 * 60)) / (60));
  const seconds = Math.floor(timeDifference);

  if (DEBUG) console.debug(`doSpell ${years} years, ${months} months, ${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`);

  if (years > 0) return `${years} ${spellTimeframe(years, 'y', lang)}`;
  if (months > 0) return `${months} ${spellTimeframe(months, 'M', lang)}`;
  if (days > 0) return `${days} ${spellTimeframe(days, 'd', lang)}`;
  if (hours > 0) return `${hours} ${spellTimeframe(hours, 'h', lang)}`;
  if (minutes > 0) return `${minutes} ${spellTimeframe(minutes, 'm', lang)}`;
  if (seconds >= 0) return `${seconds} ${spellTimeframe(seconds, 's', lang)}`;

  return `${0} ${spellTimeframe(0, 'm', 'ru')}`;
}
// ==============================
function spellTimeframe(num, char, lang) {
  if (DEBUG) console.debug(`spellTimeframe ${num} ${char} ${lang}`);

  const p = {
    ru: {
      s: { one: 'секунда', elv: 'секунд', two: 'секунды' },
      m: { one: 'минута', elv: 'минут', two: 'минуты' },
      h: { one: 'час', elv: 'часов', two: 'часа' },
      d: { one: 'день', elv: 'дней', two: 'дня' },
      M: { one: 'месяц', elv: 'месяцев', two: 'месяца' },
      y: { one: 'год', elv: 'лет', two: 'года' }
    },
    en: {
      s: { one: 'second', elv: 'seconds', two: 'seconds' },
      m: { one: 'minute', elv: 'minutes', two: 'minutes' },
      h: { one: 'hour', elv: 'hours', two: 'hours' },
      d: { one: 'day', elv: 'days', two: 'days' },
      M: { one: 'month', elv: 'months', two: 'months' },
      y: { one: 'year', elv: 'years', two: 'years' }
    }
  };

  if (num >= 10 && num <= 20) return p[lang][char].elv;
  if (num % 10 === 1) return p[lang][char].one;
  if (num % 10 >= 2 && num % 10 <= 4) return p[lang][char].two;
  return p[lang][char].elv;
}


module.exports = objectReplace;
