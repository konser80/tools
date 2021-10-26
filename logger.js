const _ = require('lodash');
const log4js = require('log4js');
const dayjs = require('dayjs');
const tools = require('./index');
require('colors');

const LOGLEVEL = 'debug';
let previous = null;

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

      tracefile: { layout, type: 'dateFile', filename: 'log/trace.log', pattern: '.yyyy-MM-dd-hh', keepFileExt: true, daysToKeep: 7 },
      debugfile: { layout, type: 'dateFile', filename: 'log/debug.log', pattern: '.yyyy-MM-dd', keepFileExt: true, daysToKeep: 30 },
      errorfile: { layout, type: 'dateFile', filename: 'log/error.log', pattern: '.yyyy-MM-dd', keepFileExt: true },

      show: { type: 'logLevelFilter', appender: 'console', level: minlevel },
      savedebug: { type: 'logLevelFilter', appender: 'debugfile', level: 'debug' },
      saveerror: { type: 'logLevelFilter', appender: 'errorfile', level: 'warn' },
    },
    categories: {
      default: { appenders: ['show', 'tracefile', 'savedebug', 'saveerror'], level: 'silly' }
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

  const res = formatLog(data, level, opt, time);
  return res;
}
// ==============================================
function formatLog(message, level, _opt, datetime) {
  const opt = { ...{ time: true, ms: true, err: false }, ..._opt };
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

  // error?
  if (message instanceof Error) {
    const REGEX_ERROR = /at (?:(.+)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/;
    const regexResult = message.stack.match(REGEX_ERROR);
    log.fname = _.last(regexResult[2].split('/'));
    log.lines = `${regexResult[3]}:${regexResult[4]}`;

    // display short error version
    if (opt.err === false) log.data = tools.textify(message.message, { colors: true });
  }

  // level
  if (level === 'warn') log.level = `${'[WARN]'.yellow.inverse} `;
  if (level === 'error') log.level = `${'[ERROR]'.bgRed} ${`(${log.fname}:${log.lines})`.grey} `;
  if (level === 'fatal') log.level = `${'[FATAL]'.red} `;

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
    log.data = log.data.replace(/\u001b\[\d{1,2}m/g, '');
    log.data = log.data.blue;
  }
  if (level === 'debug') {
    log.data = log.data.replace(/\u001b\[\d{1,2}m/g, '');
    log.data = log.data.grey;
  }

  // result
  const res = `${log.time}${log.level}${log.data}${log.ms}`;
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
