exports.info = function(message) {
  console.log('[INF] ' + (new Date()) + ' ' + message);
};

exports.warn = function(message) {
  console.log('[WARN] ' + (new Date()) + ' ' + message);
};

exports.error = function(err) {
  if(err) {
    console.log('[ERR] ' + (new Date()) + ' ' + err.toString());
  }
}