var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Achievement = new Schema({
  game: { type: ObjectId, ref: 'Game', required: true },
  name: { type: String, required: true }
  // TODO: lookup hashtables in mongoose
});

Achievement.index({ game: 1 });

module.exports = mongoose.model('Achievement', Achievement);