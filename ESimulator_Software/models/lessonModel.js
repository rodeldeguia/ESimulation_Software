const pool = require('../config/db');

module.exports = {
    async findAll(){
        const [rows] = await pool.query(`SELECT lesson_id, teacher_id, lesson_order, title, description,
                                                grade_level, prerequisite_lesson_id, passing_score, max_quiz_attempts, 
                                                is_published, created_at from lessons ORDER BY grade_level, lesson_order`);
        return rows;
    },

async findLessonWithoutQuiz(purpose = 'final', teacherId = null) {
  let query = `
    SELECT l.lesson_id, l.lesson_order, l.title, l.grade_level
    FROM lessons l
    LEFT JOIN quizzes q
      ON l.lesson_id = q.lesson_id AND q.quiz_purpose = ?
    WHERE q.quiz_id IS NULL
  `;
  const params = [purpose];

  // 🔥 Filter by teacher if provided
  if (teacherId) {
    query += ` AND l.teacher_id = ?`;
    params.push(teacherId);
  }

  query += ` ORDER BY l.grade_level, l.lesson_order`;

  const [rows] = await pool.query(query, params);
  return rows;
},

async findByGrade(gradelevel) {
    // This query handles: 7, "7", [7], and ["7"]
    const [rows] = await pool.query(
        `SELECT lesson_id, lesson_order, title, description, grade_level, 
                prerequisite_lesson_id, passing_score, max_quiz_attempts 
         FROM lessons 
         WHERE (
             JSON_CONTAINS(grade_level, ?)         -- Matches [7]
             OR JSON_CONTAINS(grade_level, ?)      -- Matches ["7"]
             OR grade_level = ?                    -- Matches 7 (raw integer)
             OR grade_level = ?                    -- Matches "7" (raw string)
         ) AND is_published = 1 
         ORDER BY lesson_order`,
        [
            JSON.stringify(Number(gradelevel)), 
            JSON.stringify(String(gradelevel)),
            Number(gradelevel),
            String(gradelevel)
        ]
    );
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
    },
    // models/lessonModel.js

async findForTeacher(teacherId) {
  const [rows] = await pool.query(
    `SELECT 
       l.*, 
       t.full_name AS teacher_name,
       COUNT(CASE WHEN q.quiz_purpose = 'pretest' THEN 1 END) AS pretest_count,
       COUNT(CASE WHEN q.quiz_purpose = 'final' THEN 1 END) AS final_count
     FROM lessons l
     JOIN teachers t ON l.teacher_id = t.teacher_id
     LEFT JOIN quizzes q ON l.lesson_id = q.lesson_id AND q.is_published = 1
     WHERE (l.is_published = 1) OR (l.teacher_id = ? AND l.is_published = 0)
     GROUP BY l.lesson_id
     ORDER BY l.lesson_order ASC, l.created_at DESC`,
    [teacherId]
  );
  return rows;
}


};