// public/student/js/quiz-ui.js
// Shared UI builders for all quiz types.
// Exposed globally as window.QuizUI

(function () {
  'use strict';

  // ─── Escape user/backend content ───
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ─── Inject shared CSS once ───
  function injectStyles() {
    if (document.getElementById('quiz-ui-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'quiz-ui-styles';
    styleEl.innerHTML = `
      .quiz-card { position: relative; margin-top: 24px; background: #031b50; border-radius: 2px; min-height: 265px; padding: 0 14px 12px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
      .quiz-top { position: relative; height: 58px; display: flex; justify-content: space-between; align-items: center; padding: 0 10px; }
      .counter { color: #ffbd00; font-size: 17px; font-weight: 900; letter-spacing: .3px; }
      .timer { background: rgba(255,255,255,0.15); color: white; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 700; display: inline-block; }
      .timer.warning { background: #dc2626; animation: pulse 1s infinite; }
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
      .more { background: transparent; color: white; font-size: 15px; font-weight: 700; padding: 0 2px; letter-spacing: -1px; border: none; cursor: pointer; }
      .exercise { background: #cde8fc; border-radius: 8px; min-height: 153px; display: flex; flex-direction: column; padding: 20px 25px; margin: 0 10px; }
      .sentence { margin: 0; background: #fff; padding: 12px 14px; min-height: 38px; font-size: 13px; line-height: 1.4; color: #000; border-radius: 4px; border: 1px solid #b0d3ee; font-style: italic; }
      .question-block { width: 100%; margin-top: 20px; }
      .question { margin: 0 0 10px 0; font-size: 12px; color: #4b4b4b; }
      .answers { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; }
      .answer { width: 100%; min-height: 36px; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 4px; background: #fff; border: 1px solid #b0d3ee; text-align: left; font-size: 12px; color: #061c43; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
       .answer:not(.answer--correct):not(.selected):hover {
        background: #edf4ff;
        border-color: #5e78af;
      }
      .answer:hover { background: #edf4ff; border-color: #5e78af; }
       .answer.selected,
      .answer.answer--correct {
        background: #5e78af;
        color: white;
        border-color: #5e78af;
        font-weight: 600;
        cursor: default;
      }

       .answer.selected,
      .answer.answer--correct {
        background: #5e78af;
        color: white;
        border-color: #5e78af;
        font-weight: 600;
        cursor: default;
      }
     .answer-marker { width: 15px; height: 15px; flex-shrink: 0; border: 1px solid #88a3b3; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; line-height: 13px; }
         .answer.selected .answer-marker,
      .answer.answer--correct .answer-marker {
        border-color: #fff;
        background: #fff;
        color: #5e78af;
      }
      .quiz-actions { height: 50px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
      .next { background: #5a7f38; color: white; border: none; padding: 8px 30px; border-radius: 4px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: 0.2s; }
      .next:hover { filter: brightness(1.1); }
      .prev-btn, .check { background: #a1a3a2; color: white; border: none; padding: 8px 20px; border-radius: 4px; font-size: 12px; font-weight: 800; cursor: pointer; }
      .prev-btn:hover, .check:hover { filter: brightness(1.1); }
      @media (max-width: 600px) {
        .exercise { padding: 15px; margin: 0 5px; }
        .answer { height: auto; min-height: 36px; padding: 8px 10px; }
        .quiz-actions { padding: 0 10px; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ─── Determine if a given question has been answered ───
  function isQuestionAnswered(idx, questions, answers) {
    const a = answers[idx];
    const q = questions[idx];
    if (!a || !q) return false;

    if (a.question_type === 'multiple_choice') return a.selected_index !== null;

    if (a.question_type === 'text_input') {
      if (q.blank_fields) {
        const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
        const studentData = a.data || {};
        return blanks.some(field => studentData[field] && studentData[field].trim() !== '');
      }
      return !!(a.text && a.text.trim() !== '');
    }

    if (a.question_type === 'two_step_choice') {
      return a.selected_index !== null && a.selected_type !== null;
    }

    if (a.question_type === 'pattern_choice') {
      return !!(a.text && a.text.trim() !== '' && a.selected_pattern !== null && a.selected_pattern !== '');
    }

    if (a.question_type === 'sentence_construction') {
      if (q.subject_type) return !!(a.text && a.text.trim() !== '');
      return !!(a.text && a.text.trim() !== '' && a.phrasal_verb_answer && a.phrasal_verb_answer.trim() !== '');
    }

    return false;
  }

  // ─── Top bar: Timer (left), Counter (center), ••• (right) ───
  function buildTopBar(hasTimer, currentIdx, total) {
    const timerHtml = hasTimer
      ? `<div class="timer" id="timer">⏱ --:--</div>`
      : '';
    return `
      <div class="quiz-top">
        <div style="display:flex; align-items:center;">${timerHtml}</div>
        <span class="counter" style="position:absolute; left:50%; transform:translateX(-50%);">${currentIdx + 1}/${total}</span>
        <button class="more" aria-label="Toggle Question Tracker" onclick="toggleTracker()">•••</button>
      </div>
    `;
  }

  // ─── Tracker panel ───
  function buildTrackerPanel(questions, currentIdx, answers) {
    const boxes = questions.map((_, i) => {
      const isCurrent = i === currentIdx;
      const isAnswered = isQuestionAnswered(i, questions, answers);
      const bgColor = isCurrent ? '#031b50' : (isAnswered ? '#5e78af' : '#e2e8f0');
      const textColor = isCurrent || isAnswered ? 'white' : '#475569';
      const border = isCurrent ? '2px solid #ffbd00' : '1px solid #cbd5e1';
      return `<button onclick="jumpToQuestion(${i})" style="background:${bgColor}; color:${textColor}; border:${border}; border-radius:4px; height:36px; font-size:13px; font-weight:700; cursor:pointer;">${i + 1}</button>`;
    }).join('');

    return `
      <div id="questionTracker" style="display:none; background:#fff; padding:15px; border-radius:8px; margin:10px; border:1px solid #b0d3ee; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <strong style="font-size:13px; color:#031b50;">Question Tracker</strong>
          <button onclick="toggleTracker()" style="background:none; border:none; font-size:16px; cursor:pointer; color:#64748b;">✕</button>
        </div>
        <div style="display:flex; gap:15px; font-size:11px; margin-bottom:12px; color:#475569; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:5px;"><span style="width:12px; height:12px; background:#5e78af; border-radius:3px;"></span> Answered</div>
          <div style="display:flex; align-items:center; gap:5px;"><span style="width:12px; height:12px; background:#e2e8f0; border-radius:3px; border:1px solid #cbd5e1;"></span> Unanswered</div>
          <div style="display:flex; align-items:center; gap:5px;"><span style="width:12px; height:12px; background:#031b50; border-radius:3px;"></span> Current</div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(36px, 1fr)); gap:8px;">${boxes}</div>
      </div>
    `;
  }

  // ─── Action buttons row ───
  function buildActions(currentIdx, total, opts) {
    opts = opts || {};
    const prevBtn = opts.hidePrev ? '' : `
      <button class="prev-btn" onclick="prevQuestion()" ${currentIdx === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
        ← PREV
      </button>`;
    const checkBtn = opts.onCheck
      ? `<button class="check" onclick="${opts.onCheck}">CHECK</button>`
      : '';
    const nextLabel = currentIdx === total - 1 ? 'SUBMIT' : 'NEXT';
    const nextAction = currentIdx === total - 1 ? 'submitAnswers()' : 'nextQuestion()';
    return `
      <div class="quiz-actions">
        <div style="display:flex; gap:8px;">${prevBtn}${checkBtn}</div>
        <button class="next" onclick="${nextAction}">${nextLabel}</button>
      </div>
    `;
  }

  // ─── Toggle tracker (global, since inline onclick uses it) ───
  window.toggleTracker = function () {
    const tracker = document.getElementById('questionTracker');
    if (tracker) {
      tracker.style.display = tracker.style.display === 'none' ? 'block' : 'none';
    }
  };

    // ─── Exit link above every card ───
  function buildExitLink() {
    return `
      <div style="margin-bottom: 12px;">
        <a href="/student/lessons.html" style="color: #475569; text-decoration: none; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">
          ← Exit Quiz
        </a>
      </div>
    `;
  };

    // ─── Hardcoded instructions per quiz type ───
  function buildInstructions(kind) {
    const texts = {
      multiple_choice: [
        'Step 1: Read the sentence carefully.',
        'Step 2: Select the correct answer from the choices below.',
        'Step 3: Click NEXT to proceed to the next number.'
      ],
      text_input: [
        'Step 1: Fill in the correct form of the verb in the empty boxes.',
        'Step 2: Click CHECK to verify your answer.',
        'Step 3: Click NEXT to proceed to the next number.'
      ],
      two_step_choice: [
        'Step 1: Read the sentence in the box.',
        'Step 2: Select the correct clause.',
        'Step 3: Select the correct clause type.',
        'Step 4: Click NEXT to proceed.'
      ],
      pattern_choice: [
        'Step 1: Type your sentence inside the box.',
        'Step 2: Select the sentence pattern that matches your sentence.',
        'Step 3: Click CHECK to verify, then NEXT to proceed.'
      ],
      phrasal_verb: [
        'Step 1: Write a sentence using the given phrasal verb.',
        'Step 2: Type the phrasal verb you used in the second box.',
        'Step 3: Click NEXT to proceed.'
      ],
      sva: [
        'Step 1: Type your sentence inside the box.',
        'Step 2: Double-check your sentence to ensure the subject and verb match.',
        'Step 3: Click NEXT to proceed to the next number.'
      ]
    };
    const steps = texts[kind] || [];
    if (!steps.length) return '';
    return `
      <div style="background:#f8fafc; padding:12px 15px; border-radius:6px; margin-bottom:12px; font-size:12px; color:#475569; border-left:4px solid #5e78af;">
        <strong style="display:block; margin-bottom:4px; color:#031b50;">Instructions:</strong>
        ${steps.join('<br>')}
      </div>
    `;
  }

  // ─── Expose ───
  window.QuizUI = {
    injectStyles,
    escapeHtml,
    isQuestionAnswered,
    buildTopBar,
    buildTrackerPanel,
    buildActions,
    buildExitLink,
    buildInstructions  
  };
})();