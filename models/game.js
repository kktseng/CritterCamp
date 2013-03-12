var async = require('async'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Score = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  time: { type: Date, default: Date.now }
});

var Game = new Schema({
  name: { type: String, required: true },
  minVersion: { type: String, require: true }
});

Game.index({ name: 1 });

function scoreSort(a, b) {
  return a.score <= b.score;
}

module.exports = mongoose.model('Game', Game);