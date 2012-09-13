var group = require('./group'),
    helpers = require('./helpers'),
    wsHandler = require('./wsHandler');

exports.joinGroup = function(conn_id, message, callback) {
  if(!message.game) {
    return wsHanlder.msgConn(conn_id, 'You need to specify a game stupid.');
  }
  group.findGroup([conn_id], message.game, function(err, group_id) {
    if(err) { callback(err); }
    helpers.redis.hset('conn_' + conn_id, 'group', group_id);
    callback(null, group_id);
  });
};

exports.joinParty = function(conn_id, message, callback) {
  // joining an existing party
  if(message.party_id) {
    
  }
};