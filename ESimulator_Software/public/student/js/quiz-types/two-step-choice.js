(function () {
  'use strict';
  window.QuizTypes = window.QuizTypes || {};

  window.QuizTypes.twoStepChoice = function (q, ans, currentIdx, total, shared) {
    const selectedIndex = ans.selected_index;
    const selectedType = ans.selected_type;

    const clauseOptions = q.options.map((opt, idx) => `
      <button class="answer ${selectedIndex === idx ? 'answer--correct' : ''}" 
              aria-pressed="${selectedIndex === idx}" 
              onclick="selectClause(${idx})">
        <span class="answer-marker"></span>
        <span>${QuizUI.escapeHtml(opt)}</span>
      </button>
    `).join('');

    // ─── Clause type as a row of toggle buttons ───
    const typeButtons = CLAUSE_TYPES.map(type => `
      <button class="answer ${selectedType === type ? 'answer--correct' : ''}" 
              aria-pressed="${selectedType === type}" 
              onclick="selectType('${type}')"
              style="min-height: 36px; padding: 8px 14px;">
        <span>${QuizUI.escapeHtml(type)}</span>
      </button>
    `).join('');

    return `
      ${QuizUI.buildExitLink()}
      ${QuizUI.buildInstructions('two_step_choice')}
      <div class="quiz-card">
        ${shared.topBar}
        ${shared.tracker}
        <div class="exercise">
          <p class="sentence">${QuizUI.escapeHtml(q.sentence || '')}</p>

          <div class="question-block" style="margin-top: 20px;">
            <p class="question" style="font-weight: bold; color: #031b50;">Step 1: Select the clause</p>
            <div class="answers" role="group">${clauseOptions}</div>
          </div>

          <div class="question-block" style="margin-top: 20px;">
            <p class="question" style="font-weight: bold; color: #031b50;">
              Step 2: Select the clause type 
              <span style="color:#dc2626; font-weight:700;"> *</span>
            </p>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${typeButtons}
            </div>
          </div>
        </div>
        ${QuizUI.buildActions(currentIdx, total)}
      </div>
    `;
  };
})();