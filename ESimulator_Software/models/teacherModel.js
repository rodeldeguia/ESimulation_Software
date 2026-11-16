const pool = require('../config/db');

module.exports ={

    async findUsername(username){
        const [rows] = await pool.query(' SELECT * FROM teachers where username = ?',[username]);
        return rows[0] || null;
    },

    async create({ username, password_hash, full_name,department,specialization,contact_number,role}){
        const [result] = await pool.query('INSERT INTO teachers (username,password_hash,full_name,department,specialization,contact_number,role) VALUES (?, ?, ? , ?, ?, ?, ?)',
                                                                [username,password_hash,full_name,department,specialization,contact_number,role || 'teacher']);

    return {
        teacher_id : result.insertId,
        username,
        full_name,
        department,
        specialization,
        contact_number,
        role: role || 'teacher'
    };
}
};