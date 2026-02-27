const dayjs = require('dayjs');
const util = require('util');

const REGEX_DATETIME = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[ T]([01][0-9]|2[0-3]):[0-5][0-9]/;
const REGEX_ANSI = new RegExp(
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)' +
  '|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  'g'
);
const DEBUG = false;

const defaultOptions = {
  colors: false,
  crlf: true,
  dateformat: 'YYYY-MM-DD HH:mm:ss.SSS',
  tz: undefined,
  autosort: false,
  sort: false,
  skipunderscore: false
};

// =============================================================
function textify(obj, _opt = {}) {

  // primitives
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') return obj.toString();

  // options
  const opt = { ...defaultOptions, ..._opt };

  // date
  if (obj instanceof Date) {
    return opt.tz
      ? dayjs(obj).tz(opt.tz).format(opt.dateformat)
      : dayjs(obj).format(opt.dateformat);
  }

  // strings
  if (typeof obj === 'string') {

    // string date
    if (isStringDate(obj) && opt.dateformat) {
      try {
        obj = opt.tz
          ? dayjs(obj).tz(opt.tz).format(opt.dateformat)
          : dayjs(obj).format(opt.dateformat);
      }
      catch (e) {
        obj = dayjs(obj).tz().format('YYYY-MM-DD HH:mm:ss');
      }
    }

    // string any
    if (opt.limit && obj.length > opt.limit) {
      return `${obj.slice(0, opt.limit)}...`;
    }
    
    return obj;
  }

  // objects
  const params = {
    colors: opt.colors,
    depth: null,
    showHidden: false
  };

  let res;
  if (opt.autosort) {
    const sorted = smartSortObjectKeys(obj, opt);
    res = util.inspect(sorted, params);
  }
  else if (opt.sort) {
    const sorted = sortObjectKeys(obj);
    res = util.inspect(sorted, params);
  }
  else {
    res = util.inspect(obj, params);
  }

  if (!opt.crlf) {
    res = res.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
  }

  if (opt.limit) res = truncateColoredString(res, opt.limit);
  return res;
}

// =============================================================
function sortObjectKeys(obj) {
  if (DEBUG) console.log(`sortObjectKeys`);

  // Check if the input is not an object or is an array
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;

  // Get an array of keys and sort them alphabetically
  const sortedKeys = Object.keys(obj).sort();

  if (DEBUG) console.log(sortedKeys);

  // Create a new object with sorted keys
  const sortedObj = {};
  sortedKeys.forEach((key) => {
    sortedObj[key] = obj[key];
  });

  return sortedObj;
}

// =============================================================
function smartSortObjectKeys(obj, params = {}) {
  // Check if the input is not an object or is an array
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;

  // Separate keys into two arrays: one for primitive values and one for objects
  const primitiveKeys = [];
  const objectKeys = [];

  Object.keys(obj).forEach((key) => {
    if (params.skipunderscore && key.startsWith('_')) return;

    if (typeof obj[key] === 'object' && obj[key] !== null && !isDate(obj[key])) {
      objectKeys.push(key);
    }
    else {
      primitiveKeys.push(key);
    }
  });

  // Sort both arrays of keys alphabetically
  primitiveKeys.sort();

  // Sort object keys by the number of own keys they have, then alphabetically
  objectKeys.sort((a, b) => {
    const aLength = Object.keys(obj[a]).length;
    const bLength = Object.keys(obj[b]).length;
    if (aLength === bLength) {
      return a.localeCompare(b);
    }
    return aLength - bLength;
  });

  // Create a new object with sorted keys, primitive first, then objects
  const sortedObj = {};
  primitiveKeys.forEach((key) => {
    sortedObj[key] = obj[key];
  });
  objectKeys.forEach((key) => {
    sortedObj[key] = obj[key];
  });

  return sortedObj;
}

// =============================================================
function isDate(date) {
  return Boolean(date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date)); // eslint-disable-line
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

    res = `array (${src.length} items of ${[...new Set(types)]})`;
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
  return string.replace(REGEX_ANSI, '');
}

// ==============================================
function isStringDate(s) {
  const res = typeof s === 'string' &&
    s.length >= 10 &&
    s.length <= 25 &&
    REGEX_DATETIME.test(s);
  
  return res;
}

module.exports = {
  textify,
  typeof: getType
};
