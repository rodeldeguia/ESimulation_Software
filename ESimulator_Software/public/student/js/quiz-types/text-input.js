(function () {
  'use strict';
  window.QuizTypes = window.QuizTypes || {};

  // Irregular verb variant (4 fields) + standard fallback
  window.QuizTypes.textInput = function (q, ans, currentIdx, total, shared) {
    if (q.blank_fields) {
      const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
      const answersObj = ans.data || {};
      const checkedFields = ans.checkedFields || {};
      const correctMap = { present: q.present_form, past: q.past_form, future: q.future_form, past_participle: q.past_participle };

      const renderInput = (label, field, value) => {
        const isBlank = blanks.includes(field);
        const studentValue = answersObj[field] || '';
        const isChecked = !!checkedFields[field];
        const isCorrect = isChecked && studentValue.trim().toLowerCase() === String(value || '').trim().toLowerCase();
        const borderColor = isChecked ? (isCorrect ? '#16a34a' : '#dc2626') : '#b0d3ee';
        return `
          <div style="flex:1; min-width:120px; text-align:center;">
            ${isBlank
              ? `<input type="text" id="iv_${field}" value="${QuizUI.escapeHtml(studentValue)}"
                   oninput="recordIrregularVerb('${field}', this.value)"
                   style="width:100%; padding:12px; border:2px solid ${borderColor}; border-radius:6px; text-align:center; font-size:14px; outline:none;">`
              : `<div style="padding:12px; border-radius:6px; background:#e2eef9; font-size:14px; color:#334155; text-align:center;">${QuizUI.escapeHtml(String(value || ''))}</div>`}
            <div style="font-size:12px; color:#334155; margin-top:8px; font-weight:600;">${label}</div>
          </div>`;
      };

            // Transient banner (shows for 2.5s after CHECK is clicked)
      let bannerHtml = '';
      const bannerAge = ans.bannerShownAt ? Date.now() - ans.bannerShownAt : Infinity;
      if (bannerAge < 2500) {
        const filledFields = blanks.filter(f => (answersObj[f] || '').trim() !== '');
        const anyWrong = filledFields.some(f =>
          checkedFields[f] &&
          (answersObj[f] || '').trim().toLowerCase() !== String(correctMap[f] || '').trim().toLowerCase()
        );
        const allCorrect =
          filledFields.length > 0 &&
          filledFields.every(f =>
            checkedFields[f] &&
            (answersObj[f] || '').trim().toLowerCase() === String(correctMap[f] || '').trim().toLowerCase()
          );

        if (anyWrong) {
          bannerHtml = `
            <div style="position:absolute; top:-25px; left:30px; background:#dc2626; color:white; padding:14px 22px; border-radius:8px; display:flex; align-items:center; gap:12px; box-shadow:0 4px 6px rgba(0,0,0,0.15); z-index:10;">
              <div style="background:white; color:#dc2626; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">✖</div>
              <div>
                <div style="font-size:16px; font-weight:800; line-height:1;">Incorrect!</div>
                <div style="font-size:12px; margin-top:4px;">Please review the highlighted field(s).</div>
              </div>
            </div>`;
        } else if (allCorrect) {
          bannerHtml = `
            <div style="position:absolute; top:-25px; left:30px; background:#16a34a; color:white; padding:14px 22px; border-radius:8px; display:flex; align-items:center; gap:12px; box-shadow:0 4px 6px rgba(0,0,0,0.15); z-index:10;">
              <div style="background:white; color:#16a34a; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">✔</div>
              <div>
                <div style="font-size:16px; font-weight:800; line-height:1;">Correct!</div>
                <div style="font-size:12px; margin-top:4px;">Great job! That's the right answer.</div>
              </div>
            </div>`;
        }
      }

      return `
      ${QuizUI.buildExitLink()}
      ${QuizUI.buildInstructions('text_input')}
        <div class="quiz-card" style="position:relative;">
          ${shared.topBar}
          ${shared.tracker}
          <div class="exercise" style="position:relative;">
            ${bannerHtml}
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px;">
              <div style="font-size:14px; font-weight:700; color:#0d1b3e; width:100%;">Input ➡</div>
              ${renderInput('Present', 'present', q.present_form)}
              ${renderInput('Past', 'past', q.past_form)}
              ${renderInput('Future', 'future', q.future_form)}
              ${renderInput('Past Participle', 'past_participle', q.past_participle)}
            </div>
          </div>
          ${QuizUI.buildActions(currentIdx, total, { onCheck: 'checkIrregularVerbAnswer()' })}
        </div>
      `;
    }

    // Standard text input (not used often, but kept for safety)
    return `
      <div class="quiz-card">
        ${shared.topBar}
        ${shared.tracker}
        <div class="exercise">
          <textarea id="textAnswer" rows="3" placeholder="Type your answer..." oninput="recordTextAnswer(this.value)"
            style="width:100%; padding:12px; border:2px solid #b0d3ee; border-radius:4px; font-size:14px; outline:none;">${QuizUI.escapeHtml(ans.text || '')}</textarea>
        </div>
        ${QuizUI.buildActions(currentIdx, total)}
      </div>
    `;
  };
})();