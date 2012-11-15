module.exports = function(app, basepath) {
  app.get(basepath, function(req, res) {
    res.send('Login page!');
  });

  app.post(basepath, function(req, res) {
    var username = req.param('username');
    var password = req.param('password');

    //verify username and password
    helpers.m.User.authenticate(username, password, function(err, auth_user) {
      if(err) {
        res.send({ status: 'failure', message: err.message }); 
      }
      else {
        res.send({ status: 'success' });
      }
    })
  });

  app.get(basepath + '/create', function(req, res) {
    res.send('Trying to create a new account!');
  });

  app.post(basepath + '/create', function(req, res) {
    var username = req.param('username');
    var email = req.param('email');
    var password = req.param('password');

    //create account
    helpers.m.User.createUser(username, function(err, created_user, created_user_password) {
      if(err) {
        res.send({ status: 'failure', message: err.message });
      }
      else {
        res.send({ status: 'success', password: created_user_password });
      }
    })
  });
};