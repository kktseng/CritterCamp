var async = require('async'),
    helpers = require('./helpers'),
    globals = require('./globals');

exports.purchaseProfile = function(username, profile_to_purchase, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    async.waterfall([
      function(cb) {
        if(globals.STORE.profiles[profile_to_purchase] || globals.STORE.profiles[profile_to_purchase] === 0) {
          cb(null);
        } else {
          return callback(null, false, 'Profile does not exist');
        }
      },
      function(cb) {
        if(user.unlockedProfiles.indexOf(profile_to_purchase) == -1) {
          cb(null);
        } else {
          return callback(null, false, 'You already have this profile');
        }
      },
      function(cb) {
        if(globals.STORE.profiles[profile_to_purchase] <= user.gold) {
          cb(null);
        } else {
          return callback(null, false, 'You do not have enough gold to purchase this profile');
        }
      }
    ], function(err) {
      if(err) { return callback(err); }
      user.unlockedProfiles.push(profile_to_purchase);
      user.save(function(err) {
        if(err) { return callback(err); }
        user.decreaseGold(globals.STORE.profiles[profile_to_purchase], function(err) {
          if(err) { return callback(err); }
          return callback(null, true);
        });
      });
    });
  });
};