var helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var HourlyStat = new Schema({
  date: { type: Date, default: Date.now },
  numConnections: { type: Number, default: 0 }
});

module.exports = mongoose.model('HourlyStat', HourlyStat);