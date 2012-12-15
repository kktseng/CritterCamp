var async = require('async'),
    helpers = require('../lib/helpers');

module.exports = function(app, basepath) {
  app.get(basepath, function(req, res) {
    res.send('Login page!');
  });

  app.post(basepath, function(req, res) {
    var username = req.param('username');
    var password = req.param('password');

    // verify username and password
    helpers.m.User.authenticate(username, password, function(err, auth_user) {
      if(err) { return res.send({ status: 'failure', message: err.message }) };
      // gather all relevant data to send back
      // friends
      // profile
      // news
      async.parallel([
        async.apply(helpers.m.News.findLatest),
        async.apply(auth_user.getFriendInfo.bind(auth_user)),
        async.apply(auth_user.getFriendRequestInfo.bind(auth_user))
      ], function(err, results) {
        if(err) { return res.send({ status: 'failure', message: err.message }) };
        // generate auth key for TCP connection
        var key = helpers.rand();
        helpers.redis.hset('auth', key, username);
        res.send({ status: 'success', news: results[0], friends: results[1], requests: results[2] });
      });
    });
  });

  app.get(basepath + '/create', function(req, res) {
    res.send('Trying to create a new account!');
  });

  app.post(basepath + '/create', function(req, res) {
    var username = req.param('username');

    // create account
    helpers.m.User.createUser(username, function(err, created_user, created_user_password) {
      if(err) { return res.send({ status: 'failure', message: err.message }) };
      res.send({ status: 'success', password: created_user_password });
    });
  });
};