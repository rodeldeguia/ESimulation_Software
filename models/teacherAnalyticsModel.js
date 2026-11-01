// models/teacherAnalyticsModel.js
const pool = require('../config/db');

module.exports = {

  // ─── Get all students with their progress summary ───
  async getAllStudentsWithProgress() {
    const [rows] = await pool.query(
      `SELECT 
         s.student_id,
         s.username,
         s.full_name,
         s.grade_level,
         s.is_active,
         s.last_login,
         COUNT(p.progress_id) AS lessons_started,
         SUM(CASE WHEN p.lesson_status = 'passed' THEN 1 ELSE 0 END) AS lessons_passed,
         MAX(p.best_quiz_score) AS best_score,
         MAX(p.last_activity) AS last_activity
       FROM students s
       LEFT JOIN student_lesson_progress p ON p.student_id = s.student_id
       GROUP BY s.student_id
       ORDER BY s.full_name`
    );

    return rows.map(r => ({
      student_id: r.student_id,
      username: r.username,
      full_name: r.full_name,
      grade_level: r.grade_level,
      is_active: Boolean(r.is_active),
      last_login: r.last_login,
      lessons_started: Number(r.lessons_started),
      lessons_passed: Number(r.lessons_passed || 0),
      best_score: r.best_score !== null ? Number(r.best_score) : null,
      last_activity: r.last_activity
    }));
  },

  // ─── Class-wide overview stats ───
  async getOverviewStats() {
    const [rows] = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM students WHERE is_active = 1) AS total_students,
         (SELECT COUNT(*) FROM lessons WHERE is_published = 1) AS total_lessons,
         (SELECT COUNT(*) FROM quizzes WHERE is_published = 1) AS total_quizzes,
         (SELECT COUNT(*) FROM student_quiz_sessions WHERE completed_at IS NOT NULL) AS total_attempts
       `
    );
    const r = rows[0];
    return {
      total_students: Number(r.total_students),
      total_lessons: Number(r.total_lessons),
      total_quizzes: Number(r.total_quizzes),
      total_attempts: Number(r.total_attempts)
    };
  },

  // ─── Get one student's full progress (reuse from student analytics) ───
  async getStudentDetail(student_id) {
    const Analytics = require('./analyticsModel');
    // Fetch the student record first
    const [studentRows] = await pool.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );
    if (!studentRows[0]) return null;

    const student = studentRows[0];
    const dashboard = await Analytics.getStudentDashboard(student_id, student.grade_level);

    return {
      student: {
        student_id: student.student_id,
        username: student.username,
        full_name: student.full_name,
        grade_level: student.grade_level,
        last_login: student.last_login
      },
      ...dashboard
    };
  }

};