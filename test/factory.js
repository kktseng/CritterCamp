var helpers = require('../lib/helpers');

helpers.initModels();

exports.user = function(username, callback) {
  helpers.m.User.findOne({ username: username }, function(err, user) {
    if (err) { return callback(err); }
    user = user || new helpers.m.User({ username: username, password: 'abc123' });
    user.save(callback);
  });
};