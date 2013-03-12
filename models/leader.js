var mongoose = require('mongoose'),
    async = require('async'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Leader = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true }
});

Leader.index({ rank: 1 });

/**
* gets leaderboard in sorted order from 1 to 10
*
* callback(err, results)
**/
var getLeaders = Leader.statics.getLeaders = function(callback) {
  helpers.m.Leader.count({}, function(err, leader_count) {
    if(err) { return callback(err); }
    if(leader_count == 0) {
      return callback(null, []);
    } else {
      helpers.m.Leader.find({}, { user: true }).sort({ rank: 1 }).exec(callback);
    }
  });
};

/**
* gets leader users' info in sorted order from 1 to 10
*
* callback(err, results)
**/
Leader.statics.getLeaderInfo = function(callback) {
  var leader_ids = [];
  getLeaders(function(err, leaders) {
    leaders.forEach(function(leader) {
      leader_ids.push(leader.user);
    });
    // get usernames of leaders from user ids
    async.map(leader_ids, helpers.m.User.getUserInfo, callback);
  });
};

module.exports = mongoose.model('Leader', Leader);