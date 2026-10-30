const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/middlewareAuth');

router.use(auth);

router.get('/:id',quizController.getForStudent);
router.post('/:id/submit', quizController.submit)

module.exports = router;