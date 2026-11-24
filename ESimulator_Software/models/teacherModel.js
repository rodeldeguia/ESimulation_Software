const pool = require('../config/db');

module.exports ={

    async findUsername(username){
        const [rows] = await pool.query(' SELECT * FROM teachers where username = ?',[username]);
        return rows[0] || null;
    },

async create({ username, password_hash, full_name, department, specialization, contact_number, grade_levels }) {
    const [result] = await pool.query(
        `INSERT INTO teachers (username, password_hash, full_name, department, specialization, contact_number, grade_levels) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, password_hash, full_name, department || null, specialization || null, contact_number || null, grade_levels|| null]
    );
    return result.insertId;
}
};