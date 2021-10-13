const dayjs = require('dayjs');
const util = require('util');
require('colors');

let previous = null;

// ==============================================
function init() {

  const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
  consoleMethods.forEach((name) => {
    // debug is not a native method
    const origFunction = (name === 'debug') ? console.log : console[name];

    console[name] = newConsole;

    // ==============================================
    function newConsole(data, _opt) {
      const opt = { ...{ time: true, ms: true }, ..._opt };
      const toLog = {};
      const now = dayjs();

      // show timestamp
      toLog.timestamp = now.format('YYYY-MM-DD HH:mm:ss.SSS');
      toLog.timestamp = `[${toLog.timestamp}] `.grey;
      // if (!showtime) toLog.timestamp = '';
      if (opt.time === false) toLog.timestamp = '';

      toLog.level = '';
      if (name === 'error') toLog.level = `${'[ERROR]'.bgRed} `;
      if (name === 'warn') toLog.level = `${'[WARN]'.black.bgYellow} `;
      toLog.message = textify(data, { colors: true });

      // start with grey & replace all 'reset' to grey
      if (name === 'debug') toLog.message = `\u001b[90m${toLog.message}`;
      if (name === 'debug') toLog.message = toLog.message.replace(/\[39m/g, '[90m');

      toLog.callsite = '';
      if (name === 'error' || data instanceof Error) {
        toLog.callsite = '001';
        if (data.stack) data = data.stack; // eslint-disable-line
        const call = getStack()[1];
        if (call) {
          const file = call.getFileName().replace(`${process.cwd()}/`, '');
          toLog.callsite = `(${file}:${call.getLineNumber()})`.grey;
        }
      }

      // console.debug can show time difference between calls
      if (name === 'debug') {
        let sdiff = '';

        // calculate time difference
        if (opt.ms && previous !== null) {
          const diff = now.diff(previous);

          if (diff < 1000) {
            sdiff = ` +${diff}ms`;
          }
          else if (diff < 60000) {
            sdiff = ` +${(diff / 1000).toFixed(1)}s`;
          }
          else {
            sdiff = ` +${(diff / 60000).toFixed(1)}m`;
          }
          sdiff = sdiff.green;
        }
        // previous = now;

        if (typeof data !== 'object') toLog.message = toLog.message.toString().grey + sdiff;
      }
      previous = now;

      // add empty line for multi-line message
      if (typeof toLog.message === 'string' && opt.time && toLog.message.indexOf('\n') !== -1) toLog.message = `\n${toLog.message}`;
      const result = `${toLog.timestamp}${toLog.callsite}${toLog.level}${toLog.message}`;
      origFunction(result);
    }

  });
}

// =============================================================
function textify(obj, _opt) {
  let res = obj;

  let opt = {
    colors: false,
    crlf: true
  };
  opt = { ...opt, ..._opt };

  if (obj === undefined) res = 'undefined';
  if (obj === null) res = 'null';

  if (isDate(obj)) {
    res = dayjs(obj).format('YYYY-MM-DD HH:mm:ss.SSS');
  }
  else if (typeof obj === 'object') {
    res = util.inspect(obj, { colors: opt.colors, depth: null, showHidden: false });
    if (opt.crlf === false) {
      res = res.replace(/\n/g, ' ').replace(/ {2,}/g, ' ');
    }
    // if (res.indexOf('\n') !== -1) res = `\n${res}`;
  }
  return res;
}

// =============================================================
function isDate(date) {
  return date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date);
}

// =============================================================
function getStack() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const err = new Error();
  Error.captureStackTrace(err, arguments.callee); // eslint-disable-line no-restricted-properties, no-caller
  const result = err.stack;
  Error.prepareStackTrace = orig;
  return result;
}


module.exports.init = init;
module.exports.textify = textify;
module.exports.isDate = isDate;
