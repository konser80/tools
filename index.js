module.exports.textify = require('./textify').textify;
module.exports.typeof = require('./textify').typeof;

module.exports.tftotime = require('./timeframes').tftotime;
module.exports.timetotf = require('./timeframes').timetotf;
module.exports.timetotf2 = require('./timeframes').timetotf2;

module.exports.queue = require('./queue').queue;
module.exports.sleep = require('./queue').sleep;
module.exports.timeout = require('./queue').sleep;

module.exports.logger = require('./logger');

// internal modules

module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./replace').replace;

module.exports.randomtext = require('./randomtext').randomtext;

module.exports.notify = require('./notify').notify;

module.exports.purgeOldFiles = require('./files').purgeOldFiles;

// TODO: check usage
const validate = require('./validate');
module.exports.istime = validate.isTime;
module.exports.isdate = validate.isDate;
module.exports.isdatetime = validate.isDateTime;

module.exports.jparse = require('./jparse').parse;

module.exports.sanitize = require('./sanitize').sanitize;

module.exports.correctHTML = require('./html').correctHTML;

// array.forEachAsync
require('./arrays').init();
module.exports.forEachAsyncFn = require('./arrays').forEachAsyncFn;
