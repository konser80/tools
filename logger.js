const log4js = require('log4js');
const dayjs = require('dayjs');
const tools = require('./index');
require('colors');

const LOGLEVEL = 'debug';
let previous = null;
let counter = 0;

// ==============================================
function configureLogger(minlevel = LOGLEVEL) {

  const layout = { type: 'pretty' };
  log4js.addLayout('pretty', () => formatLog4JS);
  log4js.configure({
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
      default: { appenders: ['show', 'tracefile', 'savedebug', 'saveerror'], level: 'trace' }
    }
  });

  const logger = log4js.getLogger();
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
  const opt = { ...{ time: true, ms: true }, ..._opt };
  counter += 1;

  const log = {
    data: message,
    ms: '',
    level: '',
    time: ''
  };

  // level
  if (level === 'warn') log.level = `${'[WARN]'.yellow.inverse} `;
  if (level === 'error') log.level = `${'[ERROR]'.bgRed} `;
  if (level === 'fatal') log.level = `${'[FATAL]'.red} `;

  // timestamp
  const now = dayjs(datetime);
  if (opt.time) log.time = `${`[${now.format('YYYY-MM-DD HH:mm:ss.SSS')}]`.grey} `;

  // difference
  if (opt.ms && (level === 'trace' || level === 'debug')) log.ms = getTimeDifference(now).green.dim;
  previous = now;

  // message
  log.data = tools.textify(log.data, { colors: true });

  // multiline: check type because it could be 'true/false' values
  if (typeof log.data === 'string' && opt.time && log.data.indexOf('\n') !== -1) log.data = `\n${log.data}`;

  // colors
  if (level === 'trace') log.data = log.data.blue;
  if (level === 'debug') {
    log.data = log.data.grey;
    // our message could be colored, so let's start with grey & replace all 'color.reset' to grey
    // toLog.message = `\u001b[90m${toLog.message}`;
    // toLog.message = toLog.message.replace(/\[39m/g, '[90m');
  }

  // result
  const res = `${log.time}${log.level}${log.data}${log.ms} ${counter}`;
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
