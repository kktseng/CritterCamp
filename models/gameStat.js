var helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var GameStat = new Schema({
  game: { type: String, required: true },
  date: { type: Date, default: Date.now },
  totalPlays: { type: Number, default: 0 },
  uniqueUsers: { type: Number, default: 0 }
});

module.exports = mongoose.model('GameStat', GameStat);