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

  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'boolean') return obj.toString();
  if (typeof obj === 'number') return obj.toString();
  // if (typeof obj !== 'object') return res;

  // date?
  if (typeof obj === 'object' && isDate(obj)) {
    return dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
  }


  // some other object?
  if (typeof obj !== 'string') {
    res = util.inspect(obj, { colors: opt.colors, depth: null, showHidden: false });
    if (opt.crlf === false) {
      res = res.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
    }
  }

  // limit chars
  if ((opt.limit) && res.length > opt.limit) {
    res = res.slice(0, opt.limit);
    res += '...';
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
