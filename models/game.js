var async = require('async'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Score = new Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  time: { type: Date, default: Date.now }
});

var MAX_SCORE_LENGTH = 10;

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

/**
* checks score with current highscores
* callback(err, weekly_ranking, monthly_ranking, alltime_ranking)
**/
Game.methods.checkScore = function(score, callback) {
  var scoreCheck = function(scores, cb) {
    if(scores.length === 0) {
      return cb(null, [ score ]);
    } else if(score.length < MAX_SCORE_LENGTH) {
      scores.push(score);
      scores.sort();
    } else if(scores[scores.length - 1] < score) {
      scores[scores.length - 1] = score;
      scores.sort();
    }
    cb(null, scores);
  };
  async.parallel([
    async.apply(this.weeklyScore, scoreCheck),
    async.apply(this.monthlyScore, scoreCheck),
    async.apply(this.allTimeScore, scoreCheck)
  ], function(err, results) {
    if(err) { return callback(err); }
    this.weeklyScore = results[0];
    this.monthlyScore = results[1];
    this.allTimeScore = results[2];
    this.save(function(err) {
      callback(err, results[0].indexOf(score), results[1].indexOf(score), results[2].indexOf(score));
    });
  });
};

module.exports = mongoose.model('Game', Game);