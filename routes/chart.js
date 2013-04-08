var async = require('async'),
    globals = require('../lib/globals'),
    users = require('../lib/users'),
    helpers = require('../lib/helpers');

module.exports = function(app, basepath) {
  app.get(basepath + '/dailystat', function(req, res) {
    var metric = req.param('metric');

    var data = [];
    var datapoint = [];

    helpers.m.DailyStat.find({}, function(err, results) {
      results.forEach(function(result) {
        datapoint = [];
        datapoint.push(result.date.valueOf());
        datapoint.push(result[metric]);
        data.push(datapoint);
      });

      res.send(JSON.stringify(data));
    });
  });

  app.get(basepath + '/gamestat', function(req, res) {
    var metric = req.param('metric');
    var game = req.param('game');

    var data = [];
    var datapoint = [];

    helpers.m.GameStat.find({ name: game }, function(err, results) {
      if(err) { return console.warn(err); }
      results.forEach(function(result) {
        datapoint = [];
        datapoint.push(result.date.valueOf());
        datapoint.push(result[metric]);
        data.push(datapoint);
      });

      res.send(JSON.stringify(data));
    });
  });

  app.get(basepath + '/hourlystat', function(req, res) {
    var metric = req.param('metric');

    var data = [];
    var datapoint = [];

    helpers.m.HourlyStat.find({}, function(err, results) {
      if(err) { return console.warn(err); }
      results.forEach(function(result) {
        datapoint = [];
        datapoint.push(result.date.valueOf());
        datapoint.push(result[metric]);
        data.push(datapoint);
      });

      res.send(JSON.stringify(data));
    });
  });

};