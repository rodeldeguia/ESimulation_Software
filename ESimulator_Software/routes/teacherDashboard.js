// routes/teacherDashboard.js
const express = require('express');
const router = express.Router();
const teacherCtrl = require('../controllers/teacherDashboardController');
const auth = require('../middleware/middlewareAuth');

router.use(auth);

router.get('/stats', teacherCtrl.getStats);
router.get('/recent-activity', teacherCtrl.getRecentActivity);
router.get('/class-progress', teacherCtrl.getClassProgress);   // <--- NEW
router.get('/lesson-stats', teacherCtrl.getLessonStats);       // <--- NEW

module.exports = router;