/*
 * GET metrics dashboard.
 */

module.exports = function(app, basePath) {
  basePath = basePath || '/metrics';

  app.get(basePath + '/metrics', function(req, res) {
    res.render('metrics', { title: 'Express' });
  });
}