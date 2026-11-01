// controllers/teacherAnalyticsController.js
const TeacherAnalytics = require('../models/teacherAnalyticsModel');

// Guard: only teachers/admins
function requireTeacher(req, res) {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Teacher access only' });
    return false;
  }
  return true;
}

exports.getOverview = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    const stats = await TeacherAnalytics.getOverviewStats();
    res.json(stats);
  } catch (err) {
    console.error('getOverview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAllStudents = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    const students = await TeacherAnalytics.getAllStudentsWithProgress();
    res.json(students);
  } catch (err) {
    console.error('getAllStudents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getStudentDetail = async (req, res) => {
  if (!requireTeacher(req, res)) return;
  try {
    const detail = await TeacherAnalytics.getStudentDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Student not found' });
    res.json(detail);
  } catch (err) {
    console.error('getStudentDetail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};