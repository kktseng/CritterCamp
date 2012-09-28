var helpers = require('../lib/helpers');

helpers.initModels();

exports.user = function(username, callback) {
  helpers.m.User.findOne({ username: username }, function(err, user) {
    if(err) { return callback(err); }
    user = user || new helpers.m.User({ username: username, password: 'abc123' });
    user.save(callback);
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
  })
};