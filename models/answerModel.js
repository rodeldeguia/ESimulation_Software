const pool = require('../config/db');

module.exports = {

    async save({session_id,  student_id, quiz_id, lesson_id, answer_type, question_type, question_id, student_answer, is_correct, score_earned}){

        const [result] = await pool.query('INSERT INTO student_answers(session_id, student_id, quiz_id, lesson_id, answer_type, question_type,question_id, student_answer, is_correct, score_earned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                                                                    [session_id, student_id, quiz_id, lesson_id, answer_type, question_type, question_id, JSON.stringify(student_answer), is_correct ? 1 : 0, score_earned])
        return {
            answer_id:result.insertId
        };
    },

    async findBySession (session_id){

        const [rows] = await pool.query('SELECT * FROM student_answers WHERE session_id = ? ORDER BY answer_id',[session_id]);

        return rows;
    }
}