var async = require('async'),
    bcrypt = require('bcrypt'),
    helpers = require('../lib/helpers'),
    globals = require('../lib/globals'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    users = require('../lib/users');

var User = new Schema({
  username: { type: String, required: true },
  password: { type: String },
  email: { type: String },
  profile: { type: String, default: 'pig' },
  unlockedProfiles: { type: [{ type: String }], default: globals.DEFAULT_PROFILES },

  friends: [{ type: ObjectId, ref: 'User' }],
  friendRequests: [{ type: ObjectId, ref: 'User' }],
  achievements: [{ type: ObjectId, ref: 'Achievement' }],
  gold: { type: Number, default: 0 },
  exp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },

  // metrics
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  moneySpent: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 }
});

User.index({ level: -1 });

/**
* checks if username matches set criteria
* does NOT check for existing users
**/
function invalidUsername(username) {
  if(username.search(/[^A-Za-z0-9]/) !== -1) {
    return new Error('Usernames may only contain letters and numbers: ' + username) + '.';
  } else if (username.length > globals.MAX_USERNAME_LENGTH) {
    return new Error('Usernames may only be up to ' + globals.MAX_USERNAME_LENGTH + ' characters long: ' + username + '.');
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
* gets user information relevant for profiles
*
**/
User.methods.getUserInfo = function() {
  return { username: results.username, profile: results.profile, level: results.level };
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
      return callback(new Error('User ' + username + ' already in friends list.'));
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
      return callback(new Error('User ' + username + ' already in friend requests list.'));
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
      return callback(new Error('No id found for username ' + username + '.'));
    } else if(self.friends.indexOf(id) < 0) {
      return callback(new Error('User ' + username + 'not on friends list.'));
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
      return callback(new Error('No id found for username ' + username + '.'));
    } else if(self.friendRequests.indexOf(id) < 0) {
      return callback(new Error('User ' + username + 'not on friend requests list.'));
    }
    self.friendRequests.splice(self.friendRequests.indexOf(id), 1);
    self.save(callback);
  });
};

/**
* gets a list of all the user's friends
*
* callback(err, list)
**/
User.methods.getFriendNames = function(callback) {
  async.map(this.friends, helpers.m.User.getUsername, callback);
};

/**
* gets a list of all the user's friend requests
*
* callback(err, list)
**/
User.methods.getFriendRequestNames = function(callback) {
  async.map(this.friendRequests, helpers.m.User.getUsername, callback);
};

/**
* returns the percentage a user is to the next level (synchronous function)
*
*/
User.methods.getPercentNextLevel = function() {
  var self = this;
  var exp_next_level = globals.EXP_TO_LEVEL[self.level];
  var exp_this_level = globals.EXP_TO_LEVEL[self.level - 1];
  return Math.floor((self.exp - exp_this_level) / (exp_next_level - exp_this_level) * 100);
};

/**
* creates a user based on username and set password to hash of current time if no password is provided
*
* callback(err, user)
**/
User.statics.createUser = function(username, password, callback) {
  if(invalidUsername(username)) {
    return callback(invalidUsername(username));
  }
  helpers.m.User.findOne({ username: username }, function(err, results) {
    if(err) { return callback(err); }
    if(results) {
      return callback(new Error('Username ' + username + ' already exists.'));
    } else {
      password = password || helpers.rand();
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
      return callback(new Error('Username ' + username + ' already exists.'));
    } else if(results[1]) {
      return callback(new Error('Email ' + email + ' already in use.'));
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
      return callback(new Error('Invalid username or password.'));
    }
    if(bcrypt.compareSync(password, user.password)) {
      user.loginCount++;
      user.lastLogin = Date.now();
      user.save(function(err) {
        // ignore err; don't want metrics err to affect authentication
        return callback(null, user);
      });
    }
    else {
      callback(new Error('Invalid username or password.'));
    }
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
* gets ids from a level
*
* callback(err, [{ _id: user_1_id }, { _id: user_2_id }, ... ])
**/
User.statics.getIdFromLevel = function(level, cb) {
  helpers.m.User.find({ level: level }, { _id: true }, cb);
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

/**
* returns a user object from a username
*
* callback(err, user)
**/
User.statics.getUser = function(username, cb) {
  helpers.m.User.findOne({ username: username }, {}, cb);
};

module.exports = mongoose.model('User', User);