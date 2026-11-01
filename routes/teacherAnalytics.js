// routes/teacherAnalytics.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/teacherAnalyticsController');
const auth    = require('../middleware/middlewareAuth');

router.use(auth);

router.get('/overview',       ctrl.getOverview);
router.get('/students',       ctrl.getAllStudents);
router.get('/students/:id',   ctrl.getStudentDetail);

module.exports = router;