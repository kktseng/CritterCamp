var async = require('async'),
    party = require('../lib/party'),
    helpers = require('../lib/helpers'),
    redis = helpers.redis,
    should = require('should');

function getRedisInfo(party, users, callback) {
  var commands = [
    async.apply(redis.lrange.bind(redis), 'party_' + party, 0, -1)
  ];
  if(!(users instanceof Array)) {
    users = [ users ];
  }
  users.forEach(function(user) {
    commands.push(async.apply(redis.hget.bind(redis), 'user_' + user, 'party'));
  });
  async.parallel(commands, callback);
}

describe('Parties', function() {

  beforeEach(function(done) {
    redis.flushdb(done);
  });

  it('can check if users are in the same party', function(done) {
    async.parallel([
      async.apply(redis.hset.bind(redis), 'user_test_user1', 'party', '1'),
      async.apply(redis.hset.bind(redis), 'user_test_user2', 'party', '1')
    ], function(err) {
      if(err) { return done(err); }
      party.sameParty('test_user1', 'test_user2', function(err, same_party) {
        if(err) { return done(err); }
        same_party.should.be.true;
        done();
      });
    });
  });

  it('can remove a user from a party', function(done) {
    async.parallel([
      async.apply(redis.rpush.bind(redis), 'party_1', 'test_user1', 'test_user2'),
      async.apply(redis.hset.bind(redis), 'user_test_user1', 'party', '1')
    ], function(err) {
      if(err) { return done(err); }
      party.removeFromParty('test_user1', function(err, party_id) {
        if(err) { return done(err); }
        party_id.should.eql('1');
        getRedisInfo(1, 'test_user1', function(err, results) {
          if(err) { return done(err); }
          results[0].should.eql(['test_user2']);
          should.not.exist(results[1]);
          done();
        });
      });
    });
  });

  it('can have users join a new party', function(done) {
    party.joinParty('test_user1', 'test_user2', function(err, party_id) {
      if(err) { return done(err); }
      party_id.should.eql('1');
      getRedisInfo(1, ['test_user1', 'test_user2'], function(err, results) {
        if(err) { return done(err); }
        results[0].should.eql(['test_user1', 'test_user2']);
        results[1].should.eql('1');
        results[2].should.eql('1');
        done();
      });
    });
  });

  it('can have the user join an existing party', function(done) {
    async.parallel([
      async.apply(redis.rpush.bind(redis), 'party_2', 'test_user1'),
      async.apply(redis.hset.bind(redis), 'user_test_user1', 'party', '2')
    ], function(err) {
      if(err) { return done(err); }
      party.joinParty('test_user2', 'test_user1', function(err, party_id) {
        if(err) { return done(err); }
        party_id.should.eql('2');
        getRedisInfo(2, 'test_user2', function(err, results) {
          if(err) { return done(err); }
          results[0].should.eql(['test_user1', 'test_user2']);
          results[1].should.eql('2');
          done();
        });
      });
    });
  });

});