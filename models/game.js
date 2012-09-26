var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Score = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  time: { type: Date, default: Date.now }
});

var Game = new Schema({
  name: { type: String, required: true },

  maxPartySize: { type: Number, default: 1 },
  version: { type: Number, default: 0.0 },

  // scores
  weeklyScore: { type: [ Score ], default: [] },
  monthlyScore: { type: [ Score ], default: [] },
  allTimeScore: { type: [ Score ], default: [] }
});

Game.index({ name: 1 });

module.exports = mongoose.model('Game', Game);