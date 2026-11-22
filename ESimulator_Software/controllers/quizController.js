const pool = require('../config/db');
const Quiz = require('../models/quizModel');
const PrepositionQuiz = require('../models/prepositionQuizModel');
const Session = require('../models/sessionModel');
const Answer = require('../models/answerModel');
const Progress = require('../models/progressModel');
const IrregularVerbQuiz = require('../models/irregularVerbQuizModel');
const ClauseQuiz = require('../models/clauseQuizModel');
const SvaQuiz = require('../models/svaQuizModel');
const PhrasalVerbQuiz = require('../models/phrasalVerbQuizModel');
const SentencePatternQuiz = require('../models/sentencePatternQuizModel');
const NlpService = require('../utils/nlpService');
const QuestionFactory = require('../models/questionFactory');

exports.getForStudent = async (req,res) => {

    try {
        
         let safeQuestions = [];
         let questions = [];
         const quiz = await Quiz.findById(req.params.id);
        questions = questions.sort(() => 0.5 - Math.random());

        const limit = quiz.questions_per_quiz || questions.length;
        questions = questions.slice(0, limit);

      
        console.log(quiz);
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
            console.log(questions);
            safeQuestions = questions.map(q => ({
                question_id: q.question_id,
                question_type: 'text_input',
                question_text: q.question_text,
                instructions: q.instructions,
                hint: q.hint,
                points: q.points,
                present_form: q.present_form,
                past_form: q.past_form,
                future_form: q.future_form,
                past_participle: q.past_participle,
                blank_fields: q.blank_fields // ⬅️ THIS WAS MISSING
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
               // ⬇️ CHECK FOR AN ACTIVE SESSION FIRST ⬇️
              // ⬇️ CHECK FOR AN ACTIVE (INCOMPLETE) SESSION FIRST ⬇️
          // ⬇️ CHECK FOR AN ACTIVE (INCOMPLETE) SESSION FIRST ⬇️
        const isPreview = req.query.preview === 'true';
          let session;

           if (!isPreview) {
            // Normal student flow: check for active session or create one
            const [existingSessions] = await pool.query(
            `SELECT * FROM student_quiz_sessions 
             WHERE student_id = ? AND quiz_id = ? AND completed_at IS NULL 
             ORDER BY session_id DESC LIMIT 1`,
            [req.user.id, quiz.quiz_id]
        );
              if (existingSessions.length > 0) {
            session = existingSessions[0];
        } else {
            session = await Session.create({
                student_id: req.user.id,
                quiz_id: quiz.quiz_id,
                lesson_id: quiz.lesson_id,
                session_type: quiz.quiz_purpose,
                selected_questions: questions.map(q => q.question_id),
                total_questions: questions.length
            });
        }

        if (!isPreview && quiz.quiz_purpose === 'final') {
        await pool.query(
            `UPDATE student_lesson_progress
             SET final_quiz_status = 'in_progress',
                 final_quiz_started_at = COALESCE(final_quiz_started_at, NOW()),
                 lesson_status = IF(
                    lesson_status IN ('reading_required', 'final_available'),
                    'final_in_progress',
                    lesson_status
                 ),
                 last_activity = NOW()
             WHERE student_id = ? AND lesson_id = ?`,
            [req.user.id, quiz.lesson_id]
        );
    }
        } else {
            // Preview flow: fake a session object just for the frontend
            session = { session_id: null, session_code: 'PREVIEW', attempt_number: 1 };
        }
        
       

      

        // ⬇️ Calculate remaining time ⬇️
        let timeRemaining = null;
        
        if (quiz.time_limit) {
            const start = new Date(session.started_at).getTime();
            const now = new Date().getTime();
            const secondsElapsed = Math.floor((now - start) / 1000);
            timeRemaining = (quiz.time_limit * 60) - secondsElapsed;
            
            // If time is up, close the session, but DO NOT block the student
            if (timeRemaining <= 0) {
                // 1. Fail the old session
                await Session.complete(session.session_id, {
                    score: 0,
                    is_passed: false,
                    time_taken: quiz.time_limit * 60,
                    answered_questions: 0
                });

                // 2. Create a fresh session immediately
                session = await Session.create({
                    student_id: req.user.id,
                    quiz_id: quiz.quiz_id,
                    lesson_id: quiz.lesson_id,
                    session_type: quiz.quiz_purpose,
                    selected_questions: questions.map(q => q.question_id),
                    total_questions: questions.length
                });

                // 3. Give them the full time again
                timeRemaining = quiz.time_limit * 60; 
            }
        }

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
                attempt_number: session.attempt_number,
                time_remaining: timeRemaining
            }
        });

    } catch (error) {
        console.error('Quiz getForStudent Error:',error);
        res.status(500).json({error: 'Internal Server Error'});
        
    };

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


          let session = null;// to by pass the session for the teahcer
          const isTeacherTest = (session_id === 999999 && (req.user.role === 'teacher' || req.user.role === 'admin'));

 if (isTeacherTest) {
      // Fake session for teacher testing
      session = { session_id: 999999, student_id: req.user.id, quiz_id: quiz.quiz_id };
    } else {
      session = await Session.findById(session_id);
      if(!session) return res.status(400).json({error : 'session not found'})

      if(session.student_id !== req.user.id){
        return res.status(403).json({error : 'this session does not belong to you'});
      }




        
       
        if(session.quiz_id !== quiz.quiz_id){
            return res.status(400).json({error : 'Session does not match this quiz'})
        }
      }
        // ─── Backend Timer Enforcement ───
       

      
        
        const questionMap = new Map(questions.map(q => [q.question_id, q]));
        
        let correctCount = 0;
        const results = [];

        for( const answer of answers){
            const q = questionMap.get(answer.question_id);
            if(!q) continue;

            let isCorrect = false;
            let studentAnswerJSON = null;
            let svaReason = null;
            let nlpDetectedPattern = null;
             let detectedPhrasalVerb = null;


            // ─── Validate based on quiz type ───
            if (quiz.quiz_type === 'preposition') {
                isCorrect = Number(answer.selected_index) === q.correct_option_index;
                studentAnswerJSON = { selected_index: Number(answer.selected_index) };
                


                 } else if (quiz.quiz_type === 'irregular_verb') {
      const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
      const studentData = answer.data || {};
      
      // If the student didn't send any data, it's an automatic fail
      if (Object.keys(studentData).length === 0) {
        isCorrect = false;
        studentAnswerJSON = { data: {}, reason: 'No answers provided' };
      } else {
        let allCorrect = true;
        const correctAnswersMap = {
          present: q.present_form,
          past: q.past_form,
          future: q.future_form,
          past_participle: q.past_participle
        };

        for (const field of blanks) {
          const studentAnswer = String(studentData[field] || '').trim().toLowerCase();
          const correctAnswer = String(correctAnswersMap[field] || '').trim().toLowerCase();
          
          if (studentAnswer !== correctAnswer) {
            allCorrect = false;
          }
        }

        isCorrect = allCorrect;
        studentAnswerJSON = { data: studentData };
      }
    

    

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
                const nlpResult = await NlpService.validateSvaWithNlp(answer.text, q);

                // 2. Also run basic rules (word count, must_contain, etc.) — belt and suspenders
                const ruleResult = validateSvaAnswer(answer.text, q);

                // Both must pass
                isCorrect = nlpResult.isCorrect && ruleResult.isCorrect;

                // Prefer the NLP reason if it failed, else the rule reason
                svaReason = !nlpResult.isCorrect ? nlpResult.reason
                            : !ruleResult.isCorrect ? ruleResult.reason
                            : null;

                studentAnswerJSON = { text: answer.text || '', reason: svaReason };

    } else if (quiz.quiz_type === 'phrasal_verb') {
      // Use the NLP service instead of a simple string check
      const nlpResult = await NlpService.validatePhrasalVerbWithNlp(
        answer.text, 
        answer.phrasal_verb_answer
      );

      isCorrect = nlpResult.isCorrect;
      svaReason = nlpResult.reason;
       detectedPhrasalVerb = nlpResult.detectedVerb; 

      studentAnswerJSON = { 
        text: answer.text || '', 
        phrasal_verb_answer: answer.phrasal_verb_answer || '', 
        detected_verb: detectedPhrasalVerb,
        reason: svaReason 
      };
    
    } else if (quiz.quiz_type === 'sentence_pattern') {
      // The student sends: answer.text (their sentence) and answer.selected_pattern
      // We use winkNLP to verify if the sentence actually matches the selected pattern.
      const nlpResult = await NlpService.validateSentencePatternWithNlp(
        answer.text, answer.selected_pattern
      );

      isCorrect = nlpResult.isCorrect;
      
      studentAnswerJSON = {
        text: answer.text || '',
        selected_pattern: answer.selected_pattern || '',
        reason: nlpResult.reason || null,

      };

       nlpDetectedPattern = nlpResult.detected_pattern;
    }



            if (isCorrect) correctCount ++;

  if(!isTeacherTest){// save it its not a teachcer
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
                  score_earned: isCorrect ? q.points : 0,
                  time_taken: req.body.time_taken || 0,
             system_detected_answer: 
                  (quiz.quiz_type === 'sva' && svaReason) ? { detected: svaReason } :
                  (quiz.quiz_type === 'sentence_pattern' && nlpDetectedPattern) ? { pattern: nlpDetectedPattern } :
                  (quiz.quiz_type === 'phrasal_verb') ? { 
                    detected_verb: detectedPhrasalVerb, // 👈 Save the actual verb found
                    student_answer: answer.phrasal_verb_answer 
                  } :
    null
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
                    // correct_index: q.correct_option_index,
                    // correct_answer: q.correct_answer
                    } : {}),

                    ...(quiz.quiz_type === 'irregular_verb' ? {
                    student_answers: answer.data || '(none)',
                    present_form: q.present_form,
                    past_form: q.past_form,
                    future_form: q.future_form,
                    past_participle: q.past_participle,
                    blank_fields: q.blank_fields
                    } : {}),

                    ...(quiz.quiz_type === 'clause' ? {
                    selected_index: Number(answer.selected_index),
                    selected_answer: q.options[answer.selected_index] || null,
                    // correct_index: q.correct_option_index,
                    //correct_answer: q.options[q.correct_option_index],
                    selected_type: answer.selected_type || null,
                    //correct_type: q.clause_type,
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
                    //target_phrasal_verb: q.target_phrasal_verb,
                     phrasal_verb_answer: answer.phrasal_verb_answer || '',
                    example_sentence: q.example_sentence,
                    detected_verb: detectedPhrasalVerb,
                    reason: svaReason
                    } : {}),

                    ...(quiz.quiz_type === 'sentence_pattern' ? {
                    student_text: answer.text || '',
                    selected_pattern: answer.selected_pattern || '',
                   // correct_pattern: q.target_pattern,
                    //pattern_correct: String(answer.selected_pattern || '').trim().toUpperCase() === String(q.target_pattern || '').trim().toUpperCase(),
                    reason: studentAnswerJSON.reason
                    } : {}),
            });
        }}

        const total = results.length;
        const percentage = total > 0 ? (correctCount / total) * 100 : 0;
        const roundedPercentage = Math.round(percentage * 100) / 100;
        const passed = percentage >= Number(quiz.passing_score);

               // Count only the questions where the student actually provided an answer
        const actualAnsweredCount = answers.filter(a => {
            if (a.selected_index !== null && a.selected_index !== undefined) return true;
            if (a.text && a.text.trim() !== '') return true;
            if (a.selected_type) return true;
            if (a.selected_pattern) return true;
            if (a.phrasal_verb_answer && a.phrasal_verb_answer.trim() !== '') return true;
            if (a.data && Object.keys(a.data).length > 0) return true;
            return false;
        }).length;



         if (!isTeacherTest) {
        await Session.complete(session.session_id, {
            score: roundedPercentage,
            is_passed: passed,
            time_taken: time_taken || 0,
            answered_questions: actualAnsweredCount // ⬅️ Now it counts correctly!
        });


            // Update lesson progress - onl;y update if real student is pass
               // Only update progress if it's a real student session
        if (session_id !== 999999) {
            await Progress.ensureExists({
                student_id: req.user.id,
                lesson_id: quiz.lesson_id,
                initial_status: 'reading_required',
                final_available: true
            });

            if (passed) {
              await Progress.markPassed({
  student_id: req.user.id,
  lesson_id: quiz.lesson_id,
  score: roundedPercentage,
  time_spent: req.body.time_taken || 0
});
            } else {
               await Progress.markFailed({
  student_id: req.user.id,
  lesson_id: quiz.lesson_id,
  score: roundedPercentage,
  time_spent: req.body.time_taken || 0
});
            }
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
      }
    } catch (error) {
        console.error('submit Error',error);
        res.status(500).json({error : 'Server Error'});
        
    }
}
  
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


