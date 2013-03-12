var helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var DailyStat = new Schema({
  date: { type: Date, default: Date.now },
  gameStats: [{ type: ObjectId, ref: 'GameStat' }],
  goldSpent: { type: Number, default: 0 }
});

DailyStat.index({ date: 1, game: 1 });

var GameStat = new Schema({
  game: { type: String, required: true },
  totalPlays: { type: Number, default: 0 },
  uniqueUsers: { type: Number, default: 0 }
});

/**
* aggregates all the stats for a given day
*
* callback(err, stats)
**/
DailyStat.statics.aggregateDate = function(date, callback) {
  var stats = {};
  date = new Date(date);
  helpers.m.DailyStat.find({ date: date }, { date: false, game: false }, function(err, results) {
    if(err) { return callback(err); }
    results.forEach(function(result) {
      Object.keys(result).forEach(function(key) {
        if(key === '_id') {
          return;
        } else if(!stats[key]) {
          stats[key] = results[key];
        } else {
          stats[key] += results[key];
        }
      });
    });
    callback(null, stats);
  });
};

/**
* aggregates all the stats for a given game
*
* callback(err, stats)
**/
DailyStat.statics.aggregateGame = function(game, callback) {
  var stats = {};
  helpers.m.DailyStat.find({ game: game }, { date: false, game: false }, function(err, results) {
    if(err) { return callback(err); }
    results.forEach(function(result) {
      Object.keys(result).forEach(function(key) {
        if(key === '_id') {
          return;
        } else if(!stats[key]) {
          stats[key] = results[key];
        } else {
          stats[key] += results[key];
        }
      });
    });
    callback(null, stats);
  });
};

module.exports = mongoose.model('DailyStat', DailyStat);