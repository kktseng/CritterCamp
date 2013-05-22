var config = require('config'),
    moment = require('moment'),
    winston = require('winston');

function timestamp() {
  return moment().local().format('YYYY-MM-DD HH:mm:ss.SSS');
}

var logger = new (winston.Logger) ({
    transports: [
      new (winston.transports.Console)({ timestamp: timestamp, colorize: true })
    ]
});

exports.info = logger.info;
exports.debug = function(message) {
  if(config.Debug) {
    logger.info(message);
  }
}
exports.warn = logger.warn;
exports.error = function(err) {
  if(err) { logger.error(err + '\n' + err.stack); }
}