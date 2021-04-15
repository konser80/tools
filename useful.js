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
    toLog.timestamp = `[${toLog.timestamp}] `.grey;
    toLog.level = (name === 'error') ? '[ERROR]'.bgRed + ' ' : '';
    toLog.message = textify(arguments[0]);

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
    fn(toLog.timestamp + toLog.level + toLog.message);
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

function async_retry(n, wait, fn, ...args) {
  return new Promise((resolve, reject) => {
    let attempts = 1;
    function do_retry(n) {
      return fn(args)
      .then(resolve)
      .catch(function (error) {
        console.debug('error: ' + error.message);
        if (n === 1) {
          reject(error)
        } else {
          setTimeout(() => {
            attempts += 1;
            do_retry(n - 1);
          }, wait * attempts);
        }
      });
    }
    return do_retry(n);
  });
}

module.exports.isDate = isDate;
module.exports.set = set;
module.exports.async_retry = async_retry;
