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
// models/adminModel.js

// models/adminModel.js

// models/adminModel.js

// models/adminModel.js

// models/adminModel.js

async approveLesson(lesson_id) {
  // 1. Get the lesson we are approving
  const [lessonRows] = await pool.query(
    'SELECT grade_level FROM lessons WHERE lesson_id = ?',
    [lesson_id]
  );
  if (lessonRows.length === 0) return false;

  // 2. Parse the grade_level into a clean array of strings (e.g., ["7", "8"])
  let rawGrade = lessonRows[0].grade_level;
  let gradeLevels = [];
  try {
    const parsed = typeof rawGrade === 'string' ? JSON.parse(rawGrade) : rawGrade;
    gradeLevels = Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
  } catch (e) {
    gradeLevels = String(rawGrade).replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
  }
  gradeLevels = gradeLevels.map(String).filter(Boolean);

  if (gradeLevels.length === 0) return false;

  // 3. Get ALL published lessons for this grade
  const [publishedLessons] = await pool.query(
    'SELECT lesson_id, lesson_order, grade_level FROM lessons WHERE is_published = 1'
  );

  // 4. Filter in JavaScript to find the max order for this grade
  let maxOrder = 0;
  let prerequisiteId = null;

  publishedLessons.forEach(l => {
    let lGrades = [];
    try {
      const parsed = typeof l.grade_level === 'string' ? JSON.parse(l.grade_level) : l.grade_level;
      lGrades = Array.isArray(parsed) ? parsed.flat(Infinity) : [parsed];
    } catch (e) {
      lGrades = String(l.grade_level).replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
    }
    lGrades = lGrades.map(String).filter(Boolean);

    // Check if this lesson shares a grade with the one we are approving
    const sharesGrade = lGrades.some(g => gradeLevels.includes(g));

    if (sharesGrade && l.lesson_id !== lesson_id) {
      if (Number(l.lesson_order) > maxOrder) {
        maxOrder = Number(l.lesson_order);
        prerequisiteId = l.lesson_id;
      }
    }
  });

  const nextOrder = maxOrder + 1;

  console.log(`[APPROVE] Lesson ${lesson_id} | Grades: ${gradeLevels.join(',')} | Next Order: ${nextOrder} | Prereq: ${prerequisiteId}`);

  // 5. Update the lesson
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

// models/adminModel.js

async rejectLesson(lesson_id) {
  // 1. Unpublish
  const [result] = await pool.query(
    'UPDATE lessons SET is_published = 0 WHERE lesson_id = ?',
    [lesson_id]
  );
  
  // 2. Delete the submission log so the teacher can submit again
  if (result.affectedRows > 0) {
    await pool.query(
      "DELETE FROM activity_logs WHERE entity_type = 'lesson' AND entity_id = ? AND action = 'lesson.submit_approval'",
      [lesson_id]
    );
  }
  
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
// models/adminModel.js

// models/adminModel.js

async getPendingLessons() {
  const [rows] = await pool.query(
    `SELECT 
       l.*, 
       t.full_name AS teacher_name,
       (SELECT COUNT(*) FROM quizzes q WHERE q.lesson_id = l.lesson_id AND q.quiz_purpose = 'final') AS final_quiz_count,
       (SELECT COUNT(*) FROM quizzes q WHERE q.lesson_id = l.lesson_id AND q.quiz_purpose = 'pretest') AS pretest_count
     FROM lessons l
     JOIN teachers t ON l.teacher_id = t.teacher_id
     WHERE l.is_published = 0 
       AND EXISTS (
         SELECT 1 FROM activity_logs al 
         WHERE al.entity_type = 'lesson' 
           AND al.entity_id = l.lesson_id 
           AND al.action = 'lesson.submit_approval'
       )
     ORDER BY l.created_at ASC`
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
  },
    // ─── Get ALL lessons (for Admin Management) ───
  // models/adminModel.js

async getAllLessons() {
  const [rows] = await pool.query(
    `SELECT 
       l.*, 
       t.full_name AS teacher_name,
       (SELECT COUNT(*) FROM quizzes q WHERE q.lesson_id = l.lesson_id AND q.quiz_purpose = 'final') AS final_quiz_count,
       (SELECT COUNT(*) FROM quizzes q WHERE q.lesson_id = l.lesson_id AND q.quiz_purpose = 'pretest') AS pretest_count
     FROM lessons l
     JOIN teachers t ON l.teacher_id = t.teacher_id
     ORDER BY l.created_at DESC`
  );
  return rows;
}
};

