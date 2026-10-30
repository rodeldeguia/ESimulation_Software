const pool = require('../config/db');
const crypto = require('crypto');

module.exports = {

    // CREATE A SESSION
    async create ({student_id, quiz_id, lesson_id, session_type, selected_questions, total_questions}){

        const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM student_quiz_sessions WHERE student_id = ? AND quiz_id = ?',[student_id,quiz_id]);

        const attempt_number = countRows[0].cnt + 1;

        //to create a session unique code
        const session_code = 'SES-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex');


        const [result] = await pool.query('INSERT INTO student_quiz_sessions(student_id, quiz_id, lesson_id, session_type, session_code, selected_questions, total_questions, attempt_number) VALUES(?,?,?,?,?,?,?,?)',
                                                                            [student_id, quiz_id,lesson_id,session_type,session_code, JSON.stringify(selected_questions), total_questions, attempt_number])

        return {
            session_id: result.insertId,
            session_code,
            attempt_number,
            student_id,
            quiz_id,
            lesson_id,
            session_type
        };                                                                  
    },


    async complete(session_id, { score, is_passed, time_taken, answered_questions }) {

        const [result] = await pool.query(`UPDATE student_quiz_sessions SET completed_at = NOW(), score = ?, is_passed = ?, time_taken = ?, answered_questions = ? WHERE session_id = ?`,[score, is_passed ? 1 : 0, time_taken, answered_questions, session_id]);
        return result.affectedRows > 0;
    },


    

    async findById(session_id){
        const [rows] = await pool.query('SELECT * FROM student_quiz_sessions WHERE session_id = ?',[session_id]);
        return rows[0] || null; 
    },

    async findByStudentQuiz(student_id, quiz_id){
        const [rows] = await pool.query('SELECT * FROM student_quiz_sessions WHERE student_id = ? AND quiz_id = ?',[student_id,quiz_id]);

        return rows;
    }
};

