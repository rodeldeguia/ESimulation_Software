// controllers/userController.js
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const db = require('../config/db');

// Configure Multer (Shared for all users)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/profiles/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// 1. GET Profile (Unified)
// 1. GET Profile (Unified)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user.teacher_id || req.user.student_id;
    const role = req.user.role || 'teacher';

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID missing from token' });
    }

    let query = '';
    
    // Build the query based on the role so we don't ask for columns that don't exist
    if (role === 'student') {
      query = `SELECT username, full_name, profile_picture, grade_level FROM students WHERE student_id = ?`;
    } else {
      query = `SELECT username, full_name, profile_picture, department, specialization, contact_number FROM teachers WHERE teacher_id = ?`;
    }

    const [rows] = await db.query(query, [userId]);
    
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.json({ success: true, user: rows[0], role: role });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// 2. UPDATE Profile (Unified)
exports.updateProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    const { full_name, username, department, specialization, contact_number, grade_level, password } = req.body;
    
    let table = 'teachers';
    let idColumn = 'teacher_id';
    if (role === 'student') {
      table = 'students';
      idColumn = 'student_id';
    }

    // Build dynamic query based on role
    let updateQuery = `UPDATE ${table} SET full_name = ?, username = ?`;
    let params = [full_name, username];

    // Only teachers/admins have department and specialization
    if (role !== 'student') {
      updateQuery += `, department = ?, specialization = ?, contact_number = ?`;
      params.push(department, specialization, contact_number);
    } 
    // Only students have grade_level
    else {
      updateQuery += `, grade_level = ?`;
      params.push(grade_level);
    }

    // Handle Profile Picture
    if (req.file) {
      const profilePicPath = `/uploads/profiles/${req.file.filename}`;
      updateQuery += `, profile_picture = ?`;
      params.push(profilePicPath);
    }

    // Handle Password Update
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery += `, password_hash = ?`;
      params.push(hashedPassword);
    }

    updateQuery += ` WHERE ${idColumn} = ?`;
    params.push(id);

    await db.query(updateQuery, params);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.upload = upload;