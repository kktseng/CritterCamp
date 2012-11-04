var moment = require('moment'),
    winston = require('winston');

function timestamp() {
  return moment().format('YYYY-MM-DD HH:mm:ss.SSS');
}



var logger = new (winston.Logger) ({
    transports: [
      new (winston.transports.Console)({ timestamp: timestamp, colorize: true })
    ]
});

exports.info = logger.info;
exports.warn = logger.warn;
exports.error = function(err) {
  if(err) { logger.error(err); }
}