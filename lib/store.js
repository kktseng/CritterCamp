var async = require('async'),
    game = require('./game'),
    helpers = require('./helpers'),
    globals = require('./globals');

var purchaseItem = exports.purchaseItem = function(username, category, item_name, callback) {
  logger.debug(username + ' trying to purchase ' + item_name + ' from ' + category);
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

    purchaseItem(username, 'game_upgrades', upgrade_index, function(err, success, message) {
      if(err) { return callback(err); }
      if(success) {
        logger.debug('Game upgrade check successful. Trying to increase game level');
        increaseGameLevel(username, game_name, upgrade_index, callback);
      } else {
        logger.warn(message);
        return callback(null);
      }
    });
  });
};

exports.increaseGameLevel = function(username, game_name, index, callback) {
  // check if level already maxed out
  helpers.m.User.findOne({ username: username, 'gameUpgrades.game': game_name, 'gameUpgrades.index': index, 'gameUpgrades.level': { $gte: globals.STORE.game_upgrades.length }}, function(err, doc) {
    if(err) { return callback(err); }
    if(doc) {
      logger.warn('Tried to increase a maxed level in game ' + game_name + ', index: ' + index);
      return;
    }
    helpers.m.User.update({ username: username, 'gameUpgrades.game': game_name, 'gameUpgrades.index': index }, { $inc: { 'gameUpgrades.$.level': 1 }}, function(err, num) {
      if(err) { return callback(err); }
      if(num !== 0) {
        return callback(null);
      }
      // document did not exist
      helpers.m.User.getUser(username, function(err, user_obj) {
        if(err) { return callback(err); }
        user_obj.addGameUpgrade(game_name, index, 1, callback);
      });
    });
  });
};