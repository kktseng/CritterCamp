var helpers = require('../lib/helpers');

helpers.initModels();

exports.user = function(username, callback) {
  if(typeof(username) == 'function') {
    callback = username;
    username = 'test_user';
  }
  helpers.m.User.findOne({ username: username }, function(err, user) {
    if(err) { return callback(err); }
    user = user || new helpers.m.User({ username: username, password: 'password', email: 'leungxa@gmail.com' });
    user.save(callback);
  });
};

exports.game = function(parameters, callback) {
  if(typeof(parameters) == 'function') {
    callback = parameters;
    parameters = {};
  }
  helpers.m.Game.findOne({ name: parameters.name || 'test_game' }, function(err, game) {
    if(err) { return callback(err); }
    game = game || new helpers.m.Game({ name: 'test_game' });
    Object.keys(parameters).forEach(function(key) {
      game[key] = parameters[key];
    });
    game.save(callback);
  });
};