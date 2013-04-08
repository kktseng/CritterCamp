var async = require('async'),
    globals = require('../lib/globals'),
    users = require('../lib/users'),
    helpers = require('../lib/helpers');

module.exports = function(app, basepath) {
  app.get(basepath + '/dailystat', function(req, res) {
    //var days = req.param('days');
    //var game = req.param('game');

    var data = [];
    var datapoint = [];
    var date;
    var goldSpent;
    helpers.m.DailyStat.find({}, {}, function(err, results) {
      results.forEach(function(result) {
        datapoint = [];
        datapoint.push(result.date.valueOf());
        datapoint.push(result.goldSpent);
        data.push(datapoint);
      });

      res.send(JSON.stringify(data));
    });
  });

  app.get(basepath + '/hourlystat', function(req, res) {
    res.send('Trying to create a new account!');
  });

};