// all global constants here

/**
* mapping of level to exp
*
* level 1: [0, 99]
* level 2: [100, 199]
* level 3: [200, 299]
* ...
* level 10: [900, 999]
* level 11: [1000, inf)
**/

exports.EXP_TO_LEVEL = [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000 ];

// upper limit of exp to gain before we deem fraudulent
exports.EXCESSIVE_EXP_THRESHOLD = 10000;

exports.EMAIL_REGEX = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
exports.MAX_USERNAME_LENGTH = 15;