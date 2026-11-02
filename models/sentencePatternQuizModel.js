// models/sentencePatternQuizModel.js
const pool = require('../config/db');

module.exports = {

  async findByQuiz(quizId) {
    const [rows] = await pool.query(
      `SELECT question_id, quiz_id, instruction, points, hint,
              target_pattern, allowed_patterns,
              min_sentence_length, max_sentence_length, nlp_rules
       FROM sentence_pattern_quiz
       WHERE quiz_id = ? AND is_active = 1
       ORDER BY RAND()`,
      [quizId]
    );
    return rows;
  },

  async create({ quiz_id, instruction, points, hint, target_pattern,
                 allowed_patterns, min_sentence_length, max_sentence_length,
                 nlp_rules, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO sentence_pattern_quiz
       (quiz_id, instruction, points, hint, target_pattern, allowed_patterns,
        min_sentence_length, max_sentence_length, nlp_rules, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quiz_id, instruction, points ?? 2, hint || null, target_pattern,
        JSON.stringify(allowed_patterns),
        min_sentence_length ?? 3, max_sentence_length ?? 30,
        JSON.stringify(nlp_rules), created_by
      ]
    );
    return { question_id: result.insertId, quiz_id, instruction };
  }

};