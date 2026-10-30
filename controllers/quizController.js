const Quiz = require('../models/quizModel');
const PrepQ = require('../models/prepositionQuizModel');
const Session = require('../models/sessionModel');
const Answer = require('../models/answerModel');

exports.getForStudent = async (req,res) => {

    try {
        
        const quiz = await Quiz.findById(req.params.id);
        if(!quiz) return res.status(404).json({error : `Quiz not Available`});
        if(!quiz.is_published) return res.status (403).json({error : ' Quiz is not available'});

        if(quiz.quiz_type !== 'preposition') return res.status(400).json({error : `Quiz type ${quiz.quiz_type} is not supported`});
        
        const questions = await PrepQ.findByQuiz(quiz.quiz_id);

        const safeQuestion = questions.map(q => ({
            question_id : q.question_id,
            question_text : q.question_text,
            options : q.options,
            instructions : q.instructions,
            hint : q.hint,
            points : q.points
            
        }));

        // to create session
        const session = await Session.create({
            student_id: req.user.id,
            quiz_id: quiz.quiz_id,
            lesson_id: quiz.lesson_id,
            session_type: quiz.quiz_purpose,
            selected_questions: questions.map(q => q.question_id),
            total_questions: questions.length
        });

        res.json({
            quiz : {
                quiz_id : quiz.quiz_id,
                lesson_id : quiz.lesson_id,
                title : quiz.title,
                description : quiz.description,
                quiz_type : quiz.quiz_type,
                quiz_purpose : quiz.quiz_purpose,
                passing_score : Number(quiz.passing_score),
                time_limit : quiz.time_limit,
                questions_per_quiz : quiz.questions_per_quiz
            },
            questions : safeQuestion,
            session: {
                session_id: session.session_id,
                session_code: session.session_code,
                attempt_number: session.attempt_number
            }
        });

    } catch (error) {
        console.error('Quiz getForStudent Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
        
    }
};

exports.submit = async (req,res) => {

    try {
        const quiz = await Quiz.findById(req.params.id);
        if(!quiz) return res.status(404).json({error : 'Quiz not Found'});

        if(quiz.quiz_type !== 'preposition') return res.status(400).json({error : `Quiz type ${quiz.quiz_type} is not supported`});

        const {answers, session_id, time_taken} = req.body;

        if(!Array.isArray(answers) || answers.length === 0){
            return res.status(400).json({error : 'Answers must be a non-empty array'});
        }

        if(!session_id) return res.status(400).json({ error : 'session_id required'})

        const session = await Session.findById(session_id);
        if(!session) return res.status(400).json({error : 'session not found'})

        if(session.student_id !== req.user.id){
            return res.status(403).json({error : 'this session does not belomng to you'});
        }

        if(session.quiz_id !== quiz.quiz_id){
            return res.status(400).json({error : 'Session does not match this quiz'})
        }
        const questions = await PrepQ.findByQuiz(quiz.quiz_id);
        const questionMap = new Map(questions.map(q => [q.question_id, q]));
        
        let correctCount = 0;
        const results = [];

        for( const answer of answers){
            const q = questionMap.get(answer.question_id);
            if(!q) continue;

            const isCorrect = Number(answer.selected_index) === q.correct_option_index;
            if (isCorrect) correctCount ++;


            await Answer.save({
                session_id: session.session_id,
                student_id: req.user.id,
                quiz_id: quiz.quiz_id,
                lesson_id: quiz.lesson_id,
                answer_type: quiz.quiz_purpose,
                question_type: quiz.quiz_type,
                question_id: q.question_id,
                student_answer: { selected_index: Number(answer.selected_index) },
                is_correct: isCorrect,
                score_earned: isCorrect ? q.points : 0
            });

            results.push({
                question_id : q.question_id,
                question_text : q.question_text,
                selected_index: Number(answer.selected_index),
                selected_answer: q.options[answer.selected_index] || null,
                correct_index: q.correct_option_index,
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                hint: q.hint
            });
        }

        const total = results.length;
        const percentage = total > 0 ? (correctCount / total) * 100 : 0;
        const roundedPercentage = Math.round(percentage * 100) / 100;
        const passed = percentage >= Number(quiz.passing_score);

        await Session.complete(session.session_id, {
            score: roundedPercentage,
            is_passed: passed,
            time_taken: time_taken || 0,
            answered_questions: answers.length
        });

        res.json({
            quiz_id : quiz.quiz_id,
            title : quiz.title,
            session_id: session.session_id,
            session_code: session.session_code,
            attempt_number: session.attempt_number,
            score : correctCount,
            total,
            percentage : roundedPercentage,
            passing_score : Number(quiz.passing_score),
            passed,
            results
        });

    } catch (error) {
        console.error('submit Error',error);
        res.status(500).json({error : 'Server Error'})
        
    };
}