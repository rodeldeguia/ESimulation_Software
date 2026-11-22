(function () {
  'use strict';
  window.QuizTypes = window.QuizTypes || {};

  window.QuizTypes.sentenceConstruction = function (q, ans, currentIdx, total, shared) {
    const currentText = ans.text || '';
    const currentVerbAnswer = ans.phrasal_verb_answer || '';
    const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
    const isPhrasalVerb = (quiz.quiz_type === 'phrasal_verb');

    // ─── Phrasal Verb ───
    if (isPhrasalVerb) {
      return `
      ${QuizUI.buildExitLink()}
      ${QuizUI.buildInstructions('phrasal_verb')}
        <div class="quiz-card">
          ${shared.topBar}
          ${shared.tracker}
          <div class="exercise">
            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:14px; color:#031b50; margin-bottom:8px; font-weight:600;">Type your sentence:</label>
              <input type="text" id="textAnswer" value="${QuizUI.escapeHtml(currentText)}" placeholder="Please type here..."
                oninput="recordTextAnswer(this.value); updateWordCount(this.value)"
                style="width:100%; padding:12px; border-radius:6px; border:2px solid #b0d3ee; font-size:14px; outline:none;">
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:14px; color:#031b50; margin-bottom:8px; font-weight:600;">Type the phrasal verb:</label>
              <input type="text" id="verbAnswer" value="${QuizUI.escapeHtml(currentVerbAnswer)}" placeholder="Please type here..."
                oninput="recordPhrasalVerb(this.value)"
                style="width:100%; padding:12px; border-radius:6px; border:2px solid #b0d3ee; font-size:14px; outline:none;">
            </div>
            <div id="duplicateError" style="display:none; color:#dc2626; font-size:12px; font-weight:700; text-align:center;"></div>
          </div>
          ${QuizUI.buildActions(currentIdx, total)}
        </div>
      `;
    }

    // ─── SVA ───
    return `
      ${QuizUI.buildExitLink()}
      ${QuizUI.buildInstructions('sva')}
      <div class="quiz-card">
        ${shared.topBar}
        ${shared.tracker}
        <div class="exercise">
          <div style="background:#fff; padding:12px 14px; border-radius:4px; border:1px solid #b0d3ee; margin-bottom:16px;">
            ${q.context ? `<div style="font-size:12px; color:#78350f; margin-bottom:8px;"><strong>Context:</strong> ${QuizUI.escapeHtml(q.context)}</div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#031b50; flex-wrap:wrap; gap:6px;">
              <div>Target: <strong>${QuizUI.escapeHtml(q.subject_type)}</strong> subject, <strong>${QuizUI.escapeHtml(q.verb_type)}</strong> verb</div>
              <div style="color:#64748b; font-weight:600;">${q.min_sentence_length}–${q.max_sentence_length} words</div>
            </div>
          </div>
          <div class="question-block" style="margin-top:0;">
            <p class="question" style="font-weight:bold; color:#031b50; margin-bottom:8px;">Your sentence:</p>
            <textarea id="textAnswer" rows="3" placeholder="Write your sentence here..." oninput="recordTextAnswer(this.value); updateWordCount(this.value)"
              style="width:100%; padding:12px; border:2px solid #b0d3ee; border-radius:4px; font-size:14px; outline:none; resize:vertical;">${QuizUI.escapeHtml(currentText)}</textarea>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <div id="duplicateError" style="display:none; color:#dc2626; font-size:12px; font-weight:600;"></div>
              <div style="text-align:right; font-size:12px; color:#64748b; font-weight:600; margin-left:auto;" id="wordCountDisplay">${wordCount} word${wordCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
        ${QuizUI.buildActions(currentIdx, total)}
      </div>
    `;
  };
})();