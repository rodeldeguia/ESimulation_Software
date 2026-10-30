const pool = require('../config/db');

module.exports = {

    async get(student_id,lesson_id){

        const [rows] = await pool.query('SELECT * FROM student_lesson_progress WHERE student_id = ? AND lesson_id = ?',[student_id,lesson_id]);
        return rows[0] || null;

    },

    async getAllForStudent(stundent_id){

        const [rows] = await pool.query('SELECT')
    }
}