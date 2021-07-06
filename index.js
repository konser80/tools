const consolemodule = require('./console');

consolemodule.init();

module.exports.val = require('./value');
module.exports.combine = require('./combine');
module.exports.replace = require('./pathreplace');

module.exports.textify = consolemodule.textify;
