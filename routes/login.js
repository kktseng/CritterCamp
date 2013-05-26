var async = require('async'),
    connection = require('../lib/connection')
    globals = require('../lib/globals'),
    users = require('../lib/users'),
    helpers = require('../lib/helpers'),
    logger = require('../lib/logger');

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

      var login = function() {
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
            profile: auth_user.profile,
            unlocked: auth_user.unlockedProfiles,
            level: auth_user.level, 
            curr_lvl_exp: globals.EXP_TO_LEVEL[auth_user.level - 1],
            next_lvl_exp: globals.EXP_TO_LEVEL[auth_user.level],
            exp: auth_user.exp,
            auth: key 
          });
        });
      }

      // check if user already has a connection
      helpers.redis.hget('user_' + username, 'conn', function(err, old_conn_id) {
        if(err) { return logger.error(err); }
        if(!old_conn_id) { return login(); }
        // wipe any existing user data
        async.waterfall([
          async.apply(connection.endConn, username),
          async.apply(party.removeFromParty, username),
          function(party_id, callback) {
            group.removeFromGroup(username, callback);
          },
          function getGroupLen(group_id, callback) {
            if(!group_id) { return callback(null, group_id, -1); }
            helpers.redis.llen('group_' + group_id, function(err, len) {
              callback(err, group_id, len);
            });
          },
          function removeStaleGroup(group_id, group_len, callback) {
            if(group_len != 0) {
              return callback(null);
            }
            helpers.redis.hget('user_' + username, 'version', function(err, version) {
              if(err) { return callback(err); }
              helpers.redis.lrem('queue_' + version, 0, group_id, callback);
            });
          }
        ], function(err) {
          if(err) { logger.error(err); }
          login();
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