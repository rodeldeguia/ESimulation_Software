const pool = require('../config/db');
const Quiz = require('../models/quizModel');
const PrepositionQuiz = require('../models/prepositionQuizModel');
const Session = require('../models/sessionModel');
const Answer = require('../models/answerModel');
const Progress = require('../models/progressModel');
const IrregularVerbQuiz = require('../models/irregularVerbQuizModel');
const ClauseQuiz = require('../models/clauseQiuzModel');
const SvaQuiz = require('../models/svaQuizModel');
const PhrasalVerbQuiz = require('../models/phrasalVerbModel');
const SentencePatternQuiz = require('../models/sentencePatternQuizModel');
const NlpService = require('../utils/nlpService');
const QuestionFactory = require('../models/questionFactory');

exports.getForStudent = async (req,res) => {

    try {
        
         let safeQuestions = [];
        let questions = [];
        const quiz = await Quiz.findById(req.params.id);
        if(!quiz) return res.status(404).json({error : `Quiz not Available`});
        if(!quiz.is_published) return res.status (403).json({error : ' Quiz is not available'});

        if (quiz.quiz_type === 'preposition') {
            questions = await PrepositionQuiz.findByQuiz(quiz.quiz_id);
            safeQuestions = questions.map(q => ({
                question_id: q.question_id,
                question_type: 'multiple_choice',       // ⬅️ tag it
                question_text: q.question_text,
                instructions: q.instructions,
                hint: q.hint,
                points: q.points,
                options: q.options
        }));
        } else if (quiz.quiz_type === 'irregular_verb') {
            questions = await IrregularVerbQuiz.findByQuiz(quiz.quiz_id);
            safeQuestions = questions.map(q => ({
                question_id: q.question_id,
                question_type: 'text_input',            // ⬅️ tag it
                question_text: q.question_text,
                instructions: q.instructions,
                hint: q.hint,
                points: q.points,
                present_form: q.present_form,
                ask_for: q.ask_for
        }));
        } else if (quiz.quiz_type === 'clause') {
            questions = await ClauseQuiz.findByQuiz(quiz.quiz_id);
            safeQuestions = questions.map(q => ({
                question_id: q.question_id,
                question_type: 'two_step_choice',
                question_text: q.question_text,
                instructions: q.instructions,
                hint: q.hint,
                points: q.points,
                sentence: q.sentence,           // extra context
                // clause_text: q.clause_text,     // extra context
                // clause_type: q.clause_type,     // extra context
                options: q.options
            }));
        
        } else if (quiz.quiz_type === 'sva') {
            questions = await SvaQuiz.findByQuiz(quiz.quiz_id);
            safeQuestions = questions.map(q => ({
                question_id: q.question_id,
                question_type: 'sentence_construction',
                instruction: q.instruction,
                hint: q.hint,
                points: q.points,
                context: q.context,
                subject_type: q.subject_type,
                verb_type: q.verb_type,
                min_sentence_length: q.min_sentence_length,
                max_sentence_length: q.max_sentence_length
                // ⚠️ NOT sent: example_sentence, nlp_rules
        }));
            
            } else if (quiz.quiz_type === 'phrasal_verb') {
                questions = await PhrasalVerbQuiz.findByQuiz(quiz.quiz_id);
                safeQuestions = questions.map(q => ({
                    question_id: q.question_id,
                    question_type: 'sentence_construction',
                    instruction: q.instruction,
                    hint: q.hint,
                    points: q.points,
                    target_phrasal_verb: q.target_phrasal_verb,   // shown so student knows which verb to use
                    min_sentence_length: q.min_sentence_length,
                    max_sentence_length: q.max_sentence_length
                    // NOT sent: example_sentence, alternative_verbs, nlp_rules
            }));

            } else if (quiz.quiz_type === 'sentence_pattern') {
                questions = await SentencePatternQuiz.findByQuiz(quiz.quiz_id);
                safeQuestions = questions.map(q => ({
                    question_id: q.question_id,
                    question_type: 'pattern_choice',
                    instruction: q.instruction,
                    hint: q.hint,
                    points: q.points,
                    allowed_patterns: q.allowed_patterns,         // for dropdown
                    min_sentence_length: q.min_sentence_length,
                    max_sentence_length: q.max_sentence_length
                    // NOT sent: target_pattern, nlp_rules
                }));
                    

        } else {
            return res.status(400).json({ error: `Quiz type "${quiz.quiz_type}" not yet supported` });
        }
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
            questions : safeQuestions,
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

        let questions;
        const quiz = await Quiz.findById(req.params.id);
        if(!quiz) return res.status(404).json({error : 'Quiz not Found'});

        if (quiz.quiz_type === 'preposition') {
            questions = await PrepositionQuiz.findByQuiz(quiz.quiz_id);
        } else if (quiz.quiz_type === 'irregular_verb') {
            questions = await IrregularVerbQuiz.findByQuiz(quiz.quiz_id);
        } else if (quiz.quiz_type === 'clause') {
            questions = await ClauseQuiz.findByQuiz(quiz.quiz_id);
        } else if (quiz.quiz_type === 'sva') {
            questions = await SvaQuiz.findByQuiz(quiz.quiz_id);
        } else if (quiz.quiz_type === 'phrasal_verb') {
            questions = await PhrasalVerbQuiz.findByQuiz(quiz.quiz_id);
        } else if (quiz.quiz_type === 'sentence_pattern') {
            questions = await SentencePatternQuiz.findByQuiz(quiz.quiz_id);
        }else {
            return res.status(400).json({ error: 'Quiz type not yet supported' });
        }

        const {answers, session_id, time_taken} = req.body;

        //

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

        //
        
        const questionMap = new Map(questions.map(q => [q.question_id, q]));
        
        let correctCount = 0;
        const results = [];

        for( const answer of answers){
            const q = questionMap.get(answer.question_id);
            if(!q) continue;

            let isCorrect = false;
            let studentAnswerJSON = null;
            let svaReason = null;


            // ─── Validate based on quiz type ───
            if (quiz.quiz_type === 'preposition') {
                isCorrect = Number(answer.selected_index) === q.correct_option_index;
                studentAnswerJSON = { selected_index: Number(answer.selected_index) };
                
            } else if (quiz.quiz_type === 'irregular_verb') {
                // Normalize: lowercase, trim
                const studentText = String(answer.text || '').trim().toLowerCase();
                const correctText = String(q.correct_answer).trim().toLowerCase();

                // Check alternative_answers too
                const alternatives = Array.isArray(q.alternative_answers)
                ? q.alternative_answers.map(a => String(a).trim().toLowerCase())
                : [];

                isCorrect = studentText === correctText || alternatives.includes(studentText);
                studentAnswerJSON = { text: answer.text || '' };

            } else if (quiz.quiz_type === 'clause') {
                // isCorrect = Number(answer.selected_index) === q.correct_option_index;
                // studentAnswerJSON = { selected_index: Number(answer.selected_index) };
                const clauseCorrect = Number(answer.selected_index) === q.correct_option_index;
                const selectedType = String(answer.selected_type || '').trim().toLowerCase();
                const correctType = String(q.clause_type || '').trim().toLowerCase();
                const typeCorrect = selectedType === correctType;

                // All-or-nothing
                isCorrect = clauseCorrect && typeCorrect;

                studentAnswerJSON = {
                    selected_index: Number(answer.selected_index),
                    selected_type: answer.selected_type || ''
                };

            }else if (quiz.quiz_type === 'sva') {
                // 1. Run NLP validation
                const nlpResult = NlpService.validateSvaWithNlp(answer.text, q);

                // 2. Also run basic rules (word count, must_contain, etc.) — belt and suspenders
                const ruleResult = validateSvaAnswer(answer.text, q);

                // Both must pass
                isCorrect = nlpResult.isCorrect && ruleResult.isCorrect;

                // Prefer the NLP reason if it failed, else the rule reason
                svaReason = !nlpResult.isCorrect ? nlpResult.reason
                            : !ruleResult.isCorrect ? ruleResult.reason
                            : null;

                studentAnswerJSON = { text: answer.text || '', reason: svaReason };

                }else if (quiz.quiz_type === 'phrasal_verb') {
            const result = validatePhrasalVerbAnswer(answer.text, q);
            isCorrect = result.isCorrect;
            studentAnswerJSON = { text: answer.text || '', reason: result.reason || null };
            svaReason = result.reason || null;   // reuse the reason variable

            } else if (quiz.quiz_type === 'sentence_pattern') {
                // NLP checks pattern match + grammar
                const nlpResult = NlpService.validateSentencePatternWithNlp(
                    answer.text, answer.selected_pattern, q
                );
                // Rules check word count
                const ruleResult = validateSentencePatternAnswer(answer.text, answer.selected_pattern, q);

                isCorrect = nlpResult.isCorrect && ruleResult.isCorrect;

                svaReason = !nlpResult.isCorrect ? nlpResult.reason
                            : !ruleResult.isCorrect ? ruleResult.reason
                            : null;

                studentAnswerJSON = {
                    text: answer.text || '',
                    selected_pattern: answer.selected_pattern || '',
                    reason: svaReason
                };
                }


            if (isCorrect) correctCount ++;


            await Answer.save({
                session_id: session.session_id,
                student_id: req.user.id,
                quiz_id: quiz.quiz_id,
                lesson_id: quiz.lesson_id,
                answer_type: quiz.quiz_purpose,
                question_type: quiz.quiz_type,
                question_id: q.question_id,
                student_answer: studentAnswerJSON ? JSON.stringify(studentAnswerJSON) : null,
                is_correct: isCorrect,
                score_earned: isCorrect ? q.points : 0
            });


            results.push({
                question_id : q.question_id,
                question_text : q.question_text || q.instruction || '',//unify the field name
                selected_index: Number(answer.selected_index),
                //selected_answer: q.options[answer.selected_index] || null,
                //correct_index: q.correct_option_index,
                //correct_answer: q.correct_answer,
                is_correct: isCorrect,
                explanation: q.explanation,
                hint: q.hint,
                        ...(quiz.quiz_type === 'preposition' ? {
                    selected_index: Number(answer.selected_index),
                    selected_answer: q.options[answer.selected_index] || null,
                    correct_index: q.correct_option_index,
                    correct_answer: q.correct_answer
                    } : {}),

                    ...(quiz.quiz_type === 'irregular_verb' ? {
                    selected_answer: answer.text || '(none)',
                    correct_answer: q.correct_answer,
                    present_form: q.present_form,
                    ask_for: q.ask_for
                    } : {}),

                    ...(quiz.quiz_type === 'clause' ? {
                    selected_index: Number(answer.selected_index),
                    selected_answer: q.options[answer.selected_index] || null,
                    correct_index: q.correct_option_index,
                    correct_answer: q.options[q.correct_option_index],
                    selected_type: answer.selected_type || null,
                    correct_type: q.clause_type,
                    clause_correct: Number(answer.selected_index) === q.correct_option_index,
                    type_correct: String(answer.selected_type || '').trim().toLowerCase() === String(q.clause_type || '').trim().toLowerCase(),
                    sentence: q.sentence
                    } : {}),

                    ...(quiz.quiz_type === 'sva' ? {
                    student_text: answer.text || '',
                    example_sentence: q.example_sentence,      // now safe to reveal
                    subject_type: q.subject_type,
                    verb_type: q.verb_type,
                    reason: svaReason
                    } : {}),

                    ...(quiz.quiz_type === 'phrasal_verb' ? {
                    student_text: answer.text || '',
                    target_phrasal_verb: q.target_phrasal_verb,
                    example_sentence: q.example_sentence,
                    reason: svaReason
                    } : {}),

                    ...(quiz.quiz_type === 'sentence_pattern' ? {
                    student_text: answer.text || '',
                    selected_pattern: answer.selected_pattern || '',
                    correct_pattern: q.target_pattern,
                    pattern_correct: String(answer.selected_pattern || '').trim().toUpperCase() === String(q.target_pattern || '').trim().toUpperCase(),
                    reason: svaReason
                    } : {}),
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


            // Update lesson progress
        await Progress.ensureExists({
            student_id: req.user.id,
            lesson_id: quiz.lesson_id,
            initial_status: 'reading_required',
            final_available: true
        });

        if (passed) {
            await Progress.markPassed({student_id: req.user.id,lesson_id: quiz.lesson_id,score: roundedPercentage
        });

        } else {
            await Progress.markFailed({student_id: req.user.id, lesson_id: quiz.lesson_id,score: roundedPercentage});
        }


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

    // ─── Phase 10: Rule-based SVA validation ───
// Phase 11 will replace this with full NLP validation
    function validateSvaAnswer(text, q) {
        if (!text || !text.trim()) {
            return { isCorrect: false, reason: 'Empty answer' };
        }

        const raw = text.trim();
        const normalized = raw.toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ').trim();
        const words = normalized.split(' ').filter(w => w.length > 0);

        // 1. Word count bounds
        if (words.length < (q.min_sentence_length || 1)) {
            return { isCorrect: false, reason: `Too short — need at least ${q.min_sentence_length} words` };
        }
        if (words.length > (q.max_sentence_length || 50)) {
            return { isCorrect: false, reason: `Too long — max ${q.max_sentence_length} words` };
        }

        // // 2. Parse rules
        // let rules = q.nlp_rules;
        // if (typeof rules === 'string') {
        //     try { rules = JSON.parse(rules); } catch { rules = {}; }
        // }
        // rules = rules || {};

        // // 3. Must contain at least one of these (whole word match)
        // if (Array.isArray(rules.must_contain) && rules.must_contain.length > 0) {
        //     const found = rules.must_contain.some(w => words.includes(w.toLowerCase()));
        //     if (!found) {
        //     return { isCorrect: false, reason: `Sentence must include one of: ${rules.must_contain.join(', ')}` };
        //     }
        // }

        // // 4. Must not contain any of these (whole word match)
        // if (Array.isArray(rules.must_not_contain) && rules.must_not_contain.length > 0) {
        //     const found = rules.must_not_contain.find(w => words.includes(w.toLowerCase()));
        //     if (found) {
        //     return { isCorrect: false, reason: `Sentence must not include: "${found}"` };
        //     }
        // }

        return { isCorrect: true };
    }

    
        // ─── Phrasal Verb validation ───
    function validatePhrasalVerbAnswer(text, q) {
    if (!text || !text.trim()) {
        return { isCorrect: false, reason: 'Empty answer' };
    }

    const normalized = text.trim().toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
    const words = normalized.split(' ').filter(w => w.length > 0);

    // Word count
    if (words.length < (q.min_sentence_length || 1)) {
        return { isCorrect: false, reason: `Too short — need at least ${q.min_sentence_length} words` };
    }
    if (words.length > (q.max_sentence_length || 50)) {
        return { isCorrect: false, reason: `Too long — max ${q.max_sentence_length} words` };
    }

    // Check target + alternatives as substrings (phrasal verbs can be multi-word: "give up")
    const target = String(q.target_phrasal_verb || '').trim().toLowerCase();
    const alternatives = Array.isArray(q.alternative_verbs)
        ? q.alternative_verbs.map(a => String(a).trim().toLowerCase())
        : [];

    const allOptions = [target, ...alternatives].filter(Boolean);
    const found = allOptions.some(v => normalized.includes(v));

    if (!found) {
        return { isCorrect: false, reason: `Sentence must include the phrasal verb: "${q.target_phrasal_verb}"` };
    }

    return { isCorrect: true };
    }

    // ─── Sentence Pattern validation ───
    function validateSentencePatternAnswer(text, selectedPattern, q) {
    if (!text || !text.trim()) {
        return { isCorrect: false, reason: 'Empty sentence' };
    }
    // if (!selectedPattern) {
    //     return { isCorrect: false, reason: 'Please select a pattern' };
    // }

    const normalized = text.trim().toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
    const words = normalized.split(' ').filter(w => w.length > 0);

    // Word count
    if (words.length < (q.min_sentence_length || 1)) {
        return { isCorrect: false, reason: `Too short — need at least ${q.min_sentence_length} words` };
    }
    if (words.length > (q.max_sentence_length || 50)) {
        return { isCorrect: false, reason: `Too long — max ${q.max_sentence_length} words` };
    }

    // Pattern match (case-insensitive, trim)
    // const selected = String(selectedPattern).trim().toUpperCase();
    // const target = String(q.target_pattern).trim().toUpperCase();

    // if (selected !== target) {
    //     return { isCorrect: false, reason: `Wrong pattern. Correct is: ${q.target_pattern}` };
    // }

    return { isCorrect: true };
    }
}

// ═══════════════════════════════════════════════════════
// TEACHER: Create quiz
// ═══════════════════════════════════════════════════════
exports.createQuiz = async (req, res) => {
  try {
    // Role check
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can create quizzes' });
    }

    const { lesson_id, quiz_type, quiz_purpose, title, description, passing_score, time_limit, questions_per_quiz } = req.body;

    if (!lesson_id || !quiz_type || !title) {
      return res.status(400).json({ error: 'lesson_id, quiz_type, and title are required' });
    }

    const validTypes = ['preposition', 'irregular_verb', 'clause', 'sva', 'phrasal_verb', 'sentence_pattern'];
    if (!validTypes.includes(quiz_type)) {
      return res.status(400).json({ error: `quiz_type must be one of: ${validTypes.join(', ')}` });
    }

    const quiz = await Quiz.createquiz({
      lesson_id,
      teacher_id: req.user.id,
      quiz_type,
      quiz_purpose: quiz_purpose || 'review',
      title,
      description,
      passing_score: passing_score ?? 70.00,
      time_limit: time_limit || null,
      questions_per_quiz: questions_per_quiz ?? 10,
      is_published: 0   // Always draft by default
    });

    res.status(201).json({
      message: 'Quiz created as draft. Add questions then publish.',
      quiz
    });
  } catch (err) {
    console.error('createQuiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════
// TEACHER: Add a question to a quiz
// ═══════════════════════════════════════════════════════
exports.addQuestion = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can add questions' });
    }

    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Verify ownership
    if (quiz.teacher_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only add questions to your own quizzes' });
    }

    // Find the right model
    const Model = QuestionFactory.getModel(quiz.quiz_type);
    if (!Model) {
      return res.status(400).json({ error: `No model found for quiz type: ${quiz.quiz_type}` });
    }

    // Add created_by automatically
    const questionData = { ...req.body, quiz_id: quiz.quiz_id, created_by: req.user.id };

    const question = await Model.createPrepositionQuestion(questionData);

    res.status(201).json({
      message: 'Question added',
      question
    });
  } catch (err) {
    console.error('addQuestion error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════
// TEACHER: Get quiz + all its questions (for editing)
// ═══════════════════════════════════════════════════════
exports.getQuizForEditing = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (quiz.teacher_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own quizzes' });
    }

    const Model = QuestionFactory.getModel(quiz.quiz_type);
    if (!Model) {
      return res.status(400).json({ error: `Unknown quiz type: ${quiz.quiz_type}` });
    }

    const questions = await Model.findByQuiz(quiz.quiz_id);

    res.json({ quiz, questions });
  } catch (err) {
    console.error('getQuizForEditing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════
// TEACHER: Publish quiz
// ═══════════════════════════════════════════════════════
exports.publishQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    if (quiz.teacher_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only publish your own quizzes' });
    }

    // Check has at least 1 question
    const Model = QuestionFactory.getModel(quiz.quiz_type);
    const questions = await Model.findByQuiz(quiz.quiz_id);
    if (questions.length === 0) {
      return res.status(400).json({ error: 'Add at least one question before publishing' });
    }

    await pool.query('UPDATE quizzes SET is_published = 1 WHERE quiz_id = ?', [quiz.quiz_id]);
    res.json({ message: 'Quiz published' });
  } catch (err) {
    console.error('publishQuiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ═══════════════════════════════════════════════════════
// TEACHER: List their quizzes
// ═══════════════════════════════════════════════════════
exports.listTeacherQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const [rows] = await pool.query(
      `SELECT q.*, l.title AS lesson_title
       FROM quizzes q
       JOIN lessons l ON l.lesson_id = q.lesson_id
       WHERE q.teacher_id = ?
       ORDER BY q.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    console.error('listTeacherQuizzes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
