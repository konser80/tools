const _ = require('lodash');
const util = require('util');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
const validate = require('./validate');

// =============================================================
function textify(obj, _opt = {}) {
  let res = obj;

  const opt = { ...{
    colors: false,
    crlf: true,
    dateformat: 'YYYY-MM-DD HH:mm:ss',
    tz: undefined
  },
  ..._opt };

  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') return obj.toString();
  // if (typeof obj !== 'object') return res;

  // date?
  if (typeof obj === 'object' && isDate(obj)) {
    return dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
  }

  if (typeof res === 'string' && validate.isDateTime(res) && _opt.dateformat) {
    try {
      // if (DEBUG) console.debug(`z2.1: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
      res = (opt.tz)
        ? dayjs(res).tz(opt.tz).format(opt.dateformat)
        : dayjs(res).format(opt.dateformat);
      // replaceText = dayjs(replaceText).tz(opt.tz).format(opt.dateformat);
      // if (DEBUG) console.debug(`z2.2: ${Number(process.hrtime.bigint() - t1)/1000} mcs`);
    }
    catch (e) {
      console.error(`[-] ${e.message}`);
      res = dayjs(res).tz().format('YYYY-MM-DD HH:mm:ss');
    }
  }

  // limit chars
  if (typeof res === 'string' && (opt.limit) && res.length > opt.limit) {
    res = res.slice(0, opt.limit);
    res += '...';
  }

  // some other object?
  if (typeof obj !== 'string') {
    const params = {
      colors: opt.colors,
      depth: null,
      showHidden: false
    };
    res = util.inspect(obj, params);
    if (opt.crlf === false) {
      res = res.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
    }
    res = truncateColoredString(res, opt.limit);
  }

  return res;
}

// =============================================================
function isDate(date) {
  const res = date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date);
  return res;
}

// ==============================================
function getType(src) {

  let res = typeof src;


  if (res === 'string') {
    res = `string (${src.length} chars)`;
    return res;
  }

  if (src === null) {
    res = 'object (null)';
    return res;
  }

  // object
  if (res === 'object' && !Array.isArray(src)) {
    res = `object (${Object.keys(src).length} keys)`;
    return res;
  }

  // arrays
  if (Array.isArray(src)) {
    if (src.length === 0) {
      res = 'array (0 items)';
      return res;
    }

    const types = [];
    for (let i = 0; i < src.length; i += 1) {
      types.push(typeof src[i]);
    }

    res = `array (${src.length} items of ${_.uniq(types)})`;
    // res = `array of ${typeof src[0]} (${src.length} items)`;
    return res;
  }

  return res;
}

// ==============================================
function truncateColoredString(inputString, maxLength) {
  if (!maxLength) return inputString;
  if (inputString.length <= maxLength) return inputString;
  if (stripAnsi(inputString).length <= maxLength) return inputString;

  let nonAnsiCharCount = 0;
  let truncatedString = '';
  let ansiCodeBuffer = '';

  for (let i = 0; i < inputString.length; i += 1) {
    const char = inputString.charAt(i);
    const charCode = inputString.charCodeAt(i);

    // start of ANSI-sequence found
    if (charCode === 27) {
      ansiCodeBuffer = char;
      i += 1;

      while (i < inputString.length) {
        const nextChar = inputString.charAt(i);
        // const nextCharCode = inputString.charCodeAt(i);

        ansiCodeBuffer += nextChar;
        i += 1;

        // end of ANSI-sequence found
        if ((nextChar >= 'A' && nextChar <= 'Z') || (nextChar >= 'a' && nextChar <= 'z')) {
          truncatedString += ansiCodeBuffer;
          i -= 1;
          break;
        }
      }
    }
    else {
      nonAnsiCharCount += 1;
      truncatedString += char;

      if (nonAnsiCharCount >= maxLength) break;
    }
  }

  return `${truncatedString}...`;
}

// ==============================================
function stripAnsi(string) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
  ].join('|');

  const regex = new RegExp(pattern, 'g');

  return string.replace(regex, '');
}

module.exports.typeof = getType;
module.exports.textify = textify;
