// controllers/teacherDashboardController.js
const TeacherStats = require('../models/teacherStatsModel');

// Helper: Check if user is a teacher or admin
function requireTeacher(req, res) {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Teacher access only' });
    return false;
  }
  return true;
}

// GET /api/teacher/stats
exports.getStats = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    // req.user.id comes from the JWT token (see middlewareAuth.js)
    const stats = await TeacherStats.getTeacherStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/teacher/recent-activity
exports.getRecentActivity = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    const activity = await TeacherStats.getRecentActivity(req.user.id);
    res.json(activity);
  } catch (err) {
    console.error('getRecentActivity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getClassProgress = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    const grade = req.query.grade || 'all';
    const stats = await TeacherStats.getClassProgress(req.user.id, grade);
    res.json(stats);
  } catch (err) {
    console.error('getClassProgress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/teacher/lesson-stats
exports.getLessonStats = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
     console.log('getLessonStats called with teacherId:', req.user.id); 
    const stats = await TeacherStats.getLessonStats(req.user.id);
    res.json(stats);
  } catch (err) {
    console.error('getLessonStats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};