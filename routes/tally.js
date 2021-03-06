var express = require('express');
var router = express.Router({mergeParams: true});

var control = require('../controllers/urlController');
router.use(control.name);

// Change / to settings
router.get(['/', '/director'], function(req, res, next) {
  res.render('director', { pageTitle: 'Director Page' });
});
router.get('/settings', function(req, res, next) {
  res.render('settings', { pageTitle: 'Settings Page' });
});
router.get('/:id', control.camera);


module.exports = router;