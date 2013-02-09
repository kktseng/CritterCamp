var mongoose = require('mongoose'),
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
Leader.statics.getLeaders = function(callback) {
  helpers.m.Leader.find({}, { _id: true }).sort({ rank: 1 }, callback);
};

module.exports = mongoose.model('Leader', Leader);