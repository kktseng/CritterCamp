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
        ranks.push(new helpers.m.Rank({ rank: 1, level: 3 }));
        ranks.push(new helpers.m.Rank({ rank: 2, level: 2 }));
        ranks.push(new helpers.m.Rank({ rank: 3, level: 1 }));
        async.forEach(ranks, function(rank, cb) {
          rank.save(cb);
        }, done);
      });
    });
  });

  it('can set exp and level correctly', function(done) {
    user.level = 2;
    user.save(function(err) {
      if(err) { return done(err); }
      users.setExp(user.username, 3, function(err) {
        if(err) { return done(err); }
        helpers.m.User.getUser(user.username, function(err, updated_user) {
          if(err) { return done(err); }
          users.getRank(user.username, function(err, rank) {
            if(err) { return done(err); }
            rank.rank.should.equal(1);
            updated_user.exp.should.equal(3);
            updated_user.level.should.equal(3);
            helpers.m.Rank.getRank(3, function(err, rank_3) {
              if(err) { return done(err); }
              rank_3.rank.should.equal(1);
              helpers.m.Rank.getRank(1, function(err, rank_1) {
                if(err) { return done(err); }
                rank_1.rank.should.equal(3);
                done();
              });
            });
          });
        });
      });
    });
  });
});

// edge case
// we assume each rank: level pair contains at least 1 user at that level
// what if no user is in that level?
/*
lvl 3: rank 1
lvl 2: ?
lvl 1: rank 2


*/