// routes/analytics.js
const express  = require('express');
const router   = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth= require('../middleware/middlewareAuth');

router.use(auth);

router.get('/me', analyticsController.getMyDashboard);

module.exports = router;