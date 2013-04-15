var async = require('async'),
    globals = require('../lib/globals'),
    users = require('../lib/users'),
    helpers = require('../lib/helpers');

module.exports = function(app, basepath) {
  app.get(basepath, function(req, res) {
    res.send('Login page!');
  });

  app.post(basepath, function(req, res) {
    var username = req.param('username');
    var password = req.param('password');
    var version = req.param('version');

    if(!username || !password) {
      res.send({ status: 'failure', message: 'You require a username and password.'});
    }

    if(version < globals.MIN_VERSION) {
      res.send({ status: 'failure', message: 'Please update your game to a newer version.'});
    }
    // verify username and password
    helpers.m.User.authenticate(username, password, function(err, auth_user) {
      if(err) { return res.send({ status: 'failure', message: err.message }) };
      // generate auth key for TCP connection
      var key = helpers.rand();

      async.parallel([
        async.apply(helpers.m.News.findLatest),
        async.apply(auth_user.getFriendNames.bind(auth_user)),
        async.apply(auth_user.getFriendRequestNames.bind(auth_user)),
        async.apply(users.getRank, auth_user.username),
        async.apply(helpers.redis.hset.bind(helpers.redis), 'auth', key, username),
        async.apply(helpers.redis.hset.bind(helpers.redis), 'user_' + username, 'version', version)
      ], function(err, results) {
        if(err) { return res.send({ status: 'failure', message: err.message }) };
        res.send({
          status: 'success',
          message: 'Login Successful!',
          news: results[0], 
          friends: results[1], 
          requests: results[2],
          rank: results[3].rank,
          level: auth_user.level, 
          reply.curr_lvl_exp = globals.EXP_TO_LEVEL[auth_user.level - 1],
          reply.next_lvl_exp = globals.EXP_TO_LEVEL[auth_user.level],
          reply.exp = auth_user.exp,
          auth: key 
        });
      });
    });
  });

  app.get(basepath + '/create', function(req, res) {
    res.send('Trying to create a new account!');
  });

  app.post(basepath + '/create', function(req, res) {
    var username = req.param('username');
    var password = req.param('password');

    // create account
    helpers.m.User.createUser(username, password, function(err, created_user, created_user_password) {
      if(err) { return res.send({ status: 'failure', message: err.message }) };
      res.send({ status: 'success', message: 'User successfully created!', password: created_user_password });
    });
  });
};