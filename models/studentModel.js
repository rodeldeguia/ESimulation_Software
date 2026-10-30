const pool = require('../config/db');

module.exports = {

    async findUsername(username){
        const [rows] =  await pool.query(' SELECT * FROM  students where username = ?', [username]);
        return rows[0] || null;
    },

    async create ({ username, password_hash, full_name, grade_level, birth_date, LRN}){
        const [result] = await pool.query('INSERT INTO students (username, password_hash, full_name,grade_level, Birth_date, LRN) VALUES(?,?,?,?,?,?)',
                                                                [username,password_hash, full_name, grade_level, birth_date || null, LRN || null]
        );

        // this will return the newsly created student
        return{
            student_id: result.insertId,
            username,
            full_name,
            grade_level,
            birth_date,
            LRN
        };

    }
};