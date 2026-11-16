const pool = require('../config/db');

module.exports = {

    async findByQuiz(quizId){
        const [rows] = await pool.query('SELECT question_id, quiz_id, question_text, instructions, points, hint,correct_answer, options, correct_option_index,explanation FROM preposition_quiz WHERE quiz_id = ? AND is_active = 1 ORDER BY RAND()        ' ,[quizId]);
        return rows;
    },

    async findById(questionId){
        const [rows] = await pool.query('SELECT * FROM preposition_quiz WHERE question_id = ?',[questionId]);
        return rows[0] || null;
    },

    async create({quiz_id, question_text, instructions, points, hint, correct_answer, options, correct_option_index, explanation, created_by}){
        const [result] = await pool.query('INSERT INTO preposition_quiz (quiz_id, question_text, instructions, points, hint, correct_answer, options, correct_option_index, explanation, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                                                        [quiz_id, question_text, instructions, points, hint, correct_answer, JSON.stringify(options), correct_option_index, explanation, created_by]);
        return {
            question_id: result.insertId,
            quiz_id,
            question_text
            
        };
    }

}