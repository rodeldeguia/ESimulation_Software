// models/questionFactory.js
const PrepositionQuiz       = require('./prepositionQuizModel');
const IrregularVerbQuiz     = require('./irregularVerbQuizModel');
const ClauseQuiz            = require('./clauseQiuzModel');
const SvaQuiz               = require('./svaQuizModel');
const PhrasalVerbQuiz       = require('./phrasalVerbModel');
const SentencePatternQuiz   = require('./sentencePatternQuizModel');

// Map quiz_type → model
const MODEL_MAP = {
  preposition:      PrepositionQuiz,
  irregular_verb:   IrregularVerbQuiz,
  clause:           ClauseQuiz,
  sva:              SvaQuiz,
  phrasal_verb:     PhrasalVerbQuiz,
  sentence_pattern: SentencePatternQuiz
};

module.exports = {
  getModel(quizType) {
    return MODEL_MAP[quizType] || null;
  }
};