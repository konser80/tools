const dayjs = require('dayjs');
const util = require('util');
const _ = require('lodash');

// =============================================================
function textify(obj, _opt) {
  let res = obj;

  const opt = { ...{
    colors: false,
    crlf: true
  },
  ..._opt };

  if (obj === undefined) res = 'undefined';
  if (obj === null) res = 'null';
  if (obj === true) res = 'true';
  if (obj === false) res = 'false';
  if (typeof obj !== 'object') return res;

  // date?
  if (isDate(obj)) {
    res = dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
    return res;
  }

  // some other object?
  res = util.inspect(obj, { colors: opt.colors, depth: null, showHidden: false });
  if (opt.crlf === false) {
    res = res.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
  }

  if (opt.limit) {
    res = res.slice(0, opt.limit);
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
  if (!Array.isArray(src)) return res;

  if (src.length === 0) {
    res = 'array (0 items)';
    return res;
  }

  const types = [];
  for (let i=0; i < src.length; i += 1) {
    types.push(typeof src[i]);
  }

  res = `array (${src.length} items of ${_.uniq(types)})`;
  // res = `array of ${typeof src[0]} (${src.length} items)`;
  return res;
}


module.exports.typeof = getType;
module.exports.textify = textify;
