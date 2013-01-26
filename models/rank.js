var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Rank = new Schema({
  rank: { type: Number, required: true },
  level: { type: Number, required: true }
});

Rank.index({ level: 1 });

/**
* increases rank by 1
*
* callback(err)
**/
Rank.statics.incrRank = function(level, cb) {
  getRank(level, function(err, rank) {
    if(err) { return cb(err); }
    rank.rank += 1;
    rank.save(cb);
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

module.exports = mongoose.model('Rank', Rank);