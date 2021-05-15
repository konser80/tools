global.dayjs = require('dayjs');
global.colors = require('colors');
const util = require('util');

var pre = null;

// console.log("\033[0m\n");


// =============================================================
const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
consoleMethods.forEach(function(name) {
  // debug is not a native method
  const fn = (name === 'debug') ? console.log : console[name];

  console[name] = function() {
    const toLog = {};
    const now = dayjs();

    // show timestamp
    toLog.timestamp = now.format('YYYY-MM-DD HH:mm:ss.SSS');
    toLog.timestamp = `[${toLog.timestamp}] `.grey;
    // if (!showtime) toLog.timestamp = '';
    if (arguments[1] && arguments[1].time === false) toLog.timestamp = '';

    toLog.level = (name === 'error') ? '[ERROR]'.bgRed + ' ' : '';
    toLog.message = textify(arguments[0], true);

    toLog.callsite = '';

    if (name === 'error' || arguments[0] instanceof Error)
    {
      toLog.callsite = '001';
      if (arguments[0].stack) arguments[0] = arguments[0].stack;
      const call = stack()[1];
      if (call) {
        const file = call.getFileName().replace(`${process.cwd()}/`, '');
        toLog.callsite = `(${file}:${call.getLineNumber()})`.grey;
      }
    }

    // console.debug can show time difference between calls
    if (name === 'debug') {
      let sdiff = '';

      // fn(arguments[1]);
      // if (arguments[1]) fn(arguments[1].ms);
      // fn(pre);

      // calculate time difference
      if ((!arguments[1] || (arguments[1] && arguments[1].ms !== false)) && pre !== null) {
      // if (showms & pre !== null) {
        const diff = now.diff(pre);

        if (diff < 1000) {
            sdiff = ' +' + diff + 'ms';
        } else if (diff < 60000) {
            sdiff = ' +' + (diff/1000).toFixed(1) +'s';
        } else {
            sdiff = ' +' + (diff/60000).toFixed(1) +'m';
        }
        sdiff = sdiff.green;
      }
      pre = now;

      if (typeof arguments[0] !== 'object') toLog.message = toLog.message.toString().grey + sdiff;
    }

    // if empty args - don't write anyting
    // if (typeof(arguments[0]) == 'string' && (arguments[0] == '' || arguments[0] == '\n')) {
    //   toLog.timestamp = '';
    //   // fn();
    //   // return;
    // }
    fn(`${toLog.timestamp}${toLog.callsite}${toLog.level}${toLog.message}`);
  }
});

// =============================================================
function textify(obj, colors) {
  let res = obj;

  if (obj === undefined) res = 'undefined';
  if (obj === null) res = 'null';

  if (isDate(obj)) {
    res = new dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
  }
  else if (typeof obj === 'object') {
    res = util.inspect(obj, {colors: colors, depth: null, showHidden: false});
    if (res.indexOf('\n') !== -1) res = '\n' + res;
  }
  return res;
}

// =============================================================
function isDate(date) {
  return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
}

// =============================================================
function stack() {
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  var err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};


// =============================================================
function combine(_new_obj) {
  let res = [];

  let key = getFirstArrayKey(_new_obj);
  if (!key) return [_new_obj];

  // key is an array?
  if (Array.isArray(_new_obj[key])) {
    _new_obj[key].forEach((item, i) => {

      // create copy of object
      let obj = Object.assign({}, _new_obj);
      obj[key] = item;

      res = res.concat(combine(obj));
      // return res;
    });
  }; // if array

  // if pseudo-array
  let o = _new_obj[key];
  if (o.from !== undefined && o.to !== undefined) {

    let _from = o.from;
    if (typeof(_from) == 'string') _from = _new_obj[_from];
    if (o.add) _from = _from + o.add;
    if (o.mult) _from = _from * o.mult;

    let _to = o.to;
    if (typeof(_to) == 'string') _from = _new_obj[_to];
    if (o.mult) _to = _to * o.mult;

    let _step = o.step || 1;
    if (typeof(_step) == 'string') _step = _new_obj[_step];
    if (o.mult) _step = _step * o.mult;

    for (let i = _from; i <= _to;  i+= _step || 1) {
      // create copy of object
      let obj = Object.assign({}, _new_obj);
      obj[key] = Number(i.toFixed(8));
      res = res.concat(combine(obj));
    };
  }; // pseudo array

  return res;

  function getFirstArrayKey(obj) {
    for (let i=0; i < Object.keys(obj).length; i++) {
      const key = Object.keys(obj)[i];
      if (obj[key] === null) continue;

      if (Array.isArray(obj[key])
        || (obj[key].from !== undefined && obj[key].to !== undefined)) return key;
      }
    return false;
  }
} // fn



module.exports.textify = textify;
module.exports.combine = combine;
module.exports.isDate = isDate;
