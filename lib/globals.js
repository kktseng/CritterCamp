// all global constants here

/**
* mapping of level to exp
*
* level 1: [0, 9999]
* level 2: [10000, 19999]
* level 3: [20000, 29999]
* ...
* level 10: [90000, 99999]
* level 11: [100000, inf)
**/

exports.EXP_TO_LEVEL = [ 0, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000 ];

// upper limit of exp to gain before we deem fraudulent
exports.EXCESSIVE_EXP_THRESHOLD = 1000000;

exports.EMAIL_REGEX = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
exports.MAX_USERNAME_LENGTH = 15;

exports.MAX_PARTY_SIZE = 1;

// maximum number of leaders on the leaderboard
exports.MAX_LEADERS = 10;

// redis keys expire in one day
exports.REDIS_TIMEOUT = 60*60*24;

// minimum version such that user does not have to update
exports.MIN_VERSION = 0;

// number of games to vote on
exports.VOTE_GAMES = 3;

// max length of a score before we cut off
exports.MAX_SCORE_LENGTH = 10;