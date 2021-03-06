var crypto = require('crypto'),
    express = require('express'),
    fs = require('fs'),
    routes = require('./routes'),
    http = require('http'),
    https = require('https'),
    helpers = require('./lib/helpers'),
    logger = require('./lib/logger'),
    net = require('net'),
    connection = require('./lib/connection'),
    pubsub = require('./lib/pubsub'),
    path = require('path');

var app = express();

// parses bundle for SSL Certification chain
var ca = [];
var chain = fs.readFileSync('./certs/www.thepigmaster.com.ca-bundle', 'utf8');
chain = chain.split('\n');
var cert = [];
for(var line in chain) {
  cert.push(line);
  if(line.match()) {
    ca.push(cert.join('\n'));
    cert = [];
  }
}

var options = {
  ca: fs.readFileSync('./certs/www.thepigmaster.com.ca-bundle'),
  key: fs.readFileSync('./certs/www.thepigmaster.com.key'),
  cert: fs.readFileSync('./certs/www.thepigmaster.com.crt')
};

app.configure(function() {
  app.set('port', process.env.PORT || 443);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  //app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.configure('production', function() {

});

// REMOVE THIS LATER IN FAVOR OF DOMAINS. THIS IS A BAD WAY TO HANDLE ERRORS!!!
process.on('uncaughtException', function(err) {
  logger.info('Uncaught exception: ' + err.stack);
});

helpers.initModels();

require('./routes/login')(app, '/login');
require('./routes/metrics')(app, '/metrics');
require('./routes/chart')(app, '/chart');

// set up TCP server
net.createServer(connection.request).listen(8000, function() {
  logger.info('TCP server listening on port 8000.');
});

app.get('/', routes.index);

var server = https.createServer(options, app).listen(app.get('port'), function() {
  logger.info('HTTPS server listening on port ' + app.get('port'));
});

// temporary non https server
var server2 = http.createServer(app).listen(80, function() {
  logger.info('HTTP server listening on port 80');
});

helpers.redis.flushdb(function() {
  logger.info('Redis reset completed')
});

setInterval(function() {
  logger.info('Refreshed mongo connection');
  helpers.m.User.findOne();
}, 1000*60*60);
