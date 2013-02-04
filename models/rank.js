var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Rank = new Schema({
  rank: { type: Number, required: true },
  level: { type: Number, required: true },
  players: { type: Number, default: 1 }
});

Rank.index({ level: 1 });

/**
* increases rank by 1
*
* callback(err)
**/
Rank.statics.incrRank = function(level, cb) {
  getRank(level, function(err, rank) {
    console.log('lvl' + level);
    if(err) { return cb(err); }
    if(rank) {
      // don't increase rank if no players are at this level
      if(rank.players <= 0) {
        return cb(null);
      }
      rank.rank += 1;
      rank.save(cb);
    } else {
      // should never reach here?
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
  helpers.m.Rank.findOne({ rank: rank }, { level:true }, function(err, result) {
    if(err) { return cb(err); }
    return cb(err, result.level);
  });
};

/**
* calculates level based on experience
*
**/
Rank.statics.calculateLevel = function(exp) {
  return exp;
}

module.exports = mongoose.model('Rank', Rank);