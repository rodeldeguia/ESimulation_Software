// routes/admin.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const auth    = require('../middleware/middlewareAuth');

router.use(auth);

// Overview
router.get('/overview', ctrl.getOverview);

// Teachers
router.get('/teachers',                        ctrl.getAllTeachers);
router.patch('/teachers/:id/active',           ctrl.toggleTeacherActive);
router.patch('/teachers/:id/role',             ctrl.changeTeacherRole);

// Students
router.get('/students',                        ctrl.getAllStudents);
router.patch('/students/:id/active',           ctrl.toggleStudentActive);

// Lesson approval
router.get('/lessons/pending',                 ctrl.getPendingLessons);
router.patch('/lessons/:id/approve',           ctrl.approveLesson);
router.patch('/lessons/:id/reject',            ctrl.rejectLesson);

// Activity logs
router.get('/logs',                            ctrl.getActivityLogs);

module.exports = router;