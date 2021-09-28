const consolemodule = require('./console');
const validate = require('./validate');
const queuelib = require('./queue');
require('./async');

consolemodule.init();

module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./pathreplace');
module.exports.tftotime = require('./timeframes');

module.exports.queue = queuelib.queue;
module.exports.timeout = queuelib.timeout;

module.exports.istime = validate.isTime;
module.exports.isdate = validate.isDate;
module.exports.isdatetime = validate.isDateTime;

module.exports.textify = consolemodule.textify;
