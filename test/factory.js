var helpers = require('../lib/helpers');

helpers.initModels();

exports.user = function(parameters, callback) {
  helpers.m.User.findOne({ username: parameters.username || 'test_user' }, function(err, user) {
    if(err) { return callback(err); }
    user = user || new helpers.m.User({ username: username, password: 'abc123' });
    if(parameters.password) {
      user.hashPassword('password', function(err) {
        if(err) { return callback(err); }
        user.save(callback);
      });
    } else {
      user.save(callback);
    }
  });
};

exports.game = function(parameters, callback) {
  helpers.m.Game.findOne({ name: parameters.name || 'test_game' }, function(err, game) {
    if(err) { return callback(err); }
    game = game || new helpers.m.Game({ name: 'test_game' });
    Object.keys(parameters).forEach(function(key) {
      game[key] = parameters[key];
    });
    game.save(callback);
  });
};