// routes/teacherAnalytics.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/teacherAnalyticsController');
const auth    = require('../middleware/middlewareAuth');
const settingsController = require('../controllers/settingsController');

router.use(auth);
router.put('/settings/profile', settingsController.updateProfile);
router.put('/settings/password', settingsController.changePassword);

router.get('/overview',       ctrl.getOverview);
router.get('/students',       ctrl.getAllStudents);
router.get('/students/:id',   ctrl.getStudentDetail);

router.get('/class-analytics', ctrl.getClassAnalytics);

module.exports = router;