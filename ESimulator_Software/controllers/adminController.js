// controllers/adminController.js
const pool = require('../config/db');
const Admin = require('../models/adminModel');
const Log   = require('../models/activityLogModel');

// ─── Role guard ───
function requireAdmin(req, res) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access only' });
    return false;
  }
  return true;
}

// ─── Helper: get client IP and UA ───
function getClientMeta(req) {
  return {
    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    user_agent: req.headers['user-agent'] || null
  };
}

// ═══════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════
exports.getOverview = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const stats = await Admin.getSystemStats();
    res.json(stats);
  } catch (err) {
    console.error('admin getOverview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════
// TEACHERS
// ═══════════════════════════════════════════════════
exports.getAllTeachers = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    res.json(await Admin.getAllTeachers());
  } catch (err) {
    console.error('admin getAllTeachers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleTeacherActive = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active (boolean) required' });
    }
    const ok = await Admin.setTeacherActive(req.params.id, is_active);
    if (!ok) return res.status(404).json({ error: 'Teacher not found' });

    // Log it
    await Log.log({
      actor_type: 'teacher',
      actor_id: req.user.id,
      action: 'user.toggle_active',
      entity_type: 'teacher',
      entity_id: Number(req.params.id),
      details: { is_active },
      ...getClientMeta(req)
    });

    res.json({ message: `Teacher ${is_active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    console.error('toggleTeacherActive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changeTeacherRole = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { role } = req.body;
    if (!['teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be "teacher" or "admin"' });
    }
    const ok = await Admin.setTeacherRole(req.params.id, role);
    if (!ok) return res.status(404).json({ error: 'Teacher not found' });

    await Log.log({
      actor_type: 'teacher',
      actor_id: req.user.id,
      action: 'user.change_role',
      entity_type: 'teacher',
      entity_id: Number(req.params.id),
      details: { new_role: role },
      ...getClientMeta(req)
    });

    res.json({ message: `Role changed to ${role}` });
  } catch (err) {
    console.error('changeTeacherRole error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════
exports.getAllStudents = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    res.json(await Admin.getAllStudents());
  } catch (err) {
    console.error('admin getAllStudents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggleStudentActive = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active (boolean) required' });
    }
    const ok = await Admin.setStudentActive(req.params.id, is_active);
    if (!ok) return res.status(404).json({ error: 'Student not found' });

    await Log.log({
      actor_type: 'teacher',
      actor_id: req.user.id,
      action: 'user.toggle_active',
      entity_type: 'student',
      entity_id: Number(req.params.id),
      details: { is_active },
      ...getClientMeta(req)
    });

    res.json({ message: `Student ${is_active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    console.error('toggleStudentActive error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════
// LESSON APPROVAL
// ═══════════════════════════════════════════════════
exports.getPendingLessons = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    res.json(await Admin.getPendingLessons());
  } catch (err) {
    console.error('getPendingLessons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// controllers/adminController.js

// controllers/adminController.js

// controllers/adminController.js

exports.approveLesson = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const lessonId = req.params.id;

    // 1. Fetch the lesson to get its grade_level
    const [lessonRows] = await pool.query(
      'SELECT grade_level FROM lessons WHERE lesson_id = ?',
      [lessonId]
    );
    if (lessonRows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 2. Parse grade_level safely
    let rawGrade = lessonRows[0].grade_level;
    let gradeLevels = [];

    try {
      const parsed = typeof rawGrade === 'string' ? JSON.parse(rawGrade) : rawGrade;
      if (Array.isArray(parsed)) {
        gradeLevels = parsed.flat(Infinity); 
      } else {
        gradeLevels = [parsed];
      }
    } catch (e) {
      gradeLevels = String(rawGrade).replace(/[\[\]"]/g, '').split(',').map(s => s.trim());
    }

    const primaryGrade = gradeLevels[0]; // Use the first grade to sequence

    if (!primaryGrade) {
      return res.status(400).json({ error: 'Lesson has no grade level defined' });
    }

    // 3. Call the Model to approve and assign order/prerequisite
    const ok = await Admin.approveLesson(lessonId, primaryGrade);

    if (!ok) {
      return res.status(400).json({ error: 'Lesson not found or already approved' });
    }

    // 4. Log the action
    try {
      await Log.log({
        actor_type: 'teacher',
        actor_id: req.user.id,
        action: 'lesson.approve',
        entity_type: 'lesson',
        entity_id: Number(lessonId),
        ...getClientMeta(req)
      });
    } catch (logErr) {
      console.warn("Logging failed but approval succeeded", logErr);
    }

    res.json({ message: 'Lesson approved and published' });
  } catch (err) {
    console.error('approveLesson error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
};

exports.rejectLesson = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const ok = await Admin.rejectLesson(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Lesson not found' });

    await Log.log({
      actor_type: 'teacher',
      actor_id: req.user.id,
      action: 'lesson.reject',
      entity_type: 'lesson',
      entity_id: Number(req.params.id),
      ...getClientMeta(req)
    });

    res.json({ message: 'Lesson rejected (unpublished)' });
  } catch (err) {
    console.error('rejectLesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════════════════
exports.getActivityLogs = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const logs   = await Log.getRecent({ limit, offset });
    const counts = await Log.countByAction();

    res.json({ logs, counts, limit, offset });
  } catch (err) {
    console.error('getActivityLogs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ADMIN: Get all lessons (approved and pending)
exports.getAllLessons = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    res.json(await Admin.getAllLessons());
  } catch (err) {
    console.error('getAllLessons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};