var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var UserStat = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  game: { type: String, required: true },
  stat: { type: String, required: true },
  value: { type: String, required: true }
});

UserStat.index({ user: 1, game: 1 });

module.exports = mongoose.model('UserStat', UserStat);