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

     // ⬇️ NEW: Fetch all quiz sessions for this student to calculate history
    const [sessions] = await pool.query(
      `SELECT quiz_id, score, is_passed, started_at, time_taken 
       FROM student_quiz_sessions 
       WHERE student_id = ? AND completed_at IS NOT NULL
       ORDER BY session_id ASC`,
      [student_id]
    );

    // Group sessions by lesson (using the quizzes table to link quiz_id to lesson_id)
    const [quizLessons] = await pool.query(`SELECT quiz_id, lesson_id FROM quizzes`);
    const quizToLesson = {};
    quizLessons.forEach(q => quizToLesson[q.quiz_id] = q.lesson_id);

    const sessionsWithLesson = sessions.map(s => ({
      ...s,
      lesson_id: quizToLesson[s.quiz_id]
    }));

    return {
      student: {
        student_id: student.student_id,
        username: student.username,
        full_name: student.full_name,
        grade_level: student.grade_level,
        last_login: student.last_login
      },
      ...dashboard,
      sessions: sessionsWithLesson
    };
  },


    // ─── Class-Wide Analytics ───
  async getClassAnalytics() {
    // 1. Lesson Difficulty (Avg score per lesson)
    const [lessonDifficulty] = await pool.query(`
      SELECT l.title, AVG(s.score) as avg_score, COUNT(s.session_id) as total_attempts
      FROM student_quiz_sessions s
      JOIN quizzes q ON s.quiz_id = q.quiz_id
      JOIN lessons l ON q.lesson_id = l.lesson_id
      WHERE s.completed_at IS NOT NULL
      GROUP BY l.lesson_id
      ORDER BY avg_score ASC
    `);

    // 2. Student Leaderboard (Fastest + Best Scores)
    const [leaderboard] = await pool.query(`
      SELECT st.full_name, AVG(s.score) as avg_score, AVG(s.time_taken) as avg_time
      FROM student_quiz_sessions s
      JOIN students st ON s.student_id = st.student_id
      WHERE s.completed_at IS NOT NULL
      GROUP BY st.student_id
      ORDER BY avg_score DESC, avg_time ASC
      LIMIT 10
    `);

    // 3. Students Needing Help (Lowest scores)
    const [struggling] = await pool.query(`
      SELECT st.full_name, AVG(s.score) as avg_score, COUNT(s.session_id) as failed_attempts
      FROM student_quiz_sessions s
      JOIN students st ON s.student_id = st.student_id
      WHERE s.is_passed = 0
      GROUP BY st.student_id
      ORDER BY avg_score ASC
      LIMIT 5
    `);
// ⬇️ NEW #1: At-Risk Students (Failed > 2 times or Inactive > 7 days)
    const [atRisk] = await pool.query(`
      SELECT st.full_name, 
             SUM(p.failed_attempts) as total_fails,
             MAX(p.last_activity) as last_active
      FROM student_lesson_progress p
      JOIN students st ON p.student_id = st.student_id
      GROUP BY st.student_id
      HAVING total_fails > 2 OR last_active < DATE_SUB(NOW(), INTERVAL 7 DAY)
      LIMIT 5
    `);

    // ⬇️ NEW #2: Quiz Type Weakness (Preposition, SVA, etc.)
    const [quizTypeStats] = await pool.query(`
      SELECT q.quiz_type, AVG(s.score) as avg_score
      FROM student_quiz_sessions s
      JOIN quizzes q ON s.quiz_id = q.quiz_id
      WHERE s.completed_at IS NOT NULL
      GROUP BY q.quiz_type
    `);

    // ⬇️ NEW #3: Lesson Drop-off Rate
    const [dropOff] = await pool.query(`
      SELECT l.title,
             COUNT(DISTINCT p.student_id) as started_count,
             COUNT(DISTINCT s.student_id) as completed_count
      FROM student_lesson_progress p
      JOIN lessons l ON p.lesson_id = l.lesson_id
      LEFT JOIN student_quiz_sessions s ON s.student_id = p.student_id AND s.quiz_id IN (
          SELECT quiz_id FROM quizzes WHERE lesson_id = l.lesson_id
      )
      GROUP BY l.lesson_id
    `);

    return {
      lessonDifficulty,
      leaderboard,
      struggling,
      atRisk,        // NEW
      quizTypeStats, // NEW
      dropOff        // NEW
    };
  }
};

