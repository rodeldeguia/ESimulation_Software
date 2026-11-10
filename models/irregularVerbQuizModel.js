// models/irregularVerbQuizModel.js
const pool = require('../config/db');

module.exports = {

  // ─── Get all active questions for a quiz ───
  async findByQuiz(quizId) {
    const [rows] = await pool.query(
      `SELECT question_id, quiz_id, question_text, instructions, points, hint,
              present_form,  alternative_answers,
              explanation, example_sentence
       FROM irregular_verb_quiz
       WHERE quiz_id = ? AND is_active = 1
       ORDER BY RAND()`,
      [quizId]
    );
    return rows;
  },

  // ─── Create a question (used in a later step for teacher quiz builder) ───
  async create({ quiz_id, question_text, instructions, points, hint,
               present_form, past_form, future_form, past_participle,
               alternative_answers, explanation, example_sentence, 
               blank_fields, created_by }) {
  const [result] = await pool.query(
    `INSERT INTO irregular_verb_quiz
     (quiz_id, question_text, instructions, points, hint,
      present_form, past_form, future_form, past_participle,
      alternative_answers, explanation, example_sentence, blank_fields, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quiz_id, question_text, instructions || null, points ?? 1, hint || null,
      present_form, past_form, future_form, past_participle,
      alternative_answers ? JSON.stringify(alternative_answers) : null,
      explanation || null, example_sentence || null, 
      JSON.stringify(blank_fields || []), created_by
    ]
  );
  return { question_id: result.insertId, quiz_id, question_text };
}

};