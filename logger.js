/* eslint-disable prefer-template */
const log4js = require('log4js');

const tools = require('./index');
const { textify, timetotf } = tools;
require('colors');

const REGEX_STACK = /at (.+?) \(.+?([^/]+?):(\d+):(\d+)\)/;
let previous = null;
const cache = {};

// ==============================================
function configureLogger(minlevel = 'silly', opts = {}) {

  let tracePattern = 'yyyy-MM-dd';
  if (opts.hourly === true) tracePattern = 'yyyy-MM-dd-hh0000';
  const prefix = (opts.prefix || '').toString();
  const logdir = (opts.dir || 'logs').toString().replace(/\/+$/, '');

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
        filename: `${logdir}/${prefix}trace.log`,
        pattern: `old/yyyy-MM/${tracePattern}`,
        keepFileExt: true,
        mode: 0o644
        // numBackups: 5
      },

      errorfile: {
        layout,
        type: 'dateFile',
        filename: `${logdir}/${prefix}error.log`,
        pattern: 'old/yyyy-MM',
        keepFileExt: true,
        mode: 0o644
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
  console.log = (...args) => logger.trace(...args);
  console.info = (...args) => logger.debug(...args);
  console.warn = (...args) => logger.warn(...args);
  console.error = (...args) => logger.error(...args);

  logger.shutdown = log4js.shutdown;
  return logger;
}
// ==============================================
function configureConsole() {

  const levelMap = { debug: 'debug', log: 'trace', info: 'debug', warn: 'warn', error: 'error' };
  const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
  consoleMethods.forEach((name) => {
    // debug is not a native method
    const origFunction = (name === 'debug') ? console.log : console[name];

    console[name] = newConsole;

    // ==============================================
    function newConsole(...args) {

      // do not do anything
      // if (_opt && _opt.log === false) return;

      const level = levelMap[name];
      const time = new Date();
      const data = args[0];
      const res = formatLog(data, level, {}, time);
      origFunction(res.prefix + res.data, ...args.slice(1), res.ms);
    }
  });
}

// ==============================================
function formatLog4JS(logEvent) {
  const level = (logEvent.level.levelStr || 'info').toLowerCase();
  const data = logEvent.data[0];
  const opt = logEvent.data[1] || {};
  const time = logEvent.startTime ? new Date(logEvent.startTime) : new Date();

  // do NOT do anything - this doesn't work!!!
  // if (opt.log === false) return null;

  // result from cache
  const timeVal = time.getTime();
  if (cache.level === level
  && cache.data === data
  && cache.time === timeVal) return cache.res;

  const res = formatLog(data, level, opt, time).text;

  cache.level = level;
  cache.data = data;
  cache.time = timeVal;
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
  const now = (datetime instanceof Date) ? datetime : new Date(datetime);
  if (opt.time) log.time = `${`[${formatDate(now)}]`.grey} `;

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
  return { text: res, prefix: `${log.time}${log.level}`, data: log.data, ms: log.ms };
}
// ==============================================
function resetColors(src) {
  if (src == null) return '';
  if (typeof src !== 'string') return src.toString();
  const res = src.replace(/\u001b\[\d{1,2}m/g, ''); // eslint-disable-line
  return res;
}

// ==============================================
function getTimeDifference(now) {

  if (previous === null) return '';

  const diff = now.getTime() - previous.getTime();
  const sdiff = ` +${timetotf(diff)}`;

  return sdiff;
}

// ==============================================
function pad2(n) { return n < 10 ? '0' + n : '' + n; }
// ==============================================
function pad3(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n; }
// ==============================================
function formatDate(d) {
  return d.getFullYear()
    + '-' + pad2(d.getMonth() + 1)
    + '-' + pad2(d.getDate())
    + ' ' + pad2(d.getHours())
    + ':' + pad2(d.getMinutes())
    + ':' + pad2(d.getSeconds())
    + '.' + pad3(d.getMilliseconds());
}

configureConsole();

module.exports = configureLogger;
module.exports._formatLog = formatLog;
module.exports._resetColors = resetColors;
module.exports._getTimeDifference = getTimeDifference;
