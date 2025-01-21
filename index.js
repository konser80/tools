// global.DEBUG = true;
if (global.DEBUG) console.log(`[r] require tools/index.js`);

const loggerModule = require('./logger');

// configureConsole
if (global.DEBUG) console.log(`[r] index: calling loggerModule.init()`);
loggerModule.init();

module.exports.logger = loggerModule.logger;

module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./pathreplace');

// timeframes
module.exports.tftotime = require('./timeframes').tftotime;
module.exports.timetotf = require('./timeframes').timetotf;
module.exports.timetotf2 = require('./timeframes').timetotf2;

module.exports.randomtext = require('./randomtext').randomtext;

module.exports.notify = require('./notify').notify;
module.exports.queue = require('./queue').queue;
module.exports.timeout = require('./queue').timeout;

module.exports.purgeOldFiles = require('./files').purgeOldFiles;

const validate = require('./validate');

module.exports.istime = validate.isTime;
module.exports.isdate = validate.isDate;
module.exports.isdatetime = validate.isDateTime;

module.exports.jparse = require('./jparse').parse;

module.exports.sanitize = require('./sanitize').sanitize;
module.exports.textify = require('./textify').textify;
module.exports.typeof = require('./textify').typeof;

module.exports.correctHTML = require('./html').correctHTML;

// array.forEachAsync
require('./async').init();
module.exports.forEachAsyncFn = require('./async').forEachAsyncFn;
