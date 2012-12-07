var async = require('async'),
    bcrypt = require('bcrypt'),
    helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    sha1 = require('crypto').createHash('sha1'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    users = require('../lib/users');

var User = new Schema({
  username: { type: String, required: true },
  password: { type: String },
  email: { type: String },
  profile: { type: String },

  friends: [ { type: ObjectId, ref: 'User' } ],
  friendRequests: [ { type: ObjectId, ref: 'User' } ],
  achievements: [ { type: ObjectId, ref: 'Achievement' } ],
  gold: { type: Number, default: 0 },

  // metrics
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  moneySpent: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 }
});

var EMAIL_REGEX = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
var MAX_USERNAME_LENGTH = 15;

/**
* checks if username matches set criteria
* does NOT check for existing users
**/
function invalidUsername(username) {
  if(username.search(/[^A-Za-z0-9]/) !== -1) {
    return new Error('Usernames may only contain letters and numbers: ' + username);
  } else if (username.length > MAX_USERNAME_LENGTH) {
    return new Error('Usernames may only be up to ' + MAX_USERNAME_LENGTH + ' characters long: ' + username);
  } else return null;
}

/**
* hashes a password and stores it in the user model
*
* callback(err)
**/
User.methods.hashPassword = function(password, callback) {
  var encrypted = hashPassword(password);
  this.password = encrypted;
  this.save(callback);
};

/**
* adds a friend to user's friends list
*
* callback(err)
**/
User.methods.addFriend = function(username, callback) {
  var self = this;
  helpers.m.User.getId(username, function(err, id) {
    if(err) { return callback(err); }
    if(!id) {
      return callback(new Error('No id found for username ' + username));
    } else if(self.friends.indexOf(id) > -1) {
      return callback(new Error('User ' + username + ' already in friends list'));
    }
    self.friends.push(id);
    self.save(callback);
  });
};

/**
* adds a friend request to user's friend request list
*
* callback(err)
**/
User.methods.addFriendRequest = function(username, callback) {
  var self = this;
  helpers.m.User.getId(username, function(err, id) {
    if(err) { return callback(err); }
    if(!id) {
      return callback(new Error('No id found for username ' + username));
    } else if(self.friendRequests.indexOf(id) > -1) {
      return callback(new Error('User ' + username + ' already in friend requests list'));
    }
    self.friendRequests.push(id);
    self.save(callback);
  });
}

/**
* removes a friend from user's friends list
*
* callback(err)
**/
User.methods.removeFriend = function(username, callback) {
  var self = this;
  helpers.m.User.getId(username, function(err, id) {
    if(err) { return callback(err); }
    if(!id) {
      return callback(new Error('No id found for username ' + username));
    } else if(self.friends.indexOf(id) < 0) {
      return callback(new Error('User ' + username + 'not on friends list'));
    }
    self.friends.splice(self.friends.indexOf(id), 1);
    self.save(callback);
  });
};

/**
* removes a friend request from user's friend request list
*
* callback(err)
**/
User.methods.removeFriendRequest = function(username, callback) {
  var self = this;
  helpers.m.User.getId(username, function(err, id) {
    if(err) { return callback(err); }
    if(!id) {
      return callback(new Error('No id found for username ' + username));
    } else if(self.friendRequests.indexOf(id) < 0) {
      return callback(new Error('User ' + username + 'not on friend requests list'));
    }
    self.friendRequests.splice(self.friendRequests.indexOf(id), 1);
    self.save(callback);
  });
};

///////////////////////////////////--------------------
/// WE CAN PROBABLY REMOVE THIS ONCE SETSTATUS IS FINISHED
/**
* gets a list of all the user's friends
*
* callback(err, list)
**/
User.methods.getFriendNames = function(callback) {
  async.map(this.friends, helpers.m.User.getUsername, callback);
};
/////////////////////////////////////////////////////////

