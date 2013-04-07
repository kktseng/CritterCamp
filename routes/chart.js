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
      console.log('results' + results);
      results.forEach(function(result) {
        datapoint = [];
        Object.keys(result).forEach(function(key) {
          if(key === 'date') {
            date = results[key];
          } else if (key === 'goldSpent') {
            goldSpent = results[key];
          }
        });
        datapoint.push(date);
        datapoint.push(goldSpent);
        data.push(datapoint);
      });
    });

    res.send(JSON.stringify(data));
  });

  app.get(basepath + '/hourlystat', function(req, res) {
    res.send('Trying to create a new account!');
  });

};