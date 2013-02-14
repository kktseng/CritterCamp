var async = require('async'),
    helpers = require('./helpers'),
    logger = require('./logger'),
    connection = require('./connection');

exports.getLeaderUsernames = function(callback) {
  var leader_ids = [];
  helpers.m.Leader.getLeaders(function(err, leaders) {
    leaders.forEach(function(leader) {
      leader_ids.push(leader._id);
    });
    // get usernames of leaders from user ids
    async.map(leader_ids, helpers.m.User.getUsername, callback);
  });
};