/**
* gets a list of all the information of the user's friends
*
* callback(err, list)
**/
User.methods.getFriendInfo = function(callback) {
  async.parallel([
    async.apply(async.map, this.friends, helpers.m.User.getUsername),
    async.apply(async.map, this.friends, helpers.m.User.getUserInfo)
  ], function(err, results) {
    if(err) { return callback(err); }
    // find statuses of all friends
    async.map(results[0], users.getStatus, function(err, status) {
      if(err) { return callback(err); }
      for(var i = 0; i < status.length; i++) {
        results[1][i].status = status[i];
      }
      callback(null, results[1]);
    });
  });
};

/**
* gets a list of all the information of the user's friend requests
*
* callback(err, list)
**/
User.methods.getFriendRequestInfo = function(callback) {
  async.map(this.friendRequests, helpers.m.User.getUserInfo, callback);
};

/**
* creates a user based on username and set password to hash of current time
*
* callback(err, user)
**/
User.statics.createUser = function(username, callback) {
  if(invalidUsername(username)) {
    return callback(invalidUsername(username));
  }
  helpers.m.User.findOne({ username: username }, function(err, results) {
    if(err) { return callback(err); }
    if(results) {
      return callback(new Error('Username ' + username + ' already exists'));
    } else {
      var current_time = (new Date()).toString();
      var password = sha1.update(current_time).digest('hex');
      var encrypted = helpers.m.User.hashPassword(password);
      var user = new helpers.m.User({ username: username , password: encrypted });
      user.save( function(err, user_object) { 
        return callback(err, user_object, password); 
      });
    }
  });
};

/**
* validates new user information and stores the new user in mongo
*
* callback(err, user)
**/
User.statics.createUserAccount = function(username, email, password, callback) {
  if(invalidUsername(username)) {
    return callback(invalidUsername(username));
  }
  async.parallel([
    async.apply(helpers.m.User.findOne.bind(helpers.m.User), { username: username }),
    async.apply(helpers.m.User.findOne.bind(helpers.m.User), { email: email })
  ], function(err, results) {
    if(err) { return callback(err); }
    if(results[0]) {
      return callback(new Error('Username ' + username + ' already exists'));
    } else if(results[1]) {
      return callback(new Error('Email ' + email + ' already in use'));
    } else {
      var encrypted = helpers.m.User.hashPassword(password);
      var user = new helpers.m.User({ username: username, email: email, password: encrypted });
      user.save(callback);
    }
  });
};

/**
* authenticates the username/email password combination
*
* callback(err, user)
**/
User.statics.authenticate = function(username, password, callback) {
  var criteria = {};
  if(username.indexOf('@') >= 0) {
    criteria.email = username;
  } else {
    criteria.username = username;
  }
  helpers.m.User.findOne(criteria, function(err, user) {
    if(err) { return callback(err); }
    if(!user) {
      return callback(new Error('User ' + username + ' not found'));
    }
    if(bcrypt.compareSync(password, user.password)) {
      return callback(null, user);
    }
    callback(new Error('Invalid password'));
  });
};

var hashPassword = User.statics.hashPassword = function(password) {
  return bcrypt.hashSync(password, 12);
};

/**
* gets a username based off an id
*
* callback(err, username)
**/
User.statics.getUsername = function(id, cb) {
  helpers.m.User.findOne({ _id: id }, { username: true }, function(err, results) {
    if(results) {
      return cb(err, results.username);
    } else {
      return cb(err, null);
    }
  });
};

/**
* gets a username and profile based off an id
*
* callback(err, {username: username, profile: profile_photo} )
**/
User.statics.getUserInfo = function(id, cb) {
  helpers.m.User.findOne({ _id: id }, { username: true, profile: true }, function(err, results) {
    if(results) {
      return cb(err, { username: results.username, profile: results.profile } );
    } else {
      return cb(err, null);
    }
  });
};

/**
* gets an id based off a username
*
* callback(err, id)
**/
User.statics.getId = function(username, cb) {
  helpers.m.User.findOne({ username: username }, { _id: true }, function(err, results) {
    if(results) {
      return cb(err, results._id);
    } else {
      return cb(err, null);
    }
  });
};

module.exports = mongoose.model('User', User);