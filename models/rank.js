var mongoose = require('mongoose'),
    globals = require('../lib/globals'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Rank = new Schema({
  rank: { type: Number, required: true },
  level: { type: Number, required: true },
  players: { type: Number, default: 1 }
});

Rank.index({ level: 1 });

/**
* increases rank by 1 based on level
*
* callback(err)
**/
Rank.statics.incrRank = function(level, cb) {
  getRank(level, function(err, rank) {
    if(err) { return cb(err); }
    if(rank) {
      // don't increase rank if no players are at this level
      if(rank.players <= 0) {
        return cb(null);
      }
      rank.rank += 1;
      rank.save(cb);
    } else {
      return cb(new Error('No rank found for level ' + level));
    }
  });
};

/**
* gets rank of rank object given level
*
* callback(err, rank)
**/
var getRank = Rank.statics.getRank = function(level, cb) {
  helpers.m.Rank.findOne({ level: level }, {}, cb);
};

/**
* gets level of rank object given rank
*
* callback(err, level)
**/
var getLevel = Rank.statics.getLevel = function(rank, cb) {
  helpers.m.Rank.findOne({ rank: rank }, { level: true }, function(err, result) {
    return cb(err, result.level);
  });
};

/**
* helper function that performs a binary search for the level corresponding to exp
*
**/
var level_binary_search = function(start, end, exp) {
  var middle = start + Math.floor((end - start) / 2);
  if(globals.EXP_TO_LEVEL[middle] <= exp && globals.EXP_TO_LEVEL[middle + 1] > exp) {
    return middle + 1; // account for 0-indexed array
  }
  else if(globals.EXP_TO_LEVEL[end] <= exp) {
    return end + 1; // any exp > highest exp is highest level
  }
  else if(globals.EXP_TO_LEVEL[middle] > exp) {
    return level_binary_search(start, middle, exp);
  }
  else if(globals.EXP_TO_LEVEL[middle+1] <= exp) {
    return level_binary_search(middle, end, exp);
  }
  else {
    return -1;
  }
}

/**
* calculates level based on experience
*
**/
Rank.statics.calculateLevel = function(exp) {
  var start = 0;
  var end = globals.EXP_TO_LEVEL.length - 1;
  var result = level_binary_search(start, end, exp);
  return result;
}

module.exports = mongoose.model('Rank', Rank);