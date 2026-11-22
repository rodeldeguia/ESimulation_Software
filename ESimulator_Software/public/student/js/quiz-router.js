// public/student/js/quiz-router.js
// Decides which quiz-type renderer to call. Exposed globally as window.renderQuestion

(function () {
  'use strict';

  window.renderQuestion = function () {
    const q = questions[currentIdx];
    const app = document.getElementById('app');

    // Shared pieces that every renderer needs
    const shared = {
      topBar: QuizUI.buildTopBar(!!quiz.time_limit, currentIdx, questions.length),
      tracker: QuizUI.buildTrackerPanel(questions, currentIdx, answers)
    };

    // Pick the right renderer based on question type
    let renderer = null;

    if (q.question_type === 'text_input' && q.blank_fields) {
      renderer = window.QuizTypes.textInput; // irregular verb variant
    } else {
      // Normalize the key: multiple_choice → multipleChoice, two_step_choice → twoStepChoice, etc.
      const keyMap = {
        multiple_choice: 'multipleChoice',
        text_input: 'textInput',
        two_step_choice: 'twoStepChoice',
        pattern_choice: 'patternChoice',
        sentence_construction: 'sentenceConstruction'
      };
      const key = keyMap[q.question_type];
      renderer = window.QuizTypes[key];
    }

    if (!renderer) {
      app.innerHTML = `<div class="quiz-card" style="padding:20px; color:white;">Unsupported quiz type: ${q.question_type}</div>`;
      return;
    }

    app.innerHTML = renderer(q, answers[currentIdx], currentIdx, questions.length, shared);
    if (quiz.time_limit) updateTimerDisplay();
  };
})();