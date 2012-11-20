module.exports = function(username, message, callback) {
  helpers.m.Game.findOne({ name: game_name }, function(err, game) {
    if(err) { return callback(err); }
    if(game === null) {
      return callback(new Error('No game found for game ' + game_name));
    }
    callback(null, game);
  });
}