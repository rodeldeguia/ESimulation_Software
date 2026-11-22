(function () {
  'use strict';
  window.QuizTypes = window.QuizTypes || {};

  window.QuizTypes.patternChoice = function (q, ans, currentIdx, total, shared) {
    const currentText = ans.text || '';
    const selectedPattern = ans.selected_pattern || '';

    const patternButtons = q.allowed_patterns.map(pattern => `
      <button class="answer ${selectedPattern === pattern ? 'answer--correct' : ''}" aria-pressed="${selectedPattern === pattern}" onclick="recordPattern('${QuizUI.escapeHtml(pattern)}'); renderQuestion();">
        <span class="answer-marker"></span><span>${QuizUI.escapeHtml(pattern)}</span>
      </button>
    `).join('');

    return `
    ${QuizUI.buildExitLink()}
    ${QuizUI.buildInstructions('pattern_choice')}
      <div class="quiz-card">
        ${shared.topBar}
        ${shared.tracker}
        <div class="exercise">
          <label style="display:block; font-size:13px; color:#031b50; margin-bottom:8px; font-weight:600;">Your sentence:</label>
          <input id="sentence" type="text" value="${QuizUI.escapeHtml(currentText)}" placeholder="Type your sentence here..." oninput="recordTextAnswer(this.value)"
            style="width:100%; padding:12px; border:2px solid #b0d3ee; border-radius:4px; font-size:14px; outline:none; margin-bottom:20px;">
          <div class="question-block" style="margin-top:0;">
            <p class="question" style="font-weight:bold; color:#031b50;">Select the sentence pattern:</p>
            <div class="answers" role="group">${patternButtons}</div>
          </div>
        </div>
        ${QuizUI.buildActions(currentIdx, total, { onCheck: 'checkPatternAnswer()' })}
      </div>
    `;
  };
})();