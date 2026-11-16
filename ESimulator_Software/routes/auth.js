
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController')
const authMiddleware = require('../middleware/middlewareAuth');

// Signup
router.post('/signup/student',authController.signupStudent);
router.post('/signup/teacher',authController.signupTeacher);

//login
router.post('/login/student',authController.loginStudent);
router.post('/login/teacher',authController.loginTeacher);

router.get('/me', authMiddleware, authController.me);


module.exports = router;