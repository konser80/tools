const consolemodule = require('./console');
const validate = require('./validate');

consolemodule.init();

module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./pathreplace');
module.exports.tftotime = require('./timeframes');

module.exports.istime = validate.isTime;
module.exports.isdate = validate.isDate;
module.exports.isdatetime = validate.isDateTime;

module.exports.textify = consolemodule.textify;
