var crypto = require('crypto'),
    express = require('express'),
    fs = require('fs'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    https = require('https'),
    helpers = require('./lib/helpers'),
    logger = require('./lib/logger'),
    net = require('net'),
    ws = require('websocket').server,
    connection = require('./lib/connection'),
    pubsub = require('./lib/pubsub'),
    path = require('path');

/*var app = express();

var privateKey = fs.readFileSync('privatekey.pem').toString();
var certificate = fs.readFileSync('certificate.pem').toString();

var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};

app.configure(function() {
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
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

helpers.initModels();

app.get('/', routes.index);
app.get('/users', user.list);

var server = https.createServer(options, app).listen(app.get('port'), function() {
  logger.info('Server listening on port ' + app.get('port'));
});

// temporary non https server
var server2 = http.createServer(app).listen(8000, function() {
  logger.info('Server2 listening on port 8000');
});

// set up websockets
wsServer = new ws({
  httpServer: server,
  autoAcceptConnections: false 
});

wsServer.on('request', connection.request);

// temporary non wss server
wsServer2 = new ws({
  httpServer: server2,
  autoAcceptConnections: false
});

wsServer2.on('request', connection.request);
*/
helpers.initModels();
net.createServer(connection.request).listen(8000, function() {
  logger.info('Server listening on port 8000.');
});