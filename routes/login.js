module.exports = function(app, basepath) {
  app.get(basepath + '/alex', function(req, res) {
    res.send('is gay');
  });
};