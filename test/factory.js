var helpers = require('../lib/helpers');

helpers.initModels();

var encrypted_password = helpers.m.User.hashPassword('password');

exports.user = function(parameters, callback) {
  if(typeof(parameters) == 'function') {
    callback = parameters;
    parameters = { username: 'test_user' };
  }
  helpers.m.User.findOne({ username: parameters.username }, function(err, user) {
    if(err) { return callback(err); }
    user = user || new helpers.m.User({ username: parameters.username, password: encrypted_password, email: 'leungxa@gmail.com' });
    Object.keys(parameters).forEach(function(key) {
      user[key] = parameters[key];
    });
    if(parameters.password) {
      user.password = helpers.m.User.hashPassword(parameters.password);
    }
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