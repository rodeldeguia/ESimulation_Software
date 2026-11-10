const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/middlewareAuth');

router.use(auth);
// student route
router.get('/:id',quizController.getForStudent);
router.post('/:id/submit', quizController.submit)

// ─── Teacher routes (role checked in controller) ───
router.get('/',           quizController.listTeacherQuizzes);
router.post('/',          quizController.createQuiz);
router.get('/:id/edit',   quizController.getQuizForEditing);
router.post('/:id/questions', quizController.addQuestion);
router.post('/:id/publish',   quizController.publishQuiz);
// Embedded quiz creation
router.post('/embed', quizController.createEmbeddedQuiz);
// Add this at the top of your routes
router.post('/check-inline', quizController.checkInlineAnswer);

router.put('/:id/settings', quizController.updateQuizSettings);

module.exports = router;