// ═══════════════════════════════════════════════════════
// TEACHER: Create quiz
// ═══════════════════════════════════════════════════════
exports.createQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const { 
      lesson_id, quiz_type, quiz_purpose, title, description,
      passing_score, time_limit, max_quiz_attempts, questions_per_quiz 
    } = req.body;

    if (!lesson_id || !quiz_type || !title) {
      return res.status(400).json({ error: 'lesson_id, quiz_type, and title are required' });
    }

    // 1. Check if a quiz already exists for this lesson
    if (quiz_purpose === 'final') {
      const [existing] = await pool.query(
        `SELECT quiz_id FROM quizzes WHERE lesson_id = ? AND quiz_purpose = 'final'`,
        [lesson_id]
      );

      if (existing.length > 0) {
        // If it exists, return the existing quiz ID so the frontend edits it instead of creating a new one
        return res.status(200).json({ 
          message: 'A final quiz already exists for this lesson.',
          quiz: { quiz_id: existing[0].quiz_id } 
        });
      }
    }

    // 2. Create the new quiz
    const [result] = await pool.query(
      `INSERT INTO quizzes 
       (lesson_id, teacher_id, quiz_type, quiz_purpose, title, description, passing_score, time_limit, max_quiz_attempts, questions_per_quiz, is_published) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        lesson_id, req.user.id, quiz_type, quiz_purpose || 'final', 
        title, description || null, // ⬅️ Fixed: Description is now saved
        passing_score || 70.00, time_limit || null,
        max_quiz_attempts || 3, questions_per_quiz || 10
      ]
    );

    res.status(201).json({ quiz: { quiz_id: result.insertId } });
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

    const question = await Model.create(questionData);

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

// ═══════════════════════════════════════════════════════
// TEACHER: Create an embedded quiz from the lesson editor
// ═══════════════════════════════════════════════════════
// 1. Save a new inline quiz
exports.createEmbeddedQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const { lesson_id, question_text, options, correct_option_index } = req.body;

    if (!lesson_id || !question_text || !options || correct_option_index === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO embedded_quizzes (lesson_id, question_text, options, correct_option_index, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [lesson_id, question_text, JSON.stringify(options), correct_option_index, req.user.id]
    );

    res.status(201).json({ quiz_id: result.insertId });
  } catch (err) {
    console.error('createEmbeddedQuiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 2. Check the student's answer
exports.checkInlineAnswer = async (req, res) => {
  try {
    const { quiz_id, selected_index } = req.body;
    
    const [rows] = await pool.query('SELECT correct_option_index FROM embedded_quizzes WHERE embed_quiz_id = ?', [quiz_id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    const isCorrect = Number(selected_index) === rows[0].correct_option_index;
    res.json({ isCorrect });
  } catch (err) {
    console.error('checkInlineAnswer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateQuizSettings = async (req, res) => {
  try {
    const { title, passing_score, time_limit, max_quiz_attempts, questions_per_quiz } = req.body;
    await pool.query(
      `UPDATE quizzes SET title=?, passing_score=?, time_limit=?, max_quiz_attempts=?, questions_per_quiz=? WHERE quiz_id=?`,
      [title, passing_score, time_limit || null, max_quiz_attempts || 3, questions_per_quiz || 10, req.params.id]
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }

};

// TEACHER: Suggest a new word
// TEACHER: Suggest a new word
exports.suggestWord = async (req, res) => {
  try {
    const { word, type, meaning } = req.body; // type: 'verb', 'collective_noun', or 'phrasal_verb'
    if (!word || !type) return res.status(400).json({ error: 'Word and type required' });

    // Check if it already exists in the main dictionary
    let table, column;
    if (type === 'verb') { table = 'verbs_dictionary'; column = 'base_form'; }
    else if (type === 'collective_noun') { table = 'collective_nouns_dictionary'; column = 'noun'; }
    else if (type === 'phrasal_verb') { table = 'phrasal_verbs_dictionary'; column = 'phrasal'; }
    else return res.status(400).json({ error: 'Invalid type' });

    const [existing] = await pool.query(`SELECT id FROM ${table} WHERE ${column} = ?`, [word.toLowerCase()]);
    if (existing.length > 0) return res.status(400).json({ error: 'Word already exists in dictionary' });

    const [pending] = await pool.query('SELECT id FROM grammar_suggestions WHERE word = ? AND type = ? AND status = "pending"', [word.toLowerCase(), type]);
    if (pending.length > 0) return res.status(400).json({ error: 'Word is already pending approval' });

    await pool.query(
      'INSERT INTO grammar_suggestions (word, type, meaning, suggested_by) VALUES (?, ?, ?, ?)',
      [word.toLowerCase(), type, meaning || null, req.user.id]
    );

    res.status(201).json({ message: 'Suggestion submitted. Waiting for admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ADMIN: Get pending suggestions
exports.getSuggestions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const [rows] = await pool.query(
      `SELECT s.*, t.full_name as teacher_name 
       FROM grammar_suggestions s 
       JOIN teachers t ON t.teacher_id = s.suggested_by 
       WHERE s.status = 'pending' ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// ADMIN: Approve a suggestion
exports.approveSuggestion = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const suggestionId = req.params.id;

    // 1. Get the suggestion details
    const [rows] = await pool.query('SELECT * FROM grammar_suggestions WHERE id = ?', [suggestionId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Suggestion not found' });
    
    const suggestion = rows[0];

    // 2. Add to the correct dictionary table
    if (suggestion.type === 'verb') {
      await pool.query('INSERT INTO verbs_dictionary (base_form, is_approved, created_by) VALUES (?, 1, ?)', 
        [suggestion.word, suggestion.suggested_by]);

    } else if (suggestion.type === 'collective_noun') {
      await pool.query('INSERT INTO collective_nouns_dictionary (noun, is_approved, created_by) VALUES (?, 1, ?)', 
        [suggestion.word, suggestion.suggested_by]);

    }else if (suggestion.type === 'phrasal_verb') {
  // Split "give up" into base verb and particle (simple heuristic)
  const parts = suggestion.word.trim().split(/\s+/);
  const baseVerb = parts[0];
  const particle = parts.slice(1).join(' ');
  await pool.query(
    'INSERT INTO phrasal_verbs_dictionary (phrasal, base_verb, particle, meaning, is_approved, created_by) VALUES (?, ?, ?, ?, 1, ?)',
    [suggestion.word, baseVerb, particle, suggestion.meaning, suggestion.suggested_by]
  );
}

    // 3. Update status to approved
    await pool.query('UPDATE grammar_suggestions SET status = "approved" WHERE id = ?', [suggestionId]);

    res.json({ success: true, message: 'Suggestion approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
};

exports.rejectSuggestion = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    
    const suggestionId = req.params.id;

    await pool.query('UPDATE grammar_suggestions SET status = "rejected" WHERE id = ?', [suggestionId]);

    res.json({ success: true, message: 'Suggestion rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
};

// TEACHER: Delete a question
exports.deleteQuestion = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const { id, questionId } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const Model = QuestionFactory.getModel(quiz.quiz_type);
    if (!Model) return res.status(400).json({ error: 'Unknown quiz type' });

    // Delete the question (assuming all models have a delete function)
    await pool.query(`DELETE FROM ${quiz.quiz_type}_quiz WHERE question_id = ?`, [questionId]);

    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error('deleteQuestion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// TEACHER: Update a question
exports.updateQuestion = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const { id, questionId } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const type = quiz.quiz_type;
    const payload = req.body;

    // Here we do a simple delete + insert to handle all 6 quiz types easily
    await pool.query(`DELETE FROM ${type}_quiz WHERE question_id = ?`, [questionId]);

    // Now insert it as a new question (using the Model factory)
    const Model = QuestionFactory.getModel(type);
    const newQuestionData = { ...payload, quiz_id: quiz.quiz_id, created_by: req.user.id };
    await Model.create(newQuestionData);

    res.json({ message: 'Question updated successfully' });
  } catch (err) {
    console.error('updateQuestion error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// DELETE /api/quizzes/:id
exports.deleteQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Teacher access only' });
    }

    const quizId = req.params.id;

    // Delete the quiz (Foreign keys will cascade and delete the questions)
    const [result] = await pool.query('DELETE FROM quizzes WHERE quiz_id = ?', [quizId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('deleteQuiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// TEACHER: Get all approved dictionary words
exports.getDictionary = async (req, res) => {
  try {
    const [verbs] = await pool.query('SELECT base_form as word FROM verbs_dictionary WHERE is_approved = 1');
    const [nouns] = await pool.query('SELECT noun as word FROM collective_nouns_dictionary WHERE is_approved = 1');
    
    res.json({
      verbs: verbs.map(v => v.word),
      nouns: nouns.map(n => n.word)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// controllers/quizController.js
exports.getQuizQuestions = async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // 1. Get the quiz to know its type
    const [quizRows] = await pool.query('SELECT quiz_type FROM quizzes WHERE quiz_id = ?', [quizId]);
    if (quizRows.length === 0) return res.status(404).json({ error: 'Quiz not found' });
    
    const type = quizRows[0].quiz_type;
    
    // 2. Fetch from the correct table
    let table = '';
    if (type === 'irregular_verb') table = 'irregular_verb_quiz';
    else if (type === 'preposition') table = 'preposition_quiz';
    else if (type === 'clause') table = 'clause_quiz';
    else if (type === 'phrasal_verb') table = 'phrasal_verb_quiz';
    else if (type === 'sva') table = 'sva_quiz';
    else if (type === 'sentence_pattern') table = 'sentence_pattern_quiz';
    else return res.status(400).json({ error: 'Unknown quiz type' });

    const [questions] = await pool.query(`SELECT * FROM ${table} WHERE quiz_id = ?`, [quizId]);
    res.json(questions);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.testSubmit = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // 1. Fetch questions
    let questions;
    if (quiz.quiz_type === 'preposition') questions = await PrepositionQuiz.findByQuiz(quiz.quiz_id);
    else if (quiz.quiz_type === 'irregular_verb') questions = await IrregularVerbQuiz.findByQuiz(quiz.quiz_id);
    else if (quiz.quiz_type === 'clause') questions = await ClauseQuiz.findByQuiz(quiz.quiz_id);
    else if (quiz.quiz_type === 'sva') questions = await SvaQuiz.findByQuiz(quiz.quiz_id);
    else if (quiz.quiz_type === 'phrasal_verb') questions = await PhrasalVerbQuiz.findByQuiz(quiz.quiz_id);
    else if (quiz.quiz_type === 'sentence_pattern') questions = await SentencePatternQuiz.findByQuiz(quiz.quiz_id);

    const { answers } = req.body;
    const questionMap = new Map(questions.map(q => [q.question_id, q]));
    
    let correctCount = 0;
    const results = [];

    for (const answer of answers) {
      const q = questionMap.get(answer.question_id);
      if (!q) continue;

      let isCorrect = false;
      let studentAnswerJSON = null;
      let svaReason = null;
      let nlpDetectedPattern = null;
      let detectedPhrasalVerb = null;

      // ─── VALIDATION LOGIC (Identical to Student) ───
      if (quiz.quiz_type === 'preposition') {
        isCorrect = Number(answer.selected_index) === q.correct_option_index;
      } 
      else if (quiz.quiz_type === 'irregular_verb') {
        const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
        const studentData = answer.data || {};
        let allCorrect = true;
        const correctAnswersMap = { present: q.present_form, past: q.past_form, future: q.future_form, past_participle: q.past_participle };
        for (const field of blanks) {
          if (String(studentData[field] || '').trim().toLowerCase() !== String(correctAnswersMap[field] || '').trim().toLowerCase()) {
            allCorrect = false;
          }
        }
        isCorrect = allCorrect && Object.keys(studentData).length > 0;
      } 
      else if (quiz.quiz_type === 'clause') {
        const clauseCorrect = Number(answer.selected_index) === q.correct_option_index;
        const typeCorrect = String(answer.selected_type || '').trim().toLowerCase() === String(q.clause_type || '').trim().toLowerCase();
        isCorrect = clauseCorrect && typeCorrect;
      }
      else if (quiz.quiz_type === 'sva') {
        const nlpResult = await NlpService.validateSvaWithNlp(answer.text, q);
        const ruleResult = validateSvaAnswer(answer.text, q);
        isCorrect = nlpResult.isCorrect && ruleResult.isCorrect;
        svaReason = !nlpResult.isCorrect ? nlpResult.reason : !ruleResult.isCorrect ? ruleResult.reason : null;
      } 
      else if (quiz.quiz_type === 'phrasal_verb') {
         const nlpResult = await NlpService.validatePhrasalVerbWithNlp(
          answer.text, 
          answer.phrasal_verb_answer
        );
        isCorrect = nlpResult.isCorrect;
        svaReason = nlpResult.reason;
        detectedPhrasalVerb = nlpResult.detectedVerb;
      } 
      else if (quiz.quiz_type === 'sentence_pattern') {
        const nlpResult = await NlpService.validateSentencePatternWithNlp(answer.text, answer.selected_pattern);
        isCorrect = nlpResult.isCorrect;
        svaReason = nlpResult.reason;
        nlpDetectedPattern = nlpResult.detected_pattern;
      }

      if (isCorrect) correctCount++;

      // Format the result to send back
      results.push({
        question_id: q.question_id,
        is_correct: isCorrect,
        ...(quiz.quiz_type === 'preposition' ? { selected_answer: q.options[answer.selected_index] || null, correct_answer: q.options[q.correct_option_index] } : {}),
        ...(quiz.quiz_type === 'irregular_verb' ? { student_answers: answer.data || {}, present_form: q.present_form, past_form: q.past_form, future_form: q.future_form, past_participle: q.past_participle ,blank_fields: q.blank_fields } : {}),
        ...(quiz.quiz_type === 'clause' ? { selected_answer: q.options[answer.selected_index] || null, correct_answer: q.options[q.correct_option_index], selected_type: answer.selected_type, correct_type: q.clause_type ,question_text: q.question_text} : {}),
        ...(quiz.quiz_type === 'sva' ? { student_text: answer.text || '', example_sentence: q.example_sentence,instruction: q.instruction, reason: svaReason } : {}),
          ...(quiz.quiz_type === 'phrasal_verb' ? { 
            student_text: answer.text || '', 
            phrasal_verb_answer: answer.phrasal_verb_answer || '', 
            detected_verb: detectedPhrasalVerb, 
            reason: svaReason 
        } : {}),
        ...(quiz.quiz_type === 'sentence_pattern' ? { student_text: answer.text || '', selected_pattern: answer.selected_pattern || '', detected_pattern: nlpDetectedPattern, reason: svaReason } : {}),
      });
    }

    const total = results.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    res.json({
      score: correctCount,
      total,
      percentage,
      passed: percentage >= Number(quiz.passing_score),
      results
    });

  } catch (error) {
    console.error('testSubmit Error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

// ═══════════════════════════════════════════════════════
// STUDENT: List all final quizzes for their grade, with lock state
// GET /api/quizzes/final-list
// ═══════════════════════════════════════════════════════
exports.listFinalQuizzesForStudent = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access only' });
    }

    const studentId = req.user.id;

    // ─── 1. Get the student's grade level ───
    const [studentRows] = await pool.query(
      'SELECT grade_level FROM students WHERE student_id = ?',
      [studentId]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const gradeLevel = String(studentRows[0].grade_level);

    // ─── 2. Fetch all published lessons for this grade with their final quiz + progress ───
    //    Count of total items comes from the per-type quiz table via the quiz_type.
    const [rows] = await pool.query(
      `SELECT
         l.lesson_id,
         l.lesson_order,
         l.title           AS lesson_title,
         l.description     AS lesson_description,
         l.prerequisite_lesson_id,
         q.quiz_id,
         q.title           AS quiz_title,
         q.description     AS quiz_description,
         q.quiz_type,
         q.passing_score,
         q.time_limit,
         q.max_quiz_attempts,
         slp.reading_status,
         slp.final_quiz_status,
         slp.best_quiz_score,
         slp.final_quiz_attempts,
         slp.lesson_status,
         (SELECT COUNT(*) FROM preposition_quiz       WHERE quiz_id = q.quiz_id) AS prep_count,
         (SELECT COUNT(*) FROM irregular_verb_quiz    WHERE quiz_id = q.quiz_id) AS iv_count,
         (SELECT COUNT(*) FROM clause_quiz            WHERE quiz_id = q.quiz_id) AS clause_count,
         (SELECT COUNT(*) FROM phrasal_verb_quiz      WHERE quiz_id = q.quiz_id) AS pv_count,
         (SELECT COUNT(*) FROM sva_quiz               WHERE quiz_id = q.quiz_id) AS sva_count,
         (SELECT COUNT(*) FROM sentence_pattern_quiz  WHERE quiz_id = q.quiz_id) AS sp_count
       FROM lessons l
       LEFT JOIN quizzes q
         ON q.lesson_id = l.lesson_id
        AND q.quiz_purpose = 'final'
        AND q.is_published = 1
       LEFT JOIN student_lesson_progress slp
         ON slp.lesson_id = l.lesson_id
        AND slp.student_id = ?
       WHERE l.is_published = 1
         AND JSON_CONTAINS(l.grade_level, JSON_QUOTE(?))
       ORDER BY l.lesson_order ASC, l.lesson_id ASC`,
      [studentId, gradeLevel]
    );

    // ─── 3. Compute lock/status per row ───
    //    Rule: quiz N is locked unless quiz N-1 is passed.
    //    The first final quiz is unlocked if the lesson itself is not locked.
    let previousQuizPassed = true;
    const result = rows.map((r) => {
      const finalStatus = r.final_quiz_status || 'locked';
      const isPassed =
        finalStatus === 'completed' ||
        finalStatus === 'passed';

      // Total items — pick whichever type table has a count for this quiz
      const totalItems =
        r.prep_count || r.iv_count || r.clause_count ||
        r.pv_count || r.sva_count || r.sp_count || 0;

      // No final quiz authored for this lesson → skip entirely
      if (!r.quiz_id) {
        previousQuizPassed = false; // no quiz = next one shouldn't auto-unlock
        return null;
      }

      // Determine status
      let status;
      if (!previousQuizPassed) {
        status = 'locked';
      } else if (isPassed) {
        status = 'passed';
      } else if (finalStatus === 'failed') {
        status = 'failed';
      } else if (r.final_quiz_attempts > 0 && finalStatus === 'in_progress') {
        status = 'in_progress';
      } else {
        // Lock the final if the lesson hasn't been read AND requires reading
        // (your current schema doesn't have a per-lesson require_reading flag,
        //  so we default to allowing direct attempts for flexibility.)
        status = 'open';
      }

      // Advance the pointer — next quiz unlocks only if this one is passed
      previousQuizPassed = (status === 'passed');

      return {
        quiz_id: r.quiz_id,
        lesson_id: r.lesson_id,
        lesson_order: r.lesson_order,
        lesson_title: r.lesson_title,
        title: r.quiz_title,
        description: r.quiz_description,
        quiz_type: r.quiz_type,
        passing_score: Number(r.passing_score),
        time_limit: r.time_limit,
        max_attempts: r.max_quiz_attempts,
        status,
        best_score: r.best_quiz_score !== null ? Number(r.best_quiz_score) : null,
        total_items: totalItems,
        attempts: r.final_quiz_attempts || 0,
        reading_status: r.reading_status || 'not_started'
      };
    }).filter(Boolean);

    res.json({ quizzes: result });
  } catch (err) {
    console.error('listFinalQuizzesForStudent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
