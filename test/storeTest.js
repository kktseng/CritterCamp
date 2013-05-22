var async = require('async'),
    store = require('../lib/store'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('Store', function() {
  var user;

  beforeEach(function(done) {
    factory.user(function(err, new_user) {
      if(err) { return done(err); }
      user = new_user;
      user.unlockedProfiles = [ 'pig' ];
      user.gold = 250;
      user.save(done);
    });
  });

  it('can purchase new profile if user has enough gold', function(done) {
    store.purchaseProfile(user.username, 'cow', function(err, success, msg) {
      if(err) { return done(err); }
      success.should.equal(true);
      should.not.exist(msg);
      done();
    });
  });

  it('msg not enough gold to purchase profile', function(done) {
    store.purchaseProfile(user.username, 'eagle', function(err, success, msg) {
      if(err) { return done(err); }
      success.should.equal(false);
      msg.should.equal('You do not have enough gold to purchase this profile');
      done();
    });
  });

  it('msg profile does not exist', function(done) {
    store.purchaseProfile(user.username, 'griffin', function(err, success, msg) {
      if(err) { return done(err); }
      success.should.equal(false);
      msg.should.equal('Profile does not exist');
      done();
    });
  });

  it('msg you already have this profile', function(done) {
    store.purchaseProfile(user.username, 'pig', function(err, success, msg) {
      if(err) { return done(err); }
      success.should.equal(false);
      msg.should.equal('You already have this profile');
      done();
    });
  });
});
