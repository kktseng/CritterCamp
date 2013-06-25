var async = require('async'),
    store = require('../lib/store'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should'),
    users = require('../lib/users');

describe('Store', function() {
  var user;


  beforeEach(function(done) {
    factory.user({ username: 'store_test' }, function(err, new_user) {
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
      msg.should.equal('Item griffin in profiles does not exist in store');
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

  it('can create new game level', function(done) {
    factory.resetUser('store_test', function(err) {
      if(err) { return done(err); }
      factory.user({ username: 'store_test' }, function(err, new_user) {
        if(err) { return done(err); }
        user = new_user;
        store.increaseGameLevel(user.username, 'twilight_tango', 3, function(err) {
          if(err) { return done(err); }
          helpers.m.User.findOne({ username: user.username, 'gameUpgrades.game': 'twilight_tango', 'gameUpgrades.index': 3, 'gameUpgrades.level': 1 }, function(err, doc) {
            if(err) { return done(err); }
            doc.should.not.eql(null);
            done();
          });
        });
      });
    });
  });

  it('will handle indexing of game levels correctly', function(done) {
    store.increaseGameLevel(user.username, 'twilight_tango', 2, function(err) {
      if(err) { return done(err); }
      helpers.m.User.findOne({ username: user.username, 'gameUpgrades.game': 'twilight_tango' }, function(err, doc) {
        if(err) { return done(err); }
        doc.gameUpgrades.should.not.eql(null);
        doc.gameUpgrades.length.should.equal(2);
        doc.gameUpgrades[0].level.should.equal(1);
        doc.gameUpgrades[1].level.should.equal(1);
        done();
      });
    });
  });

  it('can increase existing game level', function(done) {
    store.increaseGameLevel(user.username, 'twilight_tango', 3, function(err) {
      if(err) { return done(err); }
      helpers.m.User.findOne({ username: user.username, 'gameUpgrades.game': 'twilight_tango', 'gameUpgrades.index': 3, 'gameUpgrades.level': 2 }, function(err, doc) {
        if(err) { return done(err); }
        doc.should.not.eql(null);
        done();
      });
    });
  });
});
