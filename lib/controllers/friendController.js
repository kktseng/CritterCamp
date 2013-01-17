var async = require('async'),
    helpers = require('../helpers'),
    friend = require('../friend'),
    users = require('../users');

module.exports = function(username, message, callback) {
  if(message.type == 'request') {
    async.parallel([
      // gets both of the user objects involved
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), message.username),
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), username)
    ], function(err, request_users) {
      if(err) { return callback(err); }
      // add the friend request to the appropriate user object
      request_users[0].addFriendRequest(username, function(err) {
        if(err) { return callback(err); }
        // message other user to notify of friend request
        var reply = { 'action': friend, 'type': request, 'username': username, 'profile': request_users[1].profile };
        users.messageUser(request_users[0].username, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'accept') {
    async.parallel([
      // gets both of the user objects involved
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), message.username),
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), username)
    ], function(err, add_users) {
      if(err) { return callback(err); }
      async.parallel([
        // add friends to both users' friend lists
        async.apply(add_users[0].addFriend.bind(add_users[0]), username),
        async.apply(add_users[1].addFriend.bind(add_users[1]), message.username)
      ], function(err) {
        if(err) { return callback(err); }
        //message other user to notify of friend accept
        var reply = { 'action': friend, 'type': accept, 'username': username, 'profile': add_users[1].profile };
        users.messageUser(add_users[0].username, JSON.stringify(reply), callback);
      });
    });
  } else if(message.type == 'remove') {
    aysnc.parallel([ 
      // gets both of the user objects involved
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), message.username),
      async.apply(helpers.m.User.getUser.bind(helpers.m.User), username)
    ], function(err, remove_users) {
      if (err) { return callback(err); }
      async.parallel([
        //remove friends from both users' friend lists
        async.apply(remove_users[0].removeFriend.bind(remove_users[0]), username),
        async.apply(remove_users[1].removeFriend.bind(remove_users[1]), message.username)
      ], function(err) {
        if(err) { return callback(err); }
        //message other user to notify of friend removal
        var reply = { 'action': friend, 'type': remove, 'username': username };
        users.messageUser(add_users[0].username, JSON.stringify(reply), callback);
      });
    });
  }
}