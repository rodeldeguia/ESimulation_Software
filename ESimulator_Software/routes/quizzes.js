const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/middlewareAuth');

router.use(auth);

// ─── SPECIFIC ROUTES (MUST BE BEFORE /:id) ───
router.get('/dictionary', quizController.getDictionary);
router.post('/suggest-word', quizController.suggestWord);
router.post('/check-inline', quizController.checkInlineAnswer);
router.post('/embed', quizController.createEmbeddedQuiz);
router.get('/final-list', auth, quizController.listFinalQuizzesForStudent);

// Admin approvals (Specific)
router.get('/suggestions', quizController.getSuggestions);
router.post('/suggestions/:id/approve', quizController.approveSuggestion);

// ─── TEACHER ROUTES ───
router.get('/',           quizController.listTeacherQuizzes);
router.post('/',          quizController.createQuiz);

router.post('/suggestions/:id/approve', quizController.approveSuggestion);
router.post('/suggestions/:id/reject', quizController.rejectSuggestion); // <-- Add this

// ─── WILDCARD ROUTES (MUST BE LAST) ───
router.get('/:id', quizController.getForStudent); 
router.post('/:id/submit', quizController.submit);
router.get('/:id/edit',   quizController.getQuizForEditing);
router.post('/:id/questions', quizController.addQuestion);
router.post('/:id/publish',   quizController.publishQuiz);
router.put('/:id/settings', quizController.updateQuizSettings);
router.delete('/:id/questions/:questionId', quizController.deleteQuestion);
router.put('/:id/questions/:questionId', quizController.updateQuestion);
router.delete('/:id', quizController.deleteQuiz);
router.get('/:id/questions', quizController.getQuizQuestions);
router.post('/:id/test-submit', quizController.testSubmit);
module.exports = router;