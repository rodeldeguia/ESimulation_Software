// models/clauseQuizModel.js
const pool = require('../config/db');

module.exports = {

  async findByQuiz(quizId) {
    const [rows] = await pool.query(
      `SELECT question_id, quiz_id, question_text, instructions, points, hint,
              sentence, clause_text, clause_type,
              options, correct_option_index, explanation
       FROM clause_quiz
       WHERE quiz_id = ? AND is_active = 1
       ORDER BY RAND()`,
      [quizId]
    );
    return rows;
  },

  async create({ quiz_id, question_text, instructions, points, hint,
                 sentence, clause_text, clause_type,
                 options, correct_option_index, explanation, created_by }) {
    const [result] = await pool.query(
      `INSERT INTO clause_quiz
       (quiz_id, question_text, instructions, points, hint,
        sentence, clause_text, clause_type,
        options, correct_option_index, explanation, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quiz_id,
        question_text,
        instructions || null,
        points ?? 1,
        hint || null,
        sentence,
        clause_text,
        clause_type,
        JSON.stringify(options),
        correct_option_index,
        explanation || null,
        created_by
      ]
    );
    return { question_id: result.insertId, quiz_id, question_text };
  }

};