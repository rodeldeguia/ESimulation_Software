// models/adminModel.js
const pool = require('../config/db');

module.exports = {

  // ─── All teachers ───
  async getAllTeachers() {
    const [rows] = await pool.query(
      `SELECT 
         t.teacher_id, t.username, t.full_name, t.department, t.specialization,
         t.role, t.is_active, t.last_login, t.created_at,
         (SELECT COUNT(*) FROM lessons WHERE teacher_id = t.teacher_id) AS lesson_count
       FROM teachers t
       ORDER BY t.is_active DESC, t.full_name`
    );
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      lesson_count: Number(r.lesson_count)
    }));
  },

  // ─── Toggle teacher active status ───
  async setTeacherActive(teacher_id, is_active) {
    const [result] = await pool.query(
      'UPDATE teachers SET is_active = ? WHERE teacher_id = ?',
      [is_active ? 1 : 0, teacher_id]
    );
    return result.affectedRows > 0;
  },

  // ─── Change teacher role (teacher ↔ admin) ───
  async setTeacherRole(teacher_id, role) {
    const [result] = await pool.query(
      'UPDATE teachers SET role = ? WHERE teacher_id = ?',
      [role, teacher_id]
    );
    return result.affectedRows > 0;
  },

  // ─── Toggle student active status ───
  async setStudentActive(student_id, is_active) {
    const [result] = await pool.query(
      'UPDATE students SET is_active = ? WHERE student_id = ?',
      [is_active ? 1 : 0, student_id]
    );
    return result.affectedRows > 0;
  },

  // ─── All students (admin view) ───
  async getAllStudents() {
    const [rows] = await pool.query(
      `SELECT 
         s.student_id, s.username, s.full_name, s.grade_level, s.is_active,
         s.last_login, s.created_at,
         (SELECT COUNT(*) FROM student_lesson_progress WHERE student_id = s.student_id AND lesson_status = 'passed') AS lessons_passed
       FROM students s
       ORDER BY s.is_active DESC, s.full_name`
    );
    return rows.map(r => ({
      ...r,
      is_active: Boolean(r.is_active),
      lessons_passed: Number(r.lessons_passed)
    }));
  },

  // ─── Approve lesson ───
  async approveLesson(lesson_id) {
  // 1. Find the current highest lesson order for this grade level
  const [currentMax] = await pool.query(
    `SELECT lesson_id, MAX(lesson_order) AS max_order 
     FROM lessons 
     WHERE is_published = 1 AND lesson_id != ? 
     GROUP BY lesson_id 
     ORDER BY max_order DESC LIMIT 1`,
    [lesson_id]
  );

  let nextOrder = 1;
  let prerequisiteId = null;

  if (currentMax.length > 0) {
    nextOrder = currentMax[0].max_order + 1;
    prerequisiteId = currentMax[0].lesson_id;
  }

  // 2. Update the lesson with the new order and prerequisite
  const [result] = await pool.query(
    `UPDATE lessons
     SET is_published = 1, 
         published_at = NOW(),
         lesson_order = ?,
         prerequisite_lesson_id = ?
     WHERE lesson_id = ? AND is_published = 0`,
    [nextOrder, prerequisiteId, lesson_id]
  );
  
  return result.affectedRows > 0;
},

  // ─── Reject/unpublish lesson ───
  async rejectLesson(lesson_id) {
    const [result] = await pool.query(
      'UPDATE lessons SET is_published = 0 WHERE lesson_id = ?',
      [lesson_id]
    );
    return result.affectedRows > 0;
  },

  // ─── Pending approval queue ───
  async getPendingLessons() {
    const [rows] = await pool.query(
      `SELECT 
         l.lesson_id, l.title, l.description, l.grade_level, l.lesson_order,
         l.created_at, l.teacher_id,
         t.full_name AS teacher_name
       FROM lessons l
       LEFT JOIN teachers t ON t.teacher_id = l.teacher_id
       WHERE l.is_published = 0
       ORDER BY l.created_at DESC`
    );
    return rows;
  },

  // ─── System-wide stats ───
  async getSystemStats() {
    const [rows] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE is_active = 1) AS total_students,
         (SELECT COUNT(*) FROM teachers WHERE is_active = 1) AS total_teachers,
         (SELECT COUNT(*) FROM teachers WHERE role = 'admin' AND is_active = 1) AS total_admins,
         (SELECT COUNT(*) FROM lessons WHERE is_published = 1) AS published_lessons,
         (SELECT COUNT(*) FROM lessons WHERE is_published = 0) AS pending_lessons,
         (SELECT COUNT(*) FROM quizzes) AS total_quizzes,
         (SELECT COUNT(*) FROM student_quiz_sessions) AS total_attempts,
         (SELECT COUNT(*) FROM student_quiz_sessions WHERE is_passed = 1) AS total_passed_attempts,
         (SELECT COUNT(*) FROM activity_logs) AS total_log_entries
       `
    );
    const r = rows[0];
    return Object.fromEntries(
      Object.entries(r).map(([k, v]) => [k, Number(v)])
    );
  }

};