const pool = require('../config/db');

module.exports = {

    async get(student_id,lesson_id){

        const [rows] = await pool.query('SELECT * FROM student_lesson_progress WHERE student_id = ? AND lesson_id = ?',[student_id,lesson_id]);
        return rows[0] || null;

    },

    async getAllForStudent(student_id){

        const [rows] = await pool.query('SELECT p.*, l.title, l.lesson_order, l.grade_level FROM student_lesson_progress p JOIN LESSONS l ON l.lesson_id = p.lesson_id WHERE p.student_id = ? ORDER BY l.lesson_order',[student_id]);

        return rows;
    },

    async ensureExists({ student_id, lesson_id, initial_status = 'reading_required', final_available = true }) {
        // Check if exists first
        const existing = await this.get(student_id, lesson_id);
        if (existing) return existing;

        const [result] = await pool.query(`INSERT INTO student_lesson_progress(student_id, lesson_id, lesson_status, final_quiz_status, unlocked_at, reading_status)VALUES (?, ?, ?, ?, NOW(), 'in_progress')`,
                                                                                [student_id, lesson_id, initial_status, final_available ? 'available' : 'locked']
        );

        return this.get(student_id, lesson_id);
    },


    async markPassed({ student_id, lesson_id, score }) {
        await pool.query(`UPDATE student_lesson_progress SET lesson_status = 'passed',final_quiz_status = 'completed',passed_at = NOW(),best_quiz_score = GREATEST(COALESCE(best_quiz_score, 0), ?),last_quiz_score = ?,final_quiz_attempts = final_quiz_attempts + 1,last_activity = NOW()WHERE student_id = ? AND lesson_id = ?`,
                                                                                [score, score, student_id, lesson_id]
        );


    },


   async markFailed({ student_id, lesson_id, score }) {
    await pool.query(
      `UPDATE student_lesson_progress
       SET last_quiz_score = ?,
           final_quiz_attempts = final_quiz_attempts + 1,
           failed_attempts = failed_attempts + 1,
           last_activity = NOW(),
           -- ONLY change status to failed if they haven't already passed it!
           lesson_status = IF(lesson_status = 'passed', 'passed', 'failed'),
           final_quiz_status = IF(lesson_status = 'passed', 'completed', 'failed')
       WHERE student_id = ? AND lesson_id = ?`,
      [score, student_id, lesson_id]
    );
  },


    async isPrerequisitePassed(student_id, prerequisite_lesson_id) {
        if (!prerequisite_lesson_id) return true; // no prerequisite → always unlocked
        const p = await this.get(student_id, prerequisite_lesson_id);
        return p && p.lesson_status === 'passed';
    }




};