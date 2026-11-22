(function () {
  'use strict';
  window.QuizTypes = window.QuizTypes || {};

  window.QuizTypes.multipleChoice = function (q, ans, currentIdx, total, shared) {
    const selected = ans.selected_index;
    const contextHtml = q.sentence ? `<p class="sentence">${QuizUI.escapeHtml(q.sentence)}</p>` : '';

    const optionsHtml = q.options.map((opt, idx) => `
      <button class="answer ${selected === idx ? 'answer--correct' : ''}" aria-pressed="${selected === idx}" onclick="selectOption(${idx})">
        <span class="answer-marker"></span><span>${QuizUI.escapeHtml(opt)}</span>
      </button>
    `).join('');

    return `
    ${QuizUI.buildExitLink()}
    ${QuizUI.buildInstructions('multiple_choice')}
      <div class="quiz-card">
        ${shared.topBar}
        ${shared.tracker}
        <div class="exercise">
          ${contextHtml}
          <div class="question-block">
            <p class="question">${QuizUI.escapeHtml(q.question_text || 'Select the correct answer:')}</p>
            <div class="answers" role="group">${optionsHtml}</div>
          </div>
        </div>
        ${QuizUI.buildActions(currentIdx, total)}
      </div>
    `;
  };
})();