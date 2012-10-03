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

function scoreSort(a, b) {
  return a.score <= b.score;
}

/**
* checks score with current highscores
*
* callback(err, weekly_ranking, monthly_ranking, alltime_ranking)
**/
Game.methods.checkScore = function(user, score, callback) {
  var self = this;
  score = { user: user, score: score};
  var scoreCheck = function(scores, cb) {
    scores = scores.slice();
    if(scores.length === 0) {
      return cb(null, [ score ]);
    } else if(scores.length < MAX_SCORE_LENGTH) {
      scores.push(score);
      scores.sort(scoreSort);
    } else if(scores[0].score < score.score) {
      scores[0] = score;
      scores.sort(scoreSort);
    }
    cb(null, scores);
  };
  async.parallel([
    async.apply(scoreCheck, this.weeklyScore),
    async.apply(scoreCheck, this.monthlyScore),
    async.apply(scoreCheck, this.allTimeScore)
  ], function(err, results) {
    if(err) { return callback(err); }
    self.weeklyScore = results[0];
    self.monthlyScore = results[1];
    self.allTimeScore = results[2];
    self.save(function(err) {
      callback(err, results[0].indexOf(score) + 1, results[1].indexOf(score) + 1, results[2].indexOf(score) + 1);
    });
  });
};

module.exports = mongoose.model('Game', Game);