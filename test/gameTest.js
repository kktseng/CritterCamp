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

    it('can store a score in an empty score list', function(done) {
      game.checkScore(user._id, 100, function(err, weekly, monthly, allTime) {
        if(err) { return done(err); }
        weekly.should.equal(1);
        monthly.should.equal(1);
        allTime.should.equal(1);
        done();
      });
    });

    it('should not store a score when scores are too low', function(done) {
      game.weeklyScore = [];
      for(var i = 2; i < 12; i++) {
        game.weeklyScore.push(createScore(i));
      }
      game.checkScore(user._id, 1, function(err, weekly) {
        weekly.should.equal(0);
        done();
      });
    });

    it('should insert a score in the correct position if high enough', function(done) {
      game.weeklyScore = [];
      game.monthlyScore = [];
      game.allTimeScore = [];
      for(var i = 1; i < 11; i++) {
        game.weeklyScore.push(createScore(i));
        game.monthlyScore.push(createScore(i + 5));
        game.allTimeScore.push(createScore(i + 10));
      }
      game.checkScore(user._id, 13, function(err, weekly, monthly, allTime) {
        weekly.should.equal(1);
        monthly.should.equal(4);
        allTime.should.equal(9);
        done();
      });
    });

  });

});