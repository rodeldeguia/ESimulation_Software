// models/phrasalVerbQuizModel.js
const pool = require('../config/db');

module.exports = {

  async findByQuiz(quizId) {
    const [rows] = await pool.query(
      `SELECT question_id, quiz_id, instruction, points, hint,
              target_phrasal_verb, alternative_verbs,
              min_sentence_length, max_sentence_length,
              example_sentence, nlp_rules
       FROM phrasal_verb_quiz
       WHERE quiz_id = ? AND is_active = 1
       ORDER BY RAND()`,
      [quizId]
    );
    return rows;
  },

  async create({ quiz_id, instruction, points, hint, target_phrasal_verb,
                 alternative_verbs, min_sentence_length, max_sentence_length,
                 example_sentence, nlp_rules, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO phrasal_verb_quiz
       (quiz_id, instruction, points, hint, target_phrasal_verb,
        alternative_verbs, min_sentence_length, max_sentence_length,
        example_sentence, nlp_rules, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quiz_id, instruction, points ?? 2, hint || null, target_phrasal_verb,
        alternative_verbs ? JSON.stringify(alternative_verbs) : null,
        min_sentence_length ?? 5, max_sentence_length ?? 50,
        example_sentence || null, JSON.stringify(nlp_rules), created_by
      ]
    );
    return { question_id: result.insertId, quiz_id, instruction };
  }

};