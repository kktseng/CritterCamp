// All global constants here

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

var exp_to_level = exports.exp_to_level = [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000 ];

/**
* upper limit of exp to gain before we deem fraudulent
*
**/

var excessive_exp_threshold = exports.excessive_exp_threshold = 10000;