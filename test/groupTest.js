var async = require('async'),
    group = require('../lib/group'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    redis = helpers.redis,
    should = require('should');

function getRedisInfo(group, users, callback) {
  var commands = [
    async.apply(redis.lrange.bind(redis), 'group_' + group, 0, -1),
    async.apply(redis.smembers.bind(redis), 'queue_test_game')
  ];
  if(!(users instanceof Array)) {
    users = [ users ];
  }
  users.forEach(function(user) {
    commands.push(async.apply(redis.hget.bind(redis), 'user_' + user, 'group'));
  });
  async.parallel(commands, callback);
}

describe('Groups', function() {
  var game;

  beforeEach(function(done) {
    factory.game({ maxPartySize: 4 }, function(err, new_game) {
      if(err) { return done(err); }
      game = new_game;
      redis.flushdb(done);
    });
  });

  it('can remove a user from a group', function(done) {
    async.parallel([
      async.apply(redis.rpush.bind(redis), 'group_1', 'test_user1', 'test_user2'),
      async.apply(redis.hset.bind(redis), 'user_test_user1', 'group', '1')
    ], function(err) {
      if(err) { return done(err); }
      group.removeFromGroup('test_user1', function(err) {
        if(err) { return done(err); }
        getRedisInfo(1, 'test_user1', function(err, results) {
          if(err) { return done(err); }
          results[0].should.eql(['test_user2']);
          should.not.exist(results[2]);
          done();
        });
      });
    });
  });

  describe('Single User', function() {

    it('can create a new group if no groups are available', function(done) {
      group.findGroup(['test_user1'], 'test_game', function(err, group_id) {
        if(err) { return done(err); }
        group_id.should.eql('1');
        getRedisInfo(1, 'test_user1', function(err, results) {
          if(err) { return done(err); }
          results[0].should.eql(['test_user1']);
          results[1].should.eql(['1']);
          results[2].should.eql('1');
          done();
        });
      });
    });

    it('can put a user in a group waiting on users', function(done) {
      async.parallel([
        async.apply(redis.rpush.bind(redis), 'group_2', 'test_user1'),
        async.apply(redis.sadd.bind(redis), 'queue_test_game', '2')
      ], function(err) {
        if(err) { return done(err); }
        group.findGroup(['test_user2'], 'test_game', function(err, group_id) {
          if(err) { return done(err); }
          group_id.should.eql('2');
          getRedisInfo(2, 'test_user2', function(err, results) {
            if(err) { return done(err); }
            results[0].should.eql(['test_user1', 'test_user2']);
            results[1].should.eql(['2']);
            results[2].should.eql('2');
            done();
          });
        });
      });
    });

    it('can complete a group with a single user', function(done) {
      async.parallel([
        async.apply(redis.rpush.bind(redis), 'group_2', 'test_user1', 'test_user2', 'test_user3'),
        async.apply(redis.sadd.bind(redis), 'queue_test_game', '2')
      ], function(err) {
        if(err) { return done(err); }
        group.findGroup(['test_user4'], 'test_game', function(err, group_id) {
          if(err) { return done(err); }
          group_id.should.eql('2');
          getRedisInfo(2, 'test_user4', function(err, results) {
            if(err) { return done(err); }
            results[0].should.eql(['test_user1', 'test_user2', 'test_user3', 'test_user4']);
            results[1].should.eql([]);
            results[2].should.eql('2');
            done();
          });
        });
      });
    });

  });

  describe('Party', function() {

    it('can add a party to an existing group', function(done) {
      async.parallel([
        async.apply(redis.rpush.bind(redis), 'group_2', 'test_user1'),
        async.apply(redis.sadd.bind(redis), 'queue_test_game', '2')
      ], function(err) {
        if(err) { return done(err); }
        group.findGroup(['test_user2', 'test_user3'], 'test_game', function(err, group_id) {
          if(err) { return done(err); }
          group_id.should.eql('2');
          getRedisInfo(2, ['test_user2', 'test_user3'], function(err, results) {
            if(err) { return done(err); }
            results[0].should.eql(['test_user1', 'test_user2', 'test_user3']);
            results[1].should.eql(['2']);
            results[2].should.eql('2');
            results[3].should.eql('2');
            done();
          });
        });
      });
    });

    it('can complete a group with a party', function(done) {
      async.parallel([
        async.apply(redis.rpush.bind(redis), 'group_2', 'test_user1'),
        async.apply(redis.sadd.bind(redis), 'queue_test_game', '2')
      ], function(err) {
        if(err) { return done(err); }
        group.findGroup(['test_user2', 'test_user3', 'test_user4'], 'test_game', function(err, group_id) {
          if(err) { return done(err); }
          group_id.should.eql('2');
          getRedisInfo(2, ['test_user2', 'test_user3', 'test_user4'], function(err, results) {
            if(err) { return done(err); }
            results[0].should.eql(['test_user1', 'test_user2', 'test_user3', 'test_user4']);
            results[1].should.eql([]);
            results[2].should.eql('2');
            results[3].should.eql('2');
            results[4].should.eql('2');
            done();
          });
        });
      });
    });

    it('can create a finished group if party size == maxPartySize', function(done) {
      group.findGroup(['test_user1', 'test_user2', 'test_user3', 'test_user4'], 'test_game', function(err, group_id) {
        if(err) { return done(err); }
        group_id.should.eql('1');
        getRedisInfo(1, ['test_user1', 'test_user2', 'test_user3', 'test_user4'], function(err, results) {
          if(err) { return done(err); }
          results[0].should.eql(['test_user1', 'test_user2', 'test_user3', 'test_user4']);
          results[1].should.eql([]);
          results[2].should.eql('1');
          results[3].should.eql('1');
          results[4].should.eql('1');
          results[5].should.eql('1');
          done();
        });
      });
    });

    it('throws an error if party size > maxPartySize', function(done) {
      group.findGroup(['test_user1', 'test_user2', 'test_user3', 'test_user4', 'test_user5'], 'test_game', function(err, group_id) {
        should.exist(err);
        err.toString().should.eql('Error: Party is too large for game');
        done();
      });
    });

  });
});