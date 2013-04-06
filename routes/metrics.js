/*
 * GET metrics dashboard.
 */

module.exports = function(app, basePath) {
  basePath = basePath || '/metrics';

  app.get(basePath, function(req, res) {
    res.render('metrics', { title: 'Express' });
  });
}