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

exports.create = async(req,res) => {
    try {
        if(req.user.role !== 'teacher' && req.user.role !== 'admin'){
            return res.status(403).json({error : 'Only Teacher can create lesson'})
        }

        const { title, description, discussion_content, grade_level, passing_score, max_quiz_attempts, is_published} = req.body;
        
        if(!title || !discussion_content || !grade_level ) return res.status(400).json({error : 'Missing required fields'});

        const lesson_order = 999;

        const newlesson = await Lesson.createLesson({
            teacher_id : req.user.id,
            lesson_order,
            title,
            description,
            discussion_content,
            grade_level,
            prerequisite_lesson_id:null,
            passing_score,
            max_quiz_attempts,
            is_published : 0
        });

        res.status(201).json({message : 'Lesson created as draft. Waiting for admin approval', lesson: newlesson});

    } catch (error) {
        console.error('Lesson create Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
    }

};

// Add to controllers/lessonController.js
    exports.update = async (req, res) => {
    try {
        // Teacher/admin only
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Teacher access only' });
        }

        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

        // Teacher can only edit their own lessons; admin can edit any
        if (req.user.role === 'teacher' && lesson.teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own lessons' });
        }

        const {
        title, description, discussion_content, grade_level, lesson_order,
        prerequisite_lesson_id, passing_score, max_quiz_attempts, is_published
        } = req.body;

        if (!title || !discussion_content || !grade_level || !lesson_order) {
        return res.status(400).json({
            error: 'title, discussion_content, grade_level, and lesson_order are required'
        });
        }

        const ok = await Lesson.update(req.params.id, {
        title, description, discussion_content, grade_level, 
        passing_score, max_quiz_attempts, is_published
        });

        if (!ok) return res.status(404).json({ error: 'Lesson not found or no changes' });

        res.json({ message: 'Lesson updated' });
    } catch (err) {
        console.error('lesson update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};