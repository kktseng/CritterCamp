var helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var News = new Schema({
  date: { type: Date, default: Date.now },
  post: { type: String, required: true }
});

News.index({ date: -1 });

News.statics.findLatest = function(num_return, callback) {
  if(typeof(num_return) == 'function') {
    callback = num_return;
    num_return = 10;
  }
  helpers.m.News.find({}, { date: 1, post: 1 }).sort({ date: -1 }).limit(num_return).exec(callback);
};

module.exports = mongoose.model('News', News);