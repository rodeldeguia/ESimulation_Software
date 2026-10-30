const pool = require('../config/db');


module.exports = {

    async findById(quizId){

        const [rows] = await pool.query('SELECT * FROM quizzes where quiz_id = ?',[quizId] );
        return rows[0];
    },

    async findByLesson (lessonId){

        const [rows] = await pool.query('SELECT *FROM quizzes WHERE lesson_id = ?',[lessonId]);
        return rows;
    },

    async findByTeacher(teacherId){

        const [rows] = await pool.query('SELECT * FROM quizzes WHERE teacher_id = ?',[teacherId]);
        return rows;
    },

    async createquiz({lesson_id,teacher_id, quiz_type, quiz_purpose, title,discription,passing_score,time_limit, question_per_quiz, is_published}){

        const [result] = await pool.query('INSERT INTO quizzes (teacher_id,lesson_id,quiz_type,quiz_purpose,title,description,passing_score,time_limit,question_per_quiz,is_published) VALUES (?,?,?,?,?,?,?,?,?,?)',
                                                                [teacher_id,lesson_id,quiz_type,quiz_purpose,title,discription,passing_score,time_limit,question_per_quiz,is_published]);

        return {
            quiz_id : result.insertId,
            lesson_id,
            quiz_type,
            title
        };
                                                                }
    }







