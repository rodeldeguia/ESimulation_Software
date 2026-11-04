const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authMiddleware = require('../middleware/middlewareAuth');

router.use(authMiddleware);

router.get('/', lessonController.list);
router.get('/:id', lessonController.getOne);
router.put('/:id', lessonController.update);
router.get('/:id/quizzes', lessonController.getQuizzes);
router.post('/', lessonController.create);

module.exports = router;