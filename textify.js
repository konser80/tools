const dayjs = require('dayjs');
const util = require('util');


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
  return res;
}

// =============================================================
function isDate(date) {
  const res = date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date);
  return res;
}


module.exports.textify = textify;
