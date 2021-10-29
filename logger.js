const log4js = require('log4js');
const dayjs = require('dayjs');
const tools = require('./index');
require('colors');

const REGEX_STACK = /at (.+?) \(.+?([^/]+?):(\d+):(\d+)\)/;
const LOGLEVEL = 'debug';
let previous = null;
const cache = {};

// ==============================================
function configureLogger(minlevel = LOGLEVEL) {

  const layout = { type: 'pretty' };
  log4js.addLayout('pretty', () => formatLog4JS);
  log4js.configure({
    levels: {
      SILLY: { value: 2500, colour: 'blue' }
    },
    appenders: {
      console: { layout, type: 'stdout' },

      tracefile: { layout, type: 'dateFile', filename: 'logs/trace.log', pattern: 'old/yyyy-MM/yyyy-MM-dd-hh0000', keepFileExt: true, daysToKeep: 7 },
      debugfile: { layout, type: 'dateFile', filename: 'logs/debug.log', pattern: 'old/yyyy-MM/yyyy-MM-dd', keepFileExt: true, daysToKeep: 30 },
      errorfile: { layout, type: 'dateFile', filename: 'logs/error.log', pattern: 'old/yyyy-MM', keepFileExt: true },

      show: { type: 'logLevelFilter', appender: 'console', level: minlevel },
      savetrace: { type: 'logLevelFilter', appender: 'tracefile', level: 'trace' },
      savedebug: { type: 'logLevelFilter', appender: 'debugfile', level: 'debug' },
      saveerror: { type: 'logLevelFilter', appender: 'errorfile', level: 'warn' },
    },
    categories: {
      default: { appenders: ['show', 'savetrace', 'savedebug', 'saveerror'], level: 'silly' }
    }
  });

  const logger = log4js.getLogger();
  logger.shutdown = log4js.shutdown;
  return logger;
}
// ==============================================
function configureConsole() {

  const consoleMethods = ['debug', 'log', 'info', 'warn', 'error'];
  consoleMethods.forEach((name) => {
    // debug is not a native method
    const origFunction = (name === 'debug') ? console.log : console[name];

    console[name] = newConsole;

    // ==============================================
    function newConsole(data, _opt) {

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
  const opt = { ...{ time: true, ms: true, err: null }, ..._opt };
  const log = {
    data: message,
    ms: '',
    level: '',
    time: '',
    fname: '', // error: filepath
    lines: '' // error: line & column
  };

  // message
  log.data = tools.textify(log.data, { colors: true });

  // level
  if (level === 'warn') log.level = `${'[WARN]'.yellow.inverse} `;
  if (level === 'error') log.level = `${'[ERROR]'.bgRed} `;
  if (level === 'fatal') log.level = `${'[FATAL]'.red} `;

  // error?
  if (message instanceof Error || opt.err instanceof Error) {
    const err = (message instanceof Error) ? message : opt.err;
    const regexResult = err.stack.match(REGEX_STACK);
    if (regexResult) {
      log.fname = regexResult[2];
      log.lines = `${regexResult[3]}:${regexResult[4]}`;
      log.level += `${`(${log.fname}:${log.lines})`.grey} `;
    }

    // display short error version
    if (message instanceof Error && log.data.split('\n').length > 6) {
      log.data = log.data.split('\n').slice(0, 6).join('\n');
    }
  }

  // timestamp
  const now = dayjs(datetime);
  if (opt.time) log.time = `${`[${now.format('YYYY-MM-DD HH:mm:ss.SSS')}]`.grey} `;

  // difference
  if (opt.ms && (level === 'trace' || level === 'debug')) log.ms = getTimeDifference(now).green.dim;
  previous = now;

  // multiline: check type because it could be 'true/false' values
  if (typeof log.data === 'string' && opt.time && log.data.indexOf('\n') !== -1) log.data = `\n${log.data}`;

  // colors
  if (level === 'trace' || level === 'silly') {
    log.data = resetColors(log.data).blue;
  }
  if (level === 'debug') {
    log.data = resetColors(log.data).grey;
  }

  // result
  const res = `${log.time}${log.level}${log.data}${log.ms}`;
  return res;
}
// ==============================================
function resetColors(src) {
  if (!src || typeof src !== 'string') return src.toString();
  const res = src.replace(/\u001b\[\d{1,2}m/g, '');
  return res;
}

// ==============================================
function getTimeDifference(now) {

  let sdiff = '';

  // calculate time difference
  if (previous === null) return sdiff;

  const diff = now.diff(previous);

  if (diff < 1000) sdiff = ` +${diff}ms`;
  if (diff >= 1000 && diff < 60000) sdiff = ` +${(diff / 1000).toFixed(1)}s`;
  if (diff >= 60000 && diff < 3600000) sdiff = ` +${(diff / 60000).toFixed(1)}m`;
  if (diff >= 3600000) sdiff = ` +${(diff / 3600000).toFixed(1)}h`;
  // sdiff = sdiff.green.dim;
  return sdiff;
}

module.exports.init = configureConsole;
module.exports.logger = configureLogger;
