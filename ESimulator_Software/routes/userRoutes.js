// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/middlewareAuth');

router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.upload.single('profile_picture'), userController.updateProfile);

module.exports = router;