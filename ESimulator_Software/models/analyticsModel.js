// models/analyticsModel.js
const pool = require('../config/db');

module.exports = {

// models/analyticsModel.js

async getStudentDashboard(student_id, grade_level) {
  // 1. All lessons for their grade (so we show locked ones too)

  const studentIdNum = Number(student_id);
  // Ensure grade_level is a string
  const gradeLevelStr = String(grade_level);

const [lessons] = await pool.query(
  `SELECT lesson_id, lesson_order, title, description, prerequisite_lesson_id, passing_score
   FROM lessons
   WHERE JSON_CONTAINS(grade_level, CAST(? AS JSON)) AND is_published = 1
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
      status: p ? p.lesson_status : 'locked',
      final_quiz_status: p ? p.final_quiz_status : 'locked',
      attempts: p ? p.final_quiz_attempts : 0,
      best_score: p ? (p.best_quiz_score !== null ? Number(p.best_quiz_score) : null) : null,
      last_score: p ? (p.last_quiz_score !== null ? Number(p.last_quiz_score) : null) : null,
      passed_at: p ? p.passed_at : null,
      last_activity: p ? p.last_activity : null,
      time_spent_mins: p && p.final_quiz_time_spent ? Math.round(p.final_quiz_time_spent / 60) : 0
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

  // 7. 🚨 NEW: Fetch exact answer stats for the charts
  const [quizStats] = await pool.query(
    `SELECT COUNT(*) as total_quizzes 
     FROM student_quiz_sessions 
     WHERE student_id = ? AND completed_at IS NOT NULL`,
    [student_id]
  );

const [answerStats] = await pool.query(
    `SELECT 
      COUNT(*) as total_attempts,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as total_correct,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as total_incorrect
     FROM student_answers 
     WHERE student_id = ?`,
    [studentIdNum]
  );

  const totalCorrect = answerStats[0].total_correct || 0;
  const totalIncorrect = answerStats[0].total_incorrect || 0;
  const totalAttempts = Number(answerStats[0].total_attempts) || 0;

    const avgCorrect = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const avgIncorrect = totalAttempts > 0 ? Math.round((totalIncorrect / totalAttempts) * 100) : 0;

  return {
    summary: {
      total_lessons: totalLessons,
      lessons_passed: passedCount,
      lessons_attempted: attemptedCount,
      completion_percent: completionPercent,
      best_score_overall: bestScoreOverall,
      total_quizzes: quizStats[0].total_quizzes || 0,
       attempts: totalAttempts,  
      correct_answers: totalCorrect,      // 🚨 Added
      incorrect_answers: totalIncorrect, 
       avg_correct: avgCorrect,            // 🚨 Added
      avg_incorrect: avgIncorrect   // 🚨 Added
    },
    lessons: lessonsWithProgress
  };
}

};