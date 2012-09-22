var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Score = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  time: { type: Date, default: Date.now }
});

var GameStat = new Schema({
  game: { type: String, required: true },
  weekly: { type: [ Score ], default: [] },
  monthly: { type: [ Score ], default: [] },
  allTime: { type: [ Score ], default: [] }
});

GameStat.index({ game: 1 });

module.exports = mongoose.model('GameStat', GameStat);