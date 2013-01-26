var async = require('async'),
    users = require('../lib/users'),
    factory = require('./factory'),
    helpers = require('../lib/helpers'),
    should = require('should');

describe('Score System', function() {
  var user;

  beforeEach(function(done) {
    factory.user(function(err, new_user) {
      if(err) { return done(err); }
      user = new_user;
      done();
    });
  });

  it('can set exp and level correctly', function(done) {
    users.setExp(user.username, 999, function(err) {
      user.exp.should.equal(999);
      user.level.should.equal(9990);
    })
  });
});