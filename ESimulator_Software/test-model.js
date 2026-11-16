// test-answer-model.js
require('dotenv').config();
const Session = require('./models/sessionModel');
const Answer  = require('./models/answerModel');

async function test() {
  try {
    // Create a session to attach answers to
    const session = await Session.create({
      student_id: 5,
      quiz_id: 4,
      lesson_id: 2,
      session_type: 'review',
      selected_questions: [1, 2, 3],
      total_questions: 3
    });
    console.log('Created session:', session.session_id);

    // Save 3 answers
    console.log('\n--- TEST 1: save 3 answers ---');
    for (let i = 1; i <= 3; i++) {
      const ans = await Answer.save({
        session_id: session.session_id,
        student_id: 5,
        quiz_id: 4,
        lesson_id: 3,
        answer_type: 'review',
        question_type: 'preposition',
        question_id: i,
        student_answer: { selected_index: i - 1 },
        is_correct: i === 2 ? 0 : 1,   // middle one is wrong
        score_earned: i === 2 ? 0 : 1
      });
      console.log(`  Saved answer_id ${ans.answer_id} for question ${i}`);
    }

    console.log('\n--- TEST 2: findBySession ---');
    const answers = await Answer.findBySession(session.session_id);
    answers.forEach(a => {
      console.log(`  Q${a.question_id}: ${JSON.stringify(a.student_answer)} — correct: ${a.is_correct}`);
    });

    console.log('\n✅ All answer model tests passed.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    process.exit(0);
  }
}

test();