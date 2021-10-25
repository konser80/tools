
module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./pathreplace');
module.exports.tftotime = require('./timeframes');

module.exports.queue = require('./queue').queue;
module.exports.timeout = require('./queue').timeout;

const validate = require('./validate');

module.exports.istime = validate.isTime;
module.exports.isdate = validate.isDate;
module.exports.isdatetime = validate.isDateTime;

module.exports.textify = require('./textify').textify;
module.exports.logger = require('./logger').logger;

// array.forEachAsync
require('./async').init();

// configureConsole
require('./logger').init();
