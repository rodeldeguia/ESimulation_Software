const pool = require('../config/db');
const Lesson = require('../models/lessonModel');
const Quiz = require('../models/quizModel');
const Progress = require('../models/progressModel');

exports.list = async (req,res) =>{
    try {

        let lessons;
        if (req.user.role === 'student'){
            const grade = req.query.grade || '7';
            lessons = await Lesson.findByGrade(grade);

            // each lesson add a locked flag
            for (const lesson of lessons){
                const unlocked = await Progress.isPrerequisitePassed(req.user.id, lesson.prerequisite_lesson_id);
                lesson.locked = !unlocked;
            }


        }else{

            lessons = await Lesson.findAll();
        }
        res.json(lessons );
        
    } catch (error) {
        console.error('Lesson list Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
        
    }
};

exports.listWithoutQuiz = async (req, res) => {
    try {
        const lessons = await Lesson.findlLessonWithoutQuiz();
        res.json(lessons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getOne = async (req,res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if(!lesson) return res.status(404).json({error : 'lesson not found'});

        if(req.user.role === 'student'){
            const unlocked = await Progress.isPrerequisitePassed(req.user.id, lesson.prerequisite_lesson_id);
            if (!unlocked) return res.status(403).json({ error: 'This lesson is locked. Complete the previous lesson first.' });
            await Progress.ensureExists({
                student_id: req.user.id, lesson_id: lesson.lesson_id,
                initial_status: 'reading_required', final_available: true
            });
        }

        // 1. Fetch embedded quizzes (For teacher edit AND student view)
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
    } catch (error){
        console.error('Lesson getOne Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
    }
};

exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.findByLesson(req.params.id);
        console.log(`Quizzes for lesson ${req.params.id}:`, quizzes);
        res.json(quizzes);
    } catch (err) {
        console.error('getQuizzes error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Add this helper function near the top of lessonController.js
async function extractAndSaveInlineQuizzes(lessonId, htmlContent, teacherId, pool) {
  let updatedHtml = htmlContent;
  // Find all divs with class="inline-quiz-placeholder"
    const regex = /<div[^>]*class="inline-quiz-placeholder"[^>]*>([\s\S]*?)<\/div>/gi;
  
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    const fullMatch = match[0];
    const innerText = match[1];
    
    // Extract the text and options using a simpler regex
   const questionMatch = innerText.match(/Interactive Quiz:<\/strong>([\s\S]*?)(?:<br>|<em>|$)/i);
    const optionsMatch = innerText.match(/\(Options:\s*(.*?)\s*\|/);
    const correctMatch = innerText.match(/Correct:\s*(.*?)\)/);
    
    if (questionMatch && optionsMatch && correctMatch) {
      const question = questionMatch[1].trim();
      const options = optionsMatch[1].split(',').map(s => s.trim());
      const correct = correctMatch[1].trim();
      
      // 1. Save to DB
      const [result] = await pool.query(
        `INSERT INTO embedded_quizzes (lesson_id, question_text, options, correct_option_index, created_by) VALUES (?, ?, ?, ?, ?)`,
        [lessonId, question, JSON.stringify(options), options.indexOf(correct), teacherId]
      );
      
      const newQuizId = result.insertId;
      
      // 2. Replace the visible blue box with the actual interactive div placeholder
      const replacement = `<div class="embedded-quiz" data-quiz-id="${newQuizId}"></div>`;
      updatedHtml = updatedHtml.replace(fullMatch, replacement);
    }
  }
  return updatedHtml;
}

exports.create = async(req,res) => {
    try {
        if(req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({error : 'Only Teacher can create lesson'});
        const { title, description, discussion_content, grade_level, pre_tests } = req.body;
        if(!title || !discussion_content || !grade_level) return res.status(400).json({error : 'Missing required fields'});

        const lesson = await Lesson.createLesson({
            teacher_id : req.user.id, lesson_order: 999, title, description,
            discussion_content, grade_level, prerequisite_lesson_id: null,
            passing_score: 70.00, max_quiz_attempts: 3, is_published : 0
        });

        let finalContent = discussion_content;
        if (discussion_content.includes('inline-quiz-placeholder')) {
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

                // 4. Handle Final Quiz
               if (req.body.final_quizzes && req.body.final_quizzes.length > 0) {
            // Get the type from the first question
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

        res.status(201).json({ message : 'Lesson created as draft.', lesson: lesson });
    } catch (error) {
        console.error('Lesson create Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
    }
};

// Add to controllers/lessonController.js
exports.update = async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Teacher access only' });
        
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
        if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own lessons' });

        const { title, description, discussion_content, grade_level, pre_tests } = req.body;
        if (!title || !discussion_content || !grade_level) return res.status(400).json({ error: 'title, discussion_content, and grade_level are required' });

        let finalContent = discussion_content;
        if (discussion_content.includes('inline-quiz-placeholder')) {
            finalContent = await extractAndSaveInlineQuizzes(req.params.id, discussion_content, req.user.id, pool);
        }

        const ok = await Lesson.update(req.params.id, { title, description, discussion_content: finalContent, grade_level });
        if (!ok) return res.status(404).json({ error: 'Lesson not found or no changes' });

        // Handle Pre-Test Updates (Delete old ones, insert new ones)
        if (pre_tests) {
            const [existingPreTest] = await pool.query("SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'pretest'", [req.params.id]);
            
            if (existingPreTest.length > 0) {
                // Delete old questions and re-insert the new list
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
                    // If they deleted all pre-tests, delete the quiz container too
                    await pool.query('DELETE FROM quizzes WHERE quiz_id = ?', [quizId]);
                }
            } else if (pre_tests.length > 0) {
                // Create new Pre-Test if one didn't exist
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

                // Handle Final Quizzes
               if (req.body.final_quizzes) {
            const [existingFinal] = await pool.query("SELECT quiz_id, quiz_type FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'final'", [req.params.id]);
            
            if (existingFinal.length > 0) {
                const fqId = existingFinal[0].quiz_id;
                const oldType = existingFinal[0].quiz_type;
                
                // Delete old questions
                await pool.query(`DELETE FROM ${oldType}_quiz WHERE quiz_id = ?`, [fqId]);
                
                if (req.body.final_quizzes.length > 0) {
                    // Update the quiz container type
                    const newType = req.body.final_quizzes[0].type;
                    await pool.query(`UPDATE quizzes SET quiz_type = ? WHERE quiz_id = ?`, [newType, fqId]);
                    
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
};