var async = require('async'),
    factory = require('./factory'),
    should = require('should');

describe('Game', function() {
  var game, user;

  beforeEach(function(done) {
    async.parallel([
      function createGame(cb) {
        factory.game(function(err, new_game) {
          if(err) { return cb(err); }
          game = new_game;
          cb();
        });
      },
      function createUser(cb) {
        factory.user(function(err, new_user) {
          if(err) { return cb(err); }
          user = new_user;
          cb();
        });
      }
    ], done);
  });

  describe('Scores', function() {

    beforeEach(function(done) {
      game.weeklyScore = [];
      game.monthlyScore = [];
      game.allTimeScore = [];
      game.save(done);
    });

    var createScore = function(score) {
      return { user: user._id, score: score };
    };
  });

});