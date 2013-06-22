var async = require('async'),
    game = require('./game'),
    helpers = require('./helpers'),
    globals = require('./globals');

var purchaseItem = exports.purchaseItem = function(username, category, item_name, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    async.waterfall([
      function(cb) {
        if(globals.STORE[category][item_name] || globals.STORE[category][item_name] === 0) {
          cb(null);
        } else {
          return cb('Item ' + item_name + ' in ' + category + ' does not exist in store');
        }
      },
      function(cb) {
        if(globals.STORE[category][item_name] <= user.gold) {
          cb(null);
        } else {
          return cb('You do not have enough gold to purchase this profile');
        }
      }
    ], function(err) {
      if(typeof(err) == 'string') {
        return callback(null, false, err); // Return user non critical error message
      }
      if(err) { return callback(err); }
      user.decreaseGold(globals.STORE[category][item_name], function(err) {
        return callback(err, true);
      });
    });
  });
};

exports.purchaseProfile = function(username, profile_to_purchase, callback) {
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    if(user.unlockedProfiles.indexOf(profile_to_purchase) != -1) {
      return callback(null, false, 'You already have this profile');
    }
    purchaseItem(username, 'profiles', profile_to_purchase, function(err, success, message) {
      if(err) { return callback(err); }
      if(!success) { return callback(err, success, message); }
      user.unlockedProfiles.push(profile_to_purchase);
      user.save(function(err) {
        return callback(err, true);
      });
    });
  });
};

exports.purchaseGameUpgrade = function(username, game_name, upgrade_index, callback) {
  if(!game[game_name]) {
    logger.warn('Tried to unlock nonexistant game: ' + game_name);
    return callback(null);
  }
  helpers.m.User.getUser(username, function(err, user) {
    if(err) { return callback(err); }
    // check if user has this upgrade
    user.gameUpgrades.find({ game: game_name }, function(err, upgrade) {
      console.log(upgrade);
    });
    
    // check if user has this gold
    user.gameUpgrades.push(new GameSchema({ game: game_name, index: upgrade_index }));
    user.save(function(err) {
      if(err) { return callback(err); }
      user.decreaseGold(globals.STORE.game_upgrades[upgrade_index], function(err) {
        return callback(err, true);
      });
    })
  });
};