const validator = require('validator');

// ==============================================
function val(x, def) {
  let res = x;
  if (typeof x === 'string') res = res.trim();

  if (typeof x === 'string' && x.trim().toLowerCase() === 'true') res = true;
  if (typeof x === 'string' && x.trim().toLowerCase() === 'false') res = false;
  if (typeof x === 'string' && x.trim().toLowerCase() === 'null') res = null;
  // if (typeof x === 'string' && x.trim() === '') res = null;

  // is number?
  // if (parseFloat(x).toString() === x) res = parseFloat(x);
  if (validator.isFloat(x)) res = parseFloat(x);

  if ((res === undefined || res === null) && def !== undefined) res = def;
  return res;
}

module.exports = val;
