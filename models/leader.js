var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Leader = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  rank: { type: Number, required: true }
});

module.exports = mongoose.model('Leader', Leader);