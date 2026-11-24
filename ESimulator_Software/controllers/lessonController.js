const pool = require('../config/db');
const Lesson = require('../models/lessonModel');
const Quiz = require('../models/quizModel');
const Progress = require('../models/progressModel');

// Helper to ensure we can save questions dynamically inside update
async function saveDynamicQuestion(pool, quizId, type, q, teacherId) {
  if (type === 'preposition' || type === 'clause') {
    await pool.query(
      `INSERT INTO ${type}_quiz (quiz_id, question_text, options, correct_option_index, correct_answer, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`, 
      [quizId, q.question_text, JSON.stringify(q.options), q.correct_option_index, q.correct_answer, teacherId]
    );
  } else if (type === 'irregular_verb') {
    await pool.query(
      `INSERT INTO irregular_verb_quiz (quiz_id, question_text, present_form, past_form, future_form, past_participle, ask_for, correct_answer, created_by) 
       VALUES (?, ?, ?, ?, 'will', 'done', ?, ?, ?)`, 
      [quizId, q.question_text, q.present_form, q.past_form, q.ask_for, q.correct_answer, teacherId]
    );
  } else if (type === 'sva') {
    await pool.query(
      `INSERT INTO sva_quiz (quiz_id, instruction, subject_type, verb_type, example_sentence, nlp_rules, created_by) 
       VALUES (?, ?, ?, 'singular', ?, '{}', ?)`, 
      [quizId, q.instruction, q.subject_type, q.example_sentence, teacherId]
    );
  }
}

// ─── THE FIXED HELPER FUNCTION ───
async function extractAndSaveInlineQuizzes(lessonId, htmlContent, teacherId, pool) {
  // The frontend saves the quiz and inserts: <div class="embedded-quiz" data-quiz-id="43">
  const regex = /data-quiz-id="(\d+)"/g;
  let match;
  
  while ((match = regex.exec(htmlContent)) !== null) {
    const quizId = match[1];
    
    // Link the quiz to this lesson in the database
    await pool.query(
      `UPDATE embedded_quizzes SET lesson_id = ? WHERE embed_quiz_id = ?`,
      [lessonId, quizId]
    );
  }
  
  return htmlContent;
}

