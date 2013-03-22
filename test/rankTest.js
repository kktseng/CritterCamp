var async = require('async'),
    users = require('../lib/users'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('Score System', function() {
  var user;

  beforeEach(function(done) {
    helpers.m.Rank.remove({}, function(err) {
      if(err) { return done(err); }
      factory.user(function(err, new_user) {
        if(err) { return done(err); }
        user = new_user;
        var ranks = [];
        ranks.push(new helpers.m.Rank({ rank: 1, level: 10 }));
        ranks.push(new helpers.m.Rank({ rank: 2, level: 9 }));
        ranks.push(new helpers.m.Rank({ rank: 3, level: 8 }));
        ranks.push(new helpers.m.Rank({ rank: 4, level: 7 }));
        ranks.push(new helpers.m.Rank({ rank: 5, level: 6 }));
        ranks.push(new helpers.m.Rank({ rank: 6, level: 5 }));
        ranks.push(new helpers.m.Rank({ rank: 7, level: 4 }));
        ranks.push(new helpers.m.Rank({ rank: 8, level: 3 }));
        ranks.push(new helpers.m.Rank({ rank: 9, level: 2 }));
        ranks.push(new helpers.m.Rank({ rank: 10, level: 1 }));
        async.forEach(ranks, function(rank, callb) {
          rank.save(callb);
        }, function(err) {
          if(err) { return done(err); }
          helpers.m.User.remove({ username: { $regex: 'ranked_user_.*', $options: 's' } }, function(err) {
            if(err) { return done(err); }
            var ranked_users = [];
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_1', level: 1 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_2', level: 2 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_3', level: 3 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_4', level: 4 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_5', level: 5 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_6', level: 6 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_7', level: 7 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_8', level: 8 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_9', level: 9 }));
            ranked_users.push(new helpers.m.User({ username: 'ranked_user_10', level: 10 }));
            async.forEach(ranked_users, function(ranked_user, cb) {
              ranked_user.save(cb);
            }, done);
          });
        });
      });
    });
  });

  it('can set exp and level, update ranks and update leaderboard', function(done) {
    async.waterfall([
      function(callback) {
        user.level = 5;
        user.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        // increase the number of players of test user rank
        test_user_rank.players++;
        test_user_rank.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        // increase ranks below test user
        var ranks_to_increase = [];
        for(var i = 1; i < 5; i++) {
          ranks_to_increase.push(i);
        }
        async.forEach(ranks_to_increase, helpers.m.Rank.incrRank, callback);
      },
      function(callback) {
        users.setExp(user.username, 50000, callback);
      },
      function(updated_user, callback) {
        updated_user.level.should.equal(6);
        updated_user.exp.should.equal(50000);
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        test_user_rank.rank.should.equal(5);
        users.getRank('ranked_user_5', callback);
      },
      function(ranked_user_5_rank, callback) {
        ranked_user_5_rank.rank.should.equal(7);
        helpers.m.Leader.getLeaderInfo(callback);
      },
      function(leader_info, callback) {
        leader_info[0].username.should.equal('ranked_user_10');
        // test_user is in between
        leader_info[9].username.should.equal('ranked_user_2');
        callback();      
      }
    ], function(err) {
      if(err) { return done(err); }
      done();
    });
  });

  it('can create new rank object correctly', function(done) {
    async.waterfall([
      function(callback) {
        user.level = 10;
        user.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        // increase the number of players of test user rank
        test_user_rank.players++;
        test_user_rank.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        // increase ranks below test user
        var ranks_to_increase = [];
        for(var i = 1; i < 10; i++) {
          ranks_to_increase.push(i);
        }
        async.forEach(ranks_to_increase, helpers.m.Rank.incrRank, callback);
      },
      function(callback) {
        users.setExp(user.username, 105000, callback);
      },
      function(updated_user, callback) {
        updated_user.level.should.equal(11);
        updated_user.exp.should.equal(105000);
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        test_user_rank.rank.should.equal(1);
        callback(null, done);
      }
    ], function(err) {
      if(err) { return done(err); }
      done();
    });
  });

  it('can set exp correctly when level does not change', function(done) {
    async.waterfall([
      function(callback) {
        user.level = 5;
        user.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        // increase the number of players of test user rank
        test_user_rank.players++;
        test_user_rank.save(function(err) {
          callback(err);
        });
      },
      function(callback) {
        // increase ranks below test user
        var ranks_to_increase = [];
        for(var i = 1; i < 5; i++) {
          ranks_to_increase.push(i);
        }
        async.forEach(ranks_to_increase, helpers.m.Rank.incrRank, callback);
      },
      function(callback) {
        users.setExp(user.username, 40000, callback);
      },
      //async.apply(users.setExp.bind(users), user.username, 40000),
      function(updated_user, callback) {
        updated_user.level.should.equal(5);
        updated_user.exp.should.equal(40000);
        users.getRank(user.username, callback);
      },
      function(test_user_rank, callback) {
        test_user_rank.rank.should.equal(6);
        callback(null);
      }
    ], function(err) {
      if(err) { return done(err); }
      done();
    });
  });

  it('can update experience and gold correctly', function(done) {
    users.updateResults('ranked_user_1', 15124, 1500, function(err, new_level, percentage) {
      if(err) { return done(err); }
      new_level.should.equal(2);
      percentage.should.equal(51);
      done();
    });
  });

});
