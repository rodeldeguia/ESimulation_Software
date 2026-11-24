// models/teacherStatsModel.js
const pool = require('../config/db');

// Helper: Safely parse grade_levels (Handles null, stringified JSON, or array)
function parseGradeLevels(input) {
  if (!input) return [];
  // If it's already an array, return it
  if (Array.isArray(input)) return input;
  
  try {
    // Try parsing it
    const parsed = JSON.parse(input);
    // If the parsed result is an array, return it
    if (Array.isArray(parsed)) return parsed;
    // If it's a string or number, wrap it in an array
    return [parsed];
  } catch (e) {
    // If parsing fails, assume it's a comma-separated string or a single value
    if (typeof input === 'string') {
      // Remove brackets and quotes, then split by comma
      return input.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }
};

module.exports = {
  // 1. Get Stats for a specific teacher
// models/teacherStatsModel.js

async getTeacherStats(teacherId) {
  // 1. Get teacher's assigned grades (SAFE PARSE)
  const [teacherRows] = await pool.query('SELECT grade_levels FROM teachers WHERE teacher_id = ?', [teacherId]);
  
  let gradeLevels = parseGradeLevels(teacherRows[0]?.grade_levels);
  if (teacherRows.length > 0 && teacherRows[0].grade_levels) {
    try {
      const raw = teacherRows[0].grade_levels;
      // If it's a string that looks like a JSON array
      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        gradeLevels = JSON.parse(raw);
      } 
      // If it's already an array (mysql driver sometimes auto-parses JSON columns)
      else if (Array.isArray(raw)) {
        gradeLevels = raw;
      } 
      // If it's a single string number
      else {
        gradeLevels = [raw];
      }
    } catch (e) {
      console.warn("Could not parse grade_levels, defaulting to empty:", e.message);
      gradeLevels = [];
    }
  }

  // 2. Build the query based on whether gradeLevels exist
  let studentCountQuery = `(SELECT COUNT(*) FROM students WHERE is_active = 1) AS total_students`;
  let queryParams = [teacherId, teacherId, teacherId];

  if (gradeLevels.length > 0) {
    // Build the IN clause (e.g., IN ('7', '8'))
    const placeholders = gradeLevels.map(() => '?').join(',');
    studentCountQuery = `(SELECT COUNT(*) FROM students WHERE is_active = 1 AND grade_level IN (${placeholders})) AS total_students`;
    queryParams.push(...gradeLevels);
  }

  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM lessons WHERE teacher_id = ? AND is_published = 1) AS total_lessons,
       (SELECT COUNT(*) FROM lessons WHERE teacher_id = ? AND is_published = 0) AS pending_lessons,
       (SELECT COUNT(*) FROM quizzes WHERE teacher_id = ?) AS total_quizzes,
       ${studentCountQuery}
     `,
    queryParams
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
  },
};