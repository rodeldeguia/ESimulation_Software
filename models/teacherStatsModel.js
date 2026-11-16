// models/teacherStatsModel.js
const pool = require('../config/db');

module.exports = {
  // 1. Get Stats for a specific teacher
  async getTeacherStats(teacherId) {
    const [rows] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM lessons WHERE teacher_id = ? AND is_published = 1) AS total_lessons,
         (SELECT COUNT(*) FROM lessons WHERE teacher_id = ? AND is_published = 0) AS pending_lessons,
         (SELECT COUNT(*) FROM quizzes WHERE teacher_id = ?) AS total_quizzes,
         (SELECT COUNT(DISTINCT student_id) FROM student_lesson_progress WHERE lesson_id IN (SELECT lesson_id FROM lessons WHERE teacher_id = ?)) AS total_students
       `,
      [teacherId, teacherId, teacherId, teacherId]
    );
    
    const r = rows[0];
    return {
      total_lessons: Number(r.total_lessons),
      pending_lessons: Number(r.pending_lessons),
      total_quizzes: Number(r.total_quizzes),
      total_students: Number(r.total_students) || 0
    };
  },

  // 2. Get Recent Activity
  async getRecentActivity(teacherId) {
    const [rows] = await pool.query(
      `SELECT 
         s.full_name AS student_name,
         l.title AS lesson_title,
         sess.score,
         sess.completed_at AS date
       FROM student_quiz_sessions sess
       JOIN students s ON s.student_id = sess.student_id
       JOIN lessons l ON l.lesson_id = sess.lesson_id
       WHERE l.teacher_id = ? AND sess.completed_at IS NOT NULL
       ORDER BY sess.completed_at DESC
       LIMIT 5`,
      [teacherId]
    );
    return rows;
  },

  // 3. Get Class Progress
  async getClassProgress(teacherId, grade) {
    let query = `
      SELECT 
        s.student_id, 
        s.full_name, 
        s.grade_level,
        (SELECT COUNT(*) FROM student_lesson_progress WHERE student_id = s.student_id AND lesson_status = 'passed') AS lessons_passed,
        (SELECT AVG(score) FROM student_quiz_sessions WHERE student_id = s.student_id) AS avg_score
      FROM students s
      WHERE s.is_active = 1
    `;
    const params = [];
    
    if (grade && grade !== 'all') {
      query += ` AND s.grade_level = ?`;
      params.push(grade);
    }
    query += ` ORDER BY s.full_name ASC`;

    const [rows] = await pool.query(query, params);
    
    const totalLessons = 6; 
    return rows.map(r => ({
      ...r,
      avg_score: Math.round(r.avg_score || 0),
      progress_percent: Math.min(Math.round((r.lessons_passed / totalLessons) * 100), 100)
    }));
  },

  // 4. Get Lesson Analytics
  async getLessonStats(teacherId) {
    const [rows] = await pool.query(`
      SELECT 
        l.lesson_id,
        l.title,
        (SELECT COUNT(*) FROM student_quiz_sessions WHERE lesson_id = l.lesson_id) AS total_attempts,
        (SELECT COUNT(*) FROM student_quiz_sessions WHERE lesson_id = l.lesson_id AND is_passed = 1) AS passed_attempts,
        (SELECT AVG(score) FROM student_quiz_sessions WHERE lesson_id = l.lesson_id) AS class_average
      FROM lessons l
      WHERE l.teacher_id = ? AND l.is_published = 1
      ORDER BY l.lesson_order ASC
    `, [teacherId]);

    return rows.map(r => {
      const passRate = r.total_attempts > 0 
        ? (r.passed_attempts / r.total_attempts) * 100 
        : 0;
        
      return {
        lesson_id: r.lesson_id,
        title: r.title,
        total_attempts: Number(r.total_attempts),
        pass_rate: Math.round(passRate),
        class_average: Math.round(r.class_average || 0)
      };
    });
  }
};