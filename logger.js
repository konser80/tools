if (global.DEBUG) console.log(`[r] require tools/logger.js`);

const log4js = require('log4js');
const dayjs = require('dayjs');
const { timetotf } = require('./timeframes');
const { textify } = require('./textify');
require('colors');

const REGEX_STACK = /at (.+?) \(.+?([^/]+?):(\d+):(\d+)\)/;
let previous = null;
const cache = {};

// ==============================================
function configureLogger(minlevel = 'silly', opts = {}) {
  if (global.DEBUG) console.log(`[r] call logger.configureLogger: minlevel=${minlevel}, opts=${JSON.stringify(opts)}`);

  let tracePattern = 'yyyy-MM-dd';
  if (opts.hourly === true) tracePattern = 'yyyy-MM-dd-hh0000';
  const prefix = (opts.prefix || '').toString();

  const layout = { type: 'pretty' };
  log4js.addLayout('pretty', () => formatLog4JS);
  log4js.configure({
    levels: {
      SILLY: { value: 2500, colour: 'cyan' }
    },
    appenders: {
      console: { layout, type: 'stdout' },

      tracefile: {
        layout,
        type: 'dateFile',
        filename: `logs/${prefix}trace.log`,
        pattern: `old/yyyy-MM/${tracePattern}`,
        keepFileExt: true,
        // numBackups: 5
      },

      errorfile: {
        layout,
        type: 'dateFile',
        filename: `logs/${prefix}error.log`,
        pattern: 'old/yyyy-MM',
        keepFileExt: true
      },

      show: { type: 'logLevelFilter', appender: 'console', level: minlevel },

      savetrace: { type: 'logLevelFilter', appender: 'tracefile', level: 'trace' },
      // savedebug: { type: 'logLevelFilter', appender: 'debugfile', level: 'debug' },
      saveerror: { type: 'logLevelFilter', appender: 'errorfile', level: 'warn' },
    },
    categories: {
      default: { appenders: ['show', 'savetrace', 'saveerror'], level: 'silly' }
    }
  });

  const logger = log4js.getLogger();
  console.log = (msg) => logger.trace(msg);
  console.info = (msg) => logger.debug(msg);
  console.warn = (msg) => logger.warn(msg);
  console.error = (msg) => logger.error(msg);

  logger.shutdown = log4js.shutdown;
  return logger;
}
// ==============================================
function configureConsole() {
  if (global.DEBUG) console.log(`[r] call logger.configureConsole`);

  const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
  consoleMethods.forEach((name) => {
    // debug is not a native method
    const origFunction = (name === 'debug') ? console.log : console[name];

    console[name] = newConsole;

    // ==============================================
    function newConsole(data, _opt) {

      // do not do anything
      // if (_opt && _opt.log === false) return;

      const level = name;
      const time = dayjs();
      const res = formatLog(data, level, _opt, time);
      origFunction(res);
    }
  });
}

// ==============================================
function formatLog4JS(logEvent) {
  const level = (logEvent.level.levelStr || 'info').toLowerCase();
  const data = logEvent.data[0];
  const opt = logEvent.data[1] || {};
  const time = logEvent.startTime || dayjs();

  // do NOT do anything - this doesn't work!!!
  // if (opt.log === false) return null;

  // result from cache
  if (cache.level === level
  && cache.data === data
  && cache.time === time) return cache.res;

  const res = formatLog(data, level, opt, time);

  cache.level = level;
  cache.data = data;
  cache.time = time;
  cache.res = res;
  return res;
}
// ==============================================
function formatLog(message, level, _opt, datetime) {
  const opt = { ...{ time: true, ms: true, err: null, colors: undefined }, ..._opt };
  const log = {
    data: message,
    ms: '',
    level: '',
    time: '',
    fname: '', // error: filepath
    lines: '' // error: line & column
  };

  // message
  log.data = textify(log.data, { colors: true });

  // level
  if (level === 'silly') log.level = `${' S '.cyan.inverse}`;
  if (level === 'warn') log.level = `${' W '.yellow.inverse}`;
  if (level === 'error') log.level = `${' E '.bgRed}`;
  if (level === 'fatal') log.level = `${' F '.red}`;

  // error?
  if (message instanceof Error || opt.err instanceof Error) {
    const err = (message instanceof Error) ? message : opt.err;
    const regexResult = err.stack?.match(REGEX_STACK);
    if (regexResult) {
      log.fname = regexResult[2];
      log.lines = `${regexResult[3]}:${regexResult[4]}`;
      log.level += `${`(${log.fname}:${log.lines})`.grey} `;
    }

    // display short error version
    if (message instanceof Error && log.data.split('\n').length > 8) {
      log.data = log.data.split('\n').slice(0, 8).join('\n');
    }
  }

  // timestamp
  const now = dayjs(datetime);
  if (opt.time) log.time = `${`[${now.format('YYYY-MM-DD HH:mm:ss.SSS')}]`.grey} `;

  // difference
  if (opt.ms && (level === 'trace' || level === 'debug')) log.ms = getTimeDifference(now).green.dim;
  previous = now;

  // multiline: check type because it could be 'true/false' values
  if (level === 'trace' && typeof log.data === 'string' && opt.time && log.data.indexOf('\n') !== -1) log.data = `\n${log.data}`;

  // colors
  if (level === 'silly') {
    log.data = resetColors(log.data).cyan;
  }
  if ((level === 'trace') && (opt.colors !== true)) {
    log.data = resetColors(log.data).blue;
  }
  if (level === 'warn') {
    log.data = resetColors(log.data).yellow;
  }
  if (level === 'error') {
    log.data = resetColors(log.data).red;
  }
  if (level === 'debug' && opt.colors !== true) {
    log.data = resetColors(log.data).grey;
  }

  // result
  const res = `${log.time}${log.level}${log.data}${log.ms}`;
  return res;
}
// ==============================================
function resetColors(src) {
  if (!src || typeof src !== 'string') return src.toString();
  const res = src.replace(/\u001b\[\d{1,2}m/g, ''); // eslint-disable-line
  return res;
}

// ==============================================
function getTimeDifference(now) {

  if (previous === null) return '';

  const diff = now.diff(previous);
  const sdiff = ` +${timetotf(diff)}`;

  return sdiff;
}

module.exports.init = configureConsole;
module.exports.logger = configureLogger;
