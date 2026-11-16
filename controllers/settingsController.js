const pool = require('../config/db');
const bcrypt = require('bcrypt');

// ─── UPDATE PROFILE (Name, Dept, Specialization, etc.) ───
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, department, specialization, contact_number } = req.body;
    const teacherId = req.user.id;

    await pool.query(
      `UPDATE teachers 
       SET full_name = ?, department = ?, specialization = ?, contact_number = ? 
       WHERE teacher_id = ?`,
      [full_name, department || null, specialization || null, contact_number || null, teacherId]
    );

    // Fetch updated data to send back
    const [rows] = await pool.query('SELECT teacher_id, username, full_name, role, department, specialization FROM teachers WHERE teacher_id = ?', [teacherId]);
    
    res.json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ─── CHANGE PASSWORD ───
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const teacherId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // 1. Get current hashed password
    const [rows] = await pool.query('SELECT password_hash FROM teachers WHERE teacher_id = ?', [teacherId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // 2. Verify current password
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // 3. Hash new password and save
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE teachers SET password_hash = ? WHERE teacher_id = ?', [newHash, teacherId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};