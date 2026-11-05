const pool = require('../config/db');

module.exports = {
    async findAll(){
        const [rows] = await pool.query(`SELECT lesson_id, teacher_id, lesson_order, title, description,
                                                grade_level, prerequisite_lesson_id, passing_score, max_quiz_attempts, 
                                                is_published, created_at from lessons ORDER BY grade_level, lesson_order`);
        return rows;
    },

    async findByGrade(gradelevel){

        const [rows] = await pool.query(`SELECT lesson_id, lesson_order, title, description, grade_level, 
                                    prerequisite_lesson_id, passing_score, max_quiz_attempts FROM lessons 
                                    WHERE grade_level = ? AND is_published = 1 ORDER BY lesson_order`,[gradelevel]);
        return rows;
    },

    async findById(lessonId){
        const [rows] = await pool.query(`SELECT * FROM lessons WHERE lesson_id = ?`,[lessonId]);
        return rows[0];
    },



    async createLesson({teacher_id, lesson_order, title, description, discussion_content, 
                        grade_level, prerequisite_lesson_id, passing_score, max_quiz_attempts, is_published}){
        const [result] = await pool.query(`INSERT INTO  lessons (teacher_id, lesson_order, title, description, discussion_content,
                                                                grade_level, prerequisite_lesson_id, passing_score, max_quiz_attempts, is_published) 
                                                                VALUES (?,?,?,?,?,?,?,?,?,?)`,
                                                                [teacher_id, lesson_order, title, description || null, discussion_content,
                                                                grade_level, prerequisite_lesson_id || null, passing_score ?? 70.00, max_quiz_attempts ?? 3, is_published ?? 1]);

        return{
            lesson_id : result.insertId,
            teacher_id,
            lesson_order,
            title,
            grade_level,
            is_published : is_published ?? 1
        } ;
    },


    async update(lessonId, { title, description, discussion_content, grade_level, lesson_order, prerequisite_lesson_id, passing_score, max_quiz_attempts, is_published }) {
        const [result] = await pool.query(
            `UPDATE lessons
            SET title = ?,
                description = ?,
                discussion_content = ?,
                grade_level = ?
            WHERE lesson_id = ?`,
            [
            title,
            description || null,
            discussion_content,
            grade_level,
            lessonId
            ]
        );
        return result.affectedRows > 0;
    }


};