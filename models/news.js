var helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var News = new Schema({
  date: { type: Date, default: Date.now },
  post: { type: String, required: true }
});

News.index({ date: 1 });

News.statics.findLatest = function(number_to_return, callback) {
  number_to_return = number_to_return || 10;
  helpers.m.News.find().sort({ date: 1 }).limit(number_to_return).exec(callback);
};

module.exports = mongoose.model('News', News);