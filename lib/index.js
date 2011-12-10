var version;
version = require('./priority/version');
exports.package = version.package;
exports.version = version.version;
exports.boot = require("./priority/priority").boot;