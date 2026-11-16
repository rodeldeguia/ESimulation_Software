// models/analyticsModel.js
const pool = require('../config/db');

module.exports = {

  // ─── Get all data needed for a student's progress dashboard ───
  async getStudentDashboard(student_id, grade_level) {
    // 1. All lessons for their grade (so we show locked ones too)
    const [lessons] = await pool.query(
      `SELECT lesson_id, lesson_order, title, description, prerequisite_lesson_id, passing_score
       FROM lessons
       WHERE grade_level = ? AND is_published = 1
       ORDER BY lesson_order`,
      [grade_level]
    );

    // 2. Their progress rows (may be empty for new students)
    const [progressRows] = await pool.query(
      'SELECT * FROM student_lesson_progress WHERE student_id = ?',
      [student_id]
    );

    // 3. Index progress by lesson_id for fast lookup
    const progressByLesson = {};
    progressRows.forEach(p => { progressByLesson[p.lesson_id] = p; });

    // 4. Build combined view per lesson
    const lessonsWithProgress = lessons.map(l => {
      const p = progressByLesson[l.lesson_id] || null;
      return {
        lesson_id: l.lesson_id,
        lesson_order: l.lesson_order,
        title: l.title,
        description: l.description,
        prerequisite_lesson_id: l.prerequisite_lesson_id,
        passing_score: Number(l.passing_score),
        // Progress details (or defaults if never opened)
        status: p ? p.lesson_status : 'locked',
        final_quiz_status: p ? p.final_quiz_status : 'locked',
        attempts: p ? p.final_quiz_attempts : 0,
        best_score: p ? (p.best_quiz_score !== null ? Number(p.best_quiz_score) : null) : null,
        last_score: p ? (p.last_quiz_score !== null ? Number(p.last_quiz_score) : null) : null,
        passed_at: p ? p.passed_at : null,
        last_activity: p ? p.last_activity : null
      };
    });

    // 5. Summary statistics
    const totalLessons = lessons.length;
    const passedCount = lessonsWithProgress.filter(l => l.status === 'passed').length;
    const attemptedCount = lessonsWithProgress.filter(l => l.attempts > 0).length;
    const completionPercent = totalLessons > 0
      ? Math.round((passedCount / totalLessons) * 10000) / 100
      : 0;

    // 6. Best score across all lessons
    const scores = lessonsWithProgress.map(l => l.best_score).filter(s => s !== null);
    const bestScoreOverall = scores.length > 0 ? Math.max(...scores) : null;

    return {
      summary: {
        total_lessons: totalLessons,
        lessons_passed: passedCount,
        lessons_attempted: attemptedCount,
        completion_percent: completionPercent,
        best_score_overall: bestScoreOverall
      },
      lessons: lessonsWithProgress
    };
  }

};