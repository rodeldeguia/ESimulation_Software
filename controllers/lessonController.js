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

exports.getOne = async (req,res) => {
    try {

        const lesson = await Lesson.findById(req.params.id);
        if(!lesson) return res.status(404).json({error : 'lesson not found'});
        

        // check if the prerequesite lesson is passed
        if(req.user.role === 'student'){
            const unlocked = await Progress.isPrerequisitePassed(req.user.id, lesson.prerequisite_lesson_id);
        

            if (!unlocked) {
                return res.status(403).json({ error: 'This lesson is locked. Complete the previous lesson first.' });
                }

            //  Ensure a progress row exists for this lesson
            await Progress.ensureExists({
                student_id: req.user.id,
                lesson_id: lesson.lesson_id,
                initial_status: 'reading_required',
                final_available: true
            });
        
        }
            // Fetch embedded quizzes for this lesson if it's a student
    if (req.user.role === 'student') {
      const [embeds] = await pool.query('SELECT embed_quiz_id, question_text, options FROM embedded_quizzes WHERE lesson_id = ?', [lesson.lesson_id]);
      lesson.embedded_quizzes = embeds;
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
        if(req.user.role !== 'teacher' && req.user.role !== 'admin'){
            return res.status(403).json({error : 'Only Teacher can create lesson'})
        }

        const { title, description, discussion_content, grade_level } = req.body;
        
        if(!title || !discussion_content || !grade_level) {
            return res.status(400).json({error : 'Missing required fields (title, content, grade)'});
        }

        // 1. Create the lesson
        const lesson = await Lesson.createLesson({
            teacher_id : req.user.id,
            lesson_order: 999, // Temp order, admin will fix
            title,
            description,
            discussion_content,
            grade_level,
            prerequisite_lesson_id: null,
            passing_score: 70.00,
            max_quiz_attempts: 3,
            is_published : 0
        });

        // 2. Check for inline quizzes and extract them
        if (discussion_content.includes('inline-quiz-placeholder')) {
            const processedHtml = await extractAndSaveInlineQuizzes(lesson.lesson_id, discussion_content, req.user.id, pool);
            // Update the lesson with the clean HTML (replaces blue box with data-quiz-id)
            await pool.query('UPDATE lessons SET discussion_content = ? WHERE lesson_id = ?', [processedHtml, lesson.lesson_id]);
            
            // Update the local variable so the frontend sees the new HTML
            lesson.discussion_content = processedHtml;
        }

        // ✅ Fix: Use 'lesson' not 'newlesson'
        res.status(201).json({
            message : 'Lesson created as draft. Waiting for admin approval', 
            lesson: lesson
        });

    } catch (error) {
        console.error('Lesson create Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
    }
};

// Add to controllers/lessonController.js
exports.update = async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Teacher access only' });
        }

        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

        if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own lessons' });
        }

        const { title, description, discussion_content, grade_level } = req.body;

        // Validate to prevent SQL/Mass Assignment issues
        if (!title || !discussion_content || !grade_level) {
            return res.status(400).json({
                error: 'title, discussion_content, and grade_level are required'
            });
        }

        let finalContent = discussion_content;

        // Check if the teacher added new inline quizzes during the edit
        if (discussion_content.includes('inline-quiz-placeholder')) {
            finalContent = await extractAndSaveInlineQuizzes(req.params.id, discussion_content, req.user.id, pool);
        }

        const ok = await Lesson.update(req.params.id, {
            title, 
            description, 
            discussion_content: finalContent, // Use the cleaned HTML
            grade_level, 
            passing_score: lesson.passing_score, // Keep existing
            max_quiz_attempts: lesson.max_quiz_attempts,
            is_published: lesson.is_published
        });

        if (!ok) return res.status(404).json({ error: 'Lesson not found or no changes' });

        res.json({ message: 'Lesson updated successfully', discussion_content: finalContent });
    } catch (err) {
        console.error('lesson update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};