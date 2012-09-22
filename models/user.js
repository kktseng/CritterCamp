var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var User = new Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  salt: { type: String },
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  moneySpent: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 },
  friends: [ { type: ObjectId, ref: 'User' } ]
  gold: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', User);