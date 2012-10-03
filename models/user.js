var async = require('async'),
    bcrypt = require('bcrypt'),
    helpers = require('../lib/helpers'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var User = new Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  dateCreated: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 },
  moneySpent: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 },
  friends: [ { type: ObjectId, ref: 'User' } ],
  achievements: [ { type: ObjectId, ref: 'Achievement' } ],
  gold: { type: Number, default: 0 }
});

/**
* hashes a password and stores it in the user model
*
* callback(err)
**/
User.methods.hashPassword = function(password, callback) {
  var self = this;
  async.waterfall([
    async.apply(bcrypt.hash, password, 10),
    function store(encrypted, cb) {
      self.password = encrypted;
      self.save(cb);
    }
  ], callback);
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
* gets a list of all the user's friends
*
* callback(err, list)
**/
User.methods.getFriendNames = function(callback) {
  async.map(this.friends, helpers.m.User.getUsername, callback);
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