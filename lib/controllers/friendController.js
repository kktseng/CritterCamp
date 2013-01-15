var async = require('async'),
    helpers = require('../helpers'),
    friend = require('../friend'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'request') {
    async.parallel([
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), message.username),
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), username)
    ], function(err, request_users) {
      if(err) { return callback(err); }
      request_users[0].addFriendRequest(username, function(err) {
        if(err) { return callback(err); }
        var reply = { 'username': username, 'profile': request_users[1].profile }
        users.messageUser(request_users[0].username, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'accept') {
    async.parallel([
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), message.username),
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), username)
    ], function(err, add_users) {
      if(err) { return callback(err); }
      async.parallel([
        async.apply(add_users[0].addFriend.bind(add_users[0]), username);
        async.apply(add_users[1].addFriend.bind(add_users[1]), message.username);
      ], function(err) {
        if(err) { return callback(err); }
        var reply = { 'username': username, 'profile': add_users[1].profile}
        users.messageUser(add_users[0].username, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'remove') {
    
  }
}