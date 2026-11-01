// controllers/analyticsController.js
const Analytics = require('../models/analyticsModel');
const Student = require('../models/studentModel');

// ─── GET /api/analytics/me — Student's own dashboard ───
exports.getMyDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only' });
    }

    // We need the grade level. It's not in the token.
    // Option A: ask the student model. Option B: fetch from token + DB.
    const Student = require('../models/studentModel');
    const student = await Student.findUsername(req.user.username);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const data = await Analytics.getStudentDashboard(student.student_id, student.grade_level);
    res.json(data);
  } catch (err) {
    console.error('getMyDashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};