exports.list = async (req, res) => {
  try {
    let lessons;
    if (req.user.role === 'student') {
      const grade = req.query.grade || '7';
      lessons = await Lesson.findByGrade(grade);

      for (const lesson of lessons) {
        const unlocked = await Progress.isPrerequisitePassed(req.user.id, lesson.prerequisite_lesson_id);
        lesson.locked = !unlocked;


        const [progressRows] = await pool.query(
    `SELECT lesson_status, best_quiz_score
     FROM student_lesson_progress
     WHERE student_id = ? AND lesson_id = ?`,
    [req.user.id, lesson.lesson_id]
  );
  const p = progressRows[0] || {};
  lesson.status = p.lesson_status || 'locked';
  lesson.best_score = p.best_quiz_score !== undefined && p.best_quiz_score !== null
    ? Number(p.best_quiz_score)
    : null;


      }
    } else {
     // 🚨 TEACHER / ADMIN LOGIC
      if (req.user.role === 'admin') {
        // Admins see everything
        lessons = await Lesson.findAll();
      } else {
        // Teachers see their own drafts + ALL published lessons
        lessons = await Lesson.findForTeacher(req.user.id);
      }
    }
    res.json(lessons);
  } catch (error) {
    console.error('Lesson list Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.listWithoutQuiz = async (req, res) => {
  try {
    const purpose = req.query.purpose || 'final';
    
    // 🔥 Pass the teacher's ID (or null for admins to see everything)
    const teacherId = req.user.role === 'admin' ? null : req.user.id;
    
    const lessons = await Lesson.findLessonWithoutQuiz(purpose, teacherId);
    res.json(lessons);
  } catch (error) {
    console.error('listWithoutQuiz error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'lesson not found' });

    if (req.user.role === 'student') {
      const unlocked = await Progress.isPrerequisitePassed(req.user.id, lesson.prerequisite_lesson_id);
      if (!unlocked) return res.status(403).json({ error: 'This lesson is locked. Complete the previous lesson first.' });
      await Progress.ensureExists({
        student_id: req.user.id, lesson_id: lesson.lesson_id,
        initial_status: 'reading_required', final_available: true
      });

      await pool.query(
  `UPDATE student_lesson_progress
   SET reading_status = 'in_progress',
       reading_started_at = COALESCE(reading_started_at, NOW())
   WHERE student_id = ? AND lesson_id = ? AND reading_status = 'not_started'`,
  [req.user.id, lesson.lesson_id]
);
    }

    // 1. Fetch embedded quizzes
    const [embeds] = await pool.query('SELECT embed_quiz_id, question_text, options, correct_option_index FROM embedded_quizzes WHERE lesson_id = ?', [lesson.lesson_id]);
    lesson.embedded_quizzes = embeds;

    // 2. Fetch Pre-Test questions
    const [preTestQuiz] = await pool.query("SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'pretest'", [lesson.lesson_id]);
    if (preTestQuiz.length > 0) {
      const [questions] = await pool.query(
        "SELECT question_text, options, correct_option_index, correct_answer FROM preposition_quiz WHERE quiz_id = ?",
        [preTestQuiz[0].quiz_id]
      );
      lesson.pre_tests = questions.map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        correct_answer: q.correct_answer
      }));
    } else {
      lesson.pre_tests = [];
    }

    // 3. Fetch Final Quiz questions
    const [finalQuiz] = await pool.query("SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'final'", [lesson.lesson_id]);
    if (finalQuiz.length > 0) {
      const [questions] = await pool.query(
        "SELECT question_text, options, correct_option_index, correct_answer FROM preposition_quiz WHERE quiz_id = ?",
        [finalQuiz[0].quiz_id]
      );
      lesson.final_quizzes = questions.map(q => ({
        question_text: q.question_text,
        options: q.options,
        correct_option_index: q.correct_option_index,
        correct_answer: q.correct_answer
      }));
    } else {
      lesson.final_quizzes = [];
    }

    res.json(lesson);
  } catch (error) {
    console.error('Lesson getOne Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const [quizzes] = await pool.query(
      `SELECT quiz_id, quiz_purpose, title, time_limit 
       FROM quizzes 
       WHERE lesson_id = ? AND is_published = 1  
       ORDER BY quiz_purpose DESC`,
      [req.params.id]
    );
    res.json(quizzes);
  } catch (err) {
    console.error('getQuizzes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only Teacher can create lesson' });
    const { title, description, discussion_content, grade_level, pre_tests } = req.body;
    if (!title || !discussion_content || !grade_level) return res.status(400).json({ error: 'Missing required fields' });

    const lesson = await Lesson.createLesson({
      teacher_id: req.user.id,
      lesson_order: 999,
      title,
      description,
      discussion_content,
      grade_level: JSON.stringify(grade_level),
      prerequisite_lesson_id: null,
      passing_score: 70.00,
      max_quiz_attempts: 3,
      is_published: 0
    });

    let finalContent = discussion_content;
    if (discussion_content.includes('embedded-quiz')) {
      finalContent = await extractAndSaveInlineQuizzes(lesson.lesson_id, discussion_content, req.user.id, pool);
      await pool.query('UPDATE lessons SET discussion_content = ? WHERE lesson_id = ?', [finalContent, lesson.lesson_id]);
      lesson.discussion_content = finalContent;
    }

    if (pre_tests && pre_tests.length > 0) {
      const [quizResult] = await pool.query(
        `INSERT INTO quizzes (lesson_id, teacher_id, quiz_type, quiz_purpose, title, passing_score, is_published) 
         VALUES (?, ?, 'preposition', 'pretest', 'Lesson Pre-Test', 70.00, 1)`,
        [lesson.lesson_id, req.user.id]
      );
      for (const q of pre_tests) {
        await pool.query(
          `INSERT INTO preposition_quiz (quiz_id, question_text, options, correct_option_index, correct_answer, created_by) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [quizResult.insertId, q.question_text, JSON.stringify(q.options), q.correct_option_index, q.correct_answer, req.user.id]
        );
      }
    }

    if (req.body.final_quizzes && req.body.final_quizzes.length > 0) {
      const fqType = req.body.final_quizzes[0].type;
      const [quizResult] = await pool.query(
        `INSERT INTO quizzes (lesson_id, teacher_id, quiz_type, quiz_purpose, title, passing_score, is_published) 
         VALUES (?, ?, ?, 'final', 'Lesson Final Quiz', 70.00, 1)`,
        [lesson.lesson_id, req.user.id, fqType]
      );
      const final_quiz_id = quizResult.insertId;
      for (const q of req.body.final_quizzes) {
        await saveDynamicQuestion(pool, final_quiz_id, q.type, q, req.user.id);
      }
    }

    res.status(201).json({ message: 'Lesson created as draft.', lesson: lesson });
  } catch (error) {
    console.error('Lesson create Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.update = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Teacher access only' });
    
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own lessons' });

    const { title, description, discussion_content, grade_level, pre_tests } = req.body;
    if (!title || !discussion_content || !grade_level) return res.status(400).json({ error: 'title, discussion_content, and grade_level are required' });

    let finalContent = discussion_content;
    if (discussion_content.includes('embedded-quiz')) {
      finalContent = await extractAndSaveInlineQuizzes(req.params.id, discussion_content, req.user.id, pool);
    }

    const ok = await Lesson.update(req.params.id, { 
      title,
      description,
      discussion_content: finalContent,
      grade_level: JSON.stringify(grade_level)
    });

    if (!ok) return res.status(404).json({ error: 'Lesson not found or no changes' });

    if (pre_tests) {
      const [existingPreTest] = await pool.query("SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'pretest'", [req.params.id]);
      
      if (existingPreTest.length > 0) {
        const quizId = existingPreTest[0].quiz_id;
        await pool.query('DELETE FROM preposition_quiz WHERE quiz_id = ?', [quizId]);
        
        if (pre_tests.length > 0) {
          for (const q of pre_tests) {
            await pool.query(
              `INSERT INTO preposition_quiz (quiz_id, question_text, options, correct_option_index, correct_answer, created_by) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [quizId, q.question_text, JSON.stringify(q.options), q.correct_option_index, q.correct_answer, req.user.id]
            );
          }
        } else {
          await pool.query('DELETE FROM quizzes WHERE quiz_id = ?', [quizId]);
        }
      } else if (pre_tests.length > 0) {
        const [quizResult] = await pool.query(
          `INSERT INTO quizzes (lesson_id, teacher_id, quiz_type, quiz_purpose, title, passing_score, is_published) 
           VALUES (?, ?, 'preposition', 'pretest', 'Lesson Pre-Test', 70.00, 1)`,
          [req.params.id, req.user.id]
        );
        for (const q of pre_tests) {
          await pool.query(
            `INSERT INTO preposition_quiz (quiz_id, question_text, options, correct_option_index, correct_answer, created_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [quizResult.insertId, q.question_text, JSON.stringify(q.options), q.correct_option_index, q.correct_answer, req.user.id]
          );
        }
      }
    }

    if (req.body.final_quizzes) {
      const [existingFinal] = await pool.query("SELECT quiz_id, quiz_type FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'final'", [req.params.id]);
      
      if (existingFinal.length > 0) {
        const fqId = existingFinal[0].quiz_id;
        const oldType = existingFinal[0].quiz_type;
        
        await pool.query(`DELETE FROM ${oldType}_quiz WHERE quiz_id = ?`, [fqId]);
        
        if (req.body.final_quizzes.length > 0) {
          const newType = req.body.final_quizzes[0].type;
           
          if (newType) {
    await pool.query(`UPDATE quizzes SET quiz_type = ? WHERE quiz_id = ?`, [newType, fqId]);
  }
          
          for (const q of req.body.final_quizzes) {
            await saveDynamicQuestion(pool, fqId, q.type, q, req.user.id);
          }
        } else {
          await pool.query('DELETE FROM quizzes WHERE quiz_id = ?', [fqId]);
        }
      } else if (req.body.final_quizzes.length > 0) {
        const fqType = req.body.final_quizzes[0].type;
        const [quizResult] = await pool.query(
          `INSERT INTO quizzes (lesson_id, teacher_id, quiz_type, quiz_purpose, title, passing_score, is_published) 
           VALUES (?, ?, ?, 'final', 'Lesson Final Quiz', 70.00, 1)`,
          [req.params.id, req.user.id, fqType]
        );
        for (const q of req.body.final_quizzes) {
          await saveDynamicQuestion(pool, quizResult.insertId, q.type, q, req.user.id);
        }
      }
    }

    res.json({ message: 'Lesson updated successfully', discussion_content: finalContent });
  } catch (err) {
    console.error('lesson update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const lessonId = req.params.id;
    const [result] = await pool.query('DELETE FROM lessons WHERE lesson_id = ?', [lessonId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (err) {
    console.error('deleteLesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// exports.markReadingComplete = async (req, res) => {
//   try {
//     if (req.user.role !== 'student') {
//       return res.status(403).json({ error: 'Student access only' });
//     }
//     const lessonId = req.params.id;
//     const studentId = req.user.id;
//     const extraSeconds = Math.max(0, Math.min(3600, Number(req.body.seconds) || 0));

//     const [rows] = await pool.query(
//       `SELECT reading_status FROM student_lesson_progress
//        WHERE student_id = ? AND lesson_id = ?`,
//       [studentId, lessonId]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: 'Progress row not found' });
//     }

//     if (rows[0].reading_status === 'completed') {
//       return res.json({ success: true, already_completed: true });
//     }

//     await pool.query(
//       `UPDATE student_lesson_progress
//        SET reading_status = 'completed',
//            reading_completed_at = NOW(),
//            reading_time_spent = reading_time_spent + ?,
//            reading_progress = 100.00,
//            last_activity = NOW()
//        WHERE student_id = ? AND lesson_id = ?`,
//       [extraSeconds, studentId, lessonId]
//     );

//     res.json({ success: true, seconds_added: extraSeconds });
//   } catch (err) {
//     console.error('markReadingComplete error:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

exports.startReading = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only' });
    }
    const lessonId = req.params.id;
    const studentId = req.user.id;

    // Ensure progress row exists
    await pool.query(
      `INSERT INTO student_lesson_progress
         (student_id, lesson_id, reading_status, reading_started_at, lesson_status, last_activity)
       VALUES (?, ?, 'in_progress', NOW(), 'reading_required', NOW())
       ON DUPLICATE KEY UPDATE
         reading_started_at = IFNULL(reading_started_at, NOW()),
         reading_status = IF(reading_status = 'not_started', 'in_progress', reading_status),
         last_activity = NOW()`,
      [studentId, lessonId]
    );

    // Return current accumulated time so the frontend can display it
    const [rows] = await pool.query(
      `SELECT reading_status, reading_time_spent
       FROM student_lesson_progress
       WHERE student_id = ? AND lesson_id = ?`,
      [studentId, lessonId]
    );

    res.json({
      success: true,
      reading_status: rows[0]?.reading_status || 'in_progress',
      reading_time_spent: rows[0]?.reading_time_spent || 0
    });
  } catch (err) {
    console.error('startReading error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.pauseReading = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only' });
    }
    const lessonId = req.params.id;
    const studentId = req.user.id;
    const seconds = Math.max(0, Math.min(3600, Number(req.body.seconds) || 0)); // cap at 1 hour per flush

    if (seconds === 0) {
      return res.json({ success: true, added: 0 });
    }

    await pool.query(
      `UPDATE student_lesson_progress
       SET reading_time_spent = reading_time_spent + ?,
           last_activity = NOW()
       WHERE student_id = ? AND lesson_id = ?`,
      [seconds, studentId, lessonId]
    );

    res.json({ success: true, added: seconds });
  } catch (err) {
    console.error('pauseReading error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markReadingComplete = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only' });
    }
    const lessonId = req.params.id;
    const studentId = req.user.id;
    const extraSeconds = Math.max(0, Math.min(3600, Number(req.body.seconds) || 0));

    const [rows] = await pool.query(
      `SELECT reading_status FROM student_lesson_progress
       WHERE student_id = ? AND lesson_id = ?`,
      [studentId, lessonId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Progress row not found' });
    }

    if (rows[0].reading_status === 'completed') {
      return res.json({ success: true, already_completed: true });
    }

    await pool.query(
      `UPDATE student_lesson_progress
       SET reading_status = 'completed',
           reading_completed_at = NOW(),
           reading_time_spent = reading_time_spent + ?,
           reading_progress = 100.00,
           last_activity = NOW()
       WHERE student_id = ? AND lesson_id = ?`,
      [extraSeconds, studentId, lessonId]
    );

    res.json({ success: true, seconds_added: extraSeconds });
  } catch (err) {
    console.error('markReadingComplete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// controllers/lessonController.js

// controllers/lessonController.js

exports.submitForApproval = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const lessonId = req.params.id;

    // Check if the lesson has a final quiz
    const [quizRows] = await pool.query(
      "SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'final'",
      [lessonId]
    );

    if (quizRows.length === 0) {
      return res.status(400).json({ 
        error: 'You must create a Final Quiz before submitting for approval.' 
      });
    }

    // 🚨 Log the submission (This is what the Admin query checks)
    await pool.query(
      `INSERT INTO activity_logs (actor_type, actor_id, action, entity_type, entity_id, details)
       VALUES ('teacher', ?, 'lesson.submit_approval', 'lesson', ?, '{"status":"submitted"}')`,
      [req.user.id, lessonId]
    );

    res.json({ message: 'Lesson submitted for approval.' });
  } catch (err) {
    console.error('submitForApproval error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};