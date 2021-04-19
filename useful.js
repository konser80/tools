global.dayjs = require('dayjs');
global.colors = require('colors');
const util = require('util');

var debugmode = true;
var pre = null;

console.log("\033[0m\n");


const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
consoleMethods.forEach(function(name) {
  // debug is not a native method
  if (name === 'debug' && !debugmode) return;
  const fn = (name === 'debug') ? console.log : console[name];

  console[name] = function() {
    const toLog = {};
    const now = dayjs();
    toLog.timestamp = now.format('YYYY-MM-DD HH:mm:ss.SSS');
    toLog.timestamp = `[${toLog.timestamp}]`.grey;
    toLog.level = (name === 'error') ? '[ERROR]'.bgRed + ' ' : '';
    toLog.message = textify(arguments[0]);
    toLog.callsite = '';

    if (name === 'error' || arguments[0] instanceof Error)
    {
      toLog.callsite = '001';
      if (arguments[0].stack) arguments[0] = arguments[0].stack;
      const call = stack()[1];
      if (call) {
        const file = call.getFileName().replace(`${process.cwd()}/`, '');
        toLog.callsite = ` (${file}:${call.getLineNumber()})`.grey;
      }
    }

    if (name === 'debug') {
      let sdiff = '';

      // calculate time difference
      if (pre !== null) {
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

      if (typeof arguments[0] !== 'object') toLog.message = toLog.message.grey + sdiff;
    }
    fn(`${toLog.timestamp}${toLog.callsite} ${toLog.level}${toLog.message}`);
  }
});

function textify(obj) {
  let res = obj;

  if (obj === undefined) res = 'undefined';
  if (obj === null) res = 'null';

  if (isDate(obj)) {
    res = new dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
  }
  else if (typeof obj === 'object') {
    res = util.inspect(obj, {colors: true, depth: null, showHidden: false});
    if (!Array.isArray(obj)) res = '\n' + res;
  }
  return res;
}

function isDate(date) {
  return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
}

function set(opt) {
  if (opt && opt.debug !== undefined) debugmode = (opt.debug == true);
}

function stack() {
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack){ return stack; };
  var err = new Error;
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};


module.exports.isDate = isDate;
module.exports.set = set;
