// public/student/quiz.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const params   = new URLSearchParams(window.location.search);
const quizId   = params.get('id');
if (!quizId) window.location.href = '/student/lessons.html';

const app = document.getElementById('app');

// Standard grammatical clause types (fixed domain data)
const CLAUSE_TYPES = ['Independent', 'Dependent', 'Relative', 'Main'];

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let quiz        = null;
let questions   = [];
let currentIdx  = 0;
let answers     = [];         // [{ question_id, selected_index }]
let timeLeft    = null;
let timerHandle = null;
let sessionId   = null;
let startTime   = null;

// ─────────────────────────────────────────
// FETCH QUIZ
// ─────────────────────────────────────────
async function loadQuiz() {
  try {
    const res = await fetch(`/api/quizzes/${quizId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    if (!res.ok) {
      app.innerHTML = '<h2>Could not load quiz.</h2>';
      return;
    }

    const data = await res.json();
    quiz      = data.quiz;
    questions = data.questions;
    sessionId = data.session.session_id;
    startTime = Date.now();

    if (questions.length === 0) {
      app.innerHTML = '<h2>This quiz has no questions yet.</h2>';
      return;
    }

    // Initialise answers array with nulls
    answers = questions.map(q => ({
      question_id: q.question_id,
      question_type: q.question_type,
      selected_index: null, // for multiple choices
      selected_type: null,
      selected_pattern: null,
      phrasal_verb_answer: '',
      text: '' 
    }));

    // Start timer if the quiz has one
    if (quiz.time_limit) {
      timeLeft = quiz.time_limit * 60; // minutes → seconds
      startTimer();
    }

    renderQuestion();

  } catch (err) {
    console.error(err);
    app.innerHTML = '<h2>Error loading quiz.</h2>';
  }
}

// ─────────────────────────────────────────
// TIMER
// ─────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  timerHandle = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      autoSubmit();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  el.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('warning', timeLeft <= 60);
}

function autoSubmit() {
  alert('Time is up! Submitting your answers.');
  submitAnswers();
}

// ─────────────────────────────────────────
// RENDER QUESTION
// ─────────────────────────────────────────
// function renderQuestion() {
//   const q = questions[currentIdx];
//   const selected = answers[currentIdx].selected_index;

//   const timerHtml = quiz.time_limit
//     ? `<div class="timer" id="timer">⏱ --:--</div>`
//     : '';

//   const optionsHtml = q.options.map((opt, idx) => `
//     <label class="option ${selected === idx ? 'selected' : ''}" onclick="selectOption(${idx})">
//       <input type="radio" name="opt" ${selected === idx ? 'checked' : ''}>
//       ${escapeHtml(opt)}
//     </label>
//   `).join('');

//   app.innerHTML = `
//     <div class="quiz-header">
//       <h1>${escapeHtml(quiz.title)}</h1>
//       ${timerHtml}
//     </div>

//     <div class="question-counter">
//       Question ${currentIdx + 1} of ${questions.length}
//     </div>

//     ${q.instructions ? `<p style="color:#64748b; font-size:13px; margin-bottom:12px;">${escapeHtml(q.instructions)}</p>` : ''}

//     <div class="question-text">${escapeHtml(q.question_text)}</div>

//     <ul class="options">${optionsHtml}</ul>

//     <div class="nav-buttons">
//       <button class="btn-secondary" ${currentIdx === 0 ? 'disabled' : ''} onclick="prevQuestion()">← Prev</button>
//       ${currentIdx === questions.length - 1 
//         ? `<button id="submitBtn" onclick="submitAnswers()">Submit Quiz</button>` 
//         : `<button onclick="nextQuestion()">Next →</button>`}
//     </div>
//   `;

//   if (quiz.time_limit) updateTimerDisplay();
// }

function selectOption(idx) {
  answers[currentIdx].selected_index = idx;
  renderQuestion();
}

function nextQuestion() {
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIdx > 0) {
    currentIdx--;
    renderQuestion();
  }
}

// ─────────────────────────────────────────
// SUBMIT
// ─────────────────────────────────────────
async function submitAnswers() {
  // Warn if any unanswered
  const unanswered = answers.filter(a => {
  if (a.question_type === 'multiple_choice') return a.selected_index === null;
  if (a.question_type === 'text_input') return !a.text.trim();
  if (a.question_type === 'two_step_choice') return a.selected_index === null || !a.selected_type;
  if (a.question_type === 'sentence_construction') return !a.text.trim();
  if (a.question_type === 'pattern_choice') return !a.text.trim() || !a.selected_pattern;
  
  
  return true;
  }).length;
  if (unanswered > 0) {
    if (!confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
  }

  if (timerHandle) clearInterval(timerHandle);

  try {
    const res = await fetch(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers, session_id: sessionId,time_taken: Math.floor((Date.now() - startTime) / 1000)})
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Submit failed');
      return;
    }

        // If this is a pre-test, mark it as done and redirect to lesson
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('isPretest') === 'true') {
      // Extract lesson ID from referrer or save it in the URL (simplest is to pass it)
      // For now, let's just go back to the lessons list
      localStorage.setItem(`pretest_done_${quiz.lesson_id}`, 'true');
      alert('Pre-test submitted! Unlocking lesson...');
      window.location.href = `/student/lesson.html?id=${quiz.lesson_id}`;
      return;
    }

    const result = await res.json();
    renderResults(result);

  } catch (err) {
    console.error(err);
    alert('Error submitting. Please try again.');
  }
}

// ─────────────────────────────────────────
// RENDER RESULTS
// ─────────────────────────────────────────
function renderResults(result) {
  const passClass = result.passed ? 'pass' : 'fail';
  const statusText = result.passed ? 'Passed ✅' : 'Failed ❌';

  app.innerHTML = `
    <div class="result-card">
      <h1 style="color:#1e3a8a;">${escapeHtml(result.title)}</h1>
      <div class="result-score ${passClass}">
        ${result.percentage}%
      </div>
      <p style="color:#64748b;">${result.score} out of ${result.total} correct</p>
      <p style="margin-top:8px; font-weight:600;">${statusText}</p>
      <p style="color:#64748b; font-size:13px; margin-top:4px;">Passing score: ${result.passing_score}%</p>

      <div style="margin-top:32px; display:flex; gap:12px; justify-content:center;">
        <a href="/student/lessons.html" style="background:#94a3b8; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">Back to Lessons</a>
      </div>
    </div>

    <div class="result-breakdown">
      <h3 style="margin-bottom:16px; color:#0f172a;">Answer Breakdown</h3>
        ${result.results.map((r, i) => {
        const isTwoStep = r.selected_type !== undefined && r.correct_type !== undefined;
        const isSva = r.student_text !== undefined && r.subject_type !== undefined && r.verb_type !== undefined;
        const isPhrasalVerb = r.target_phrasal_verb !== undefined;
        const isPattern = r.selected_pattern !== undefined && r.correct_pattern !== undefined;
        const showClause = r.selected_answer !== undefined && r.selected_type === undefined;
        const showTwoStep = r.selected_type !== undefined && r.correct_type !== undefined;
        const showText = r.selected_answer !== undefined && r.selected_type === undefined && r.clause_correct === undefined;

        // Default layout for MCQ / text input
        if (!showTwoStep) {
          return `
            <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
              <h4>Q${i + 1}: ${escapeHtml(r.question_text)}</h4>
              ${r.selected_answer !== undefined ? `<p><strong>Your answer:</strong> ${escapeHtml(String(r.selected_answer || '(none)'))}</p>` : ''}
              ${!r.is_correct && r.correct_answer ? `<p><strong>Correct answer:</strong> ${escapeHtml(String(r.correct_answer))}</p>` : ''}
              ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
            </div>
          `;
        }
        if (isSva) {
          return `
            <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
              <h4>Q${i + 1}: ${escapeHtml(r.question_text || '')}</h4>
              <p><strong>Your sentence:</strong> <em>${escapeHtml(r.student_text || '(none)')}</em></p>
              ${!r.is_correct ? `<p style="color:#991b1b;"><strong>Why:</strong> ${escapeHtml(r.reason || 'Not valid')}</p>` : ''}
              ${r.example_sentence ? `<p><strong>Example:</strong> <em>${escapeHtml(r.example_sentence)}</em></p>` : ''}
              ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
            </div>
          `;
        }
        if (isPhrasalVerb) {
            return `
              <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
                <h4>Q${i + 1}: ${escapeHtml(r.question_text || '')}</h4>
                <p><strong>Target verb:</strong> <em>${escapeHtml(r.target_phrasal_verb)}</em></p>
                <p><strong>Your sentence:</strong> <em>${escapeHtml(r.student_text || '(none)')}</em></p>
                ${!r.is_correct && r.reason ? `<p style="color:#991b1b;"><strong>Why:</strong> ${escapeHtml(r.reason)}</p>` : ''}
                ${r.example_sentence ? `<p><strong>Example:</strong> <em>${escapeHtml(r.example_sentence)}</em></p>` : ''}
              </div>
            `;
          }

          if (isPattern) {
            return `
              <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
                <h4>Q${i + 1}: ${escapeHtml(r.question_text || '')}</h4>
                <p><strong>Your sentence:</strong> <em>${escapeHtml(r.student_text || '(none)')}</em></p>
                <p>
                  <strong>Pattern:</strong> ${escapeHtml(String(r.selected_pattern || '(none)'))}
                  ${r.pattern_correct ? ' ✅' : ' ❌'}
                </p>
                ${!r.pattern_correct ? `<p><strong>Correct pattern:</strong> ${escapeHtml(String(r.correct_pattern))}</p>` : ''}
                ${!r.is_correct && r.reason ? `<p style="color:#991b1b;"><strong>Why:</strong> ${escapeHtml(r.reason)}</p>` : ''}
              </div>
            `;
          }

        // Two-step layout for clause
        return `
          <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
            <h4>Q${i + 1}: ${escapeHtml(r.question_text)}</h4>
            <p>
              <strong>Clause:</strong> ${escapeHtml(String(r.selected_answer || '(none)'))}
              ${r.clause_correct ? ' ✅' : ' ❌'}
            </p>
            ${!r.clause_correct ? `<p><strong>Correct clause:</strong> ${escapeHtml(String(r.correct_answer))}</p>` : ''}
            <p>
              <strong>Type:</strong> ${escapeHtml(String(r.selected_type || '(none)'))}
              ${r.type_correct ? ' ✅' : ' ❌'}
            </p>
            ${!r.type_correct ? `<p><strong>Correct type:</strong> ${escapeHtml(String(r.correct_type))}</p>` : ''}
            ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
          </div>
        `;
      }).join('')}
        </div>`;
}

// render questions

// public/student/quiz.js

function renderQuestion() {
  const q = questions[currentIdx];
  const selected = answers[currentIdx].selected_index; // null for text
  const currentAnswer = answers[currentIdx];

  const timerHtml = quiz.time_limit
    ? `<div class="timer" id="timer">⏱ --:--</div>`
    : '';
console.log(q);
  // ─── Render based on question type ───
  let bodyHtml = '';

  if (q.question_type === 'multiple_choice') {
  // Extra context for clause quiz (and any future quiz with context)
  let contextHtml = '';
  if (q.sentence) {
    contextHtml = `
      <div style="background:#f1f5f9; padding:16px; border-radius:8px; margin-bottom:16px;">
        <div style="font-size:13px; color:#64748b; margin-bottom:6px;">Sentence:</div>
        <div style="font-size:15px; color:#0f172a; font-style:italic; margin-bottom:12px;">
          ${escapeHtml(q.sentence)}
        </div>
        ${q.clause_text ? `
          <div style="font-size:13px; color:#64748b; margin-bottom:6px;">Clause to identify:</div>
          <div style="font-size:16px; color:#1e3a8a; font-weight:600;">
            "${escapeHtml(q.clause_text)}"
          </div>
        ` : ''}
      </div>
    `;
  }

  bodyHtml = `
    ${contextHtml}
    <ul class="options">
      ${q.options.map((opt, idx) => `
        <label class="option ${selected === idx ? 'selected' : ''}" onclick="selectOption(${idx})">
          <input type="radio" name="opt" ${selected === idx ? 'checked' : ''}>
          ${escapeHtml(opt)}
        </label>
      `).join('')}
    </ul>
  `;
} else if (q.question_type === 'text_input') {
    // Show the prompt (e.g., present form + ask_for)
    const promptHtml = q.present_form
      ? `<div style="background:#f1f5f9; padding:16px; border-radius:8px; margin-bottom:20px;">
           <div style="font-size:14px; color:#64748b; margin-bottom:6px;">Verb:</div>
           <div style="font-size:24px; font-weight:700; color:#1e3a8a;">${escapeHtml(q.present_form)}</div>
           <div style="font-size:13px; color:#64748b; margin-top:8px;">
             Write the <strong>${formatAskFor(q.ask_for)}</strong> form.
           </div>
         </div>`
      : '';

    bodyHtml = `
      ${promptHtml}
      <label style="display:block; font-size:13px; color:#334155; margin-bottom:8px; font-weight:600;">Your answer:</label>
      <input type="text" id="textAnswer"
            value="${escapeHtml(currentAnswer.text || '')}"
            placeholder="Type your answer..."
            oninput="recordTextAnswer(this.value)"
            style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:16px; outline:none;"
            autocomplete="off" autofocus>`;
            
  } else if (q.question_type === 'two_step_choice') {
    const selectedIndex = answers[currentIdx].selected_index;
    const selectedType = answers[currentIdx].selected_type;

    bodyHtml = `
      <div style="background:#f1f5f9; padding:16px; border-radius:8px; margin-bottom:20px;">
        <div style="font-size:13px; color:#64748b; margin-bottom:6px;">Sentence:</div>
        <div style="font-size:15px; color:#0f172a; font-style:italic;">
          ${escapeHtml(q.sentence || '')}
        </div>
      </div>

      <h4 style="font-size:14px; color:#1e3a8a; margin: 20px 0 12px;">Step 1: Select the clause</h4>
      <ul class="options">
        ${q.options.map((opt, idx) => `
          <label class="option ${selectedIndex === idx ? 'selected' : ''}" onclick="selectClause(${idx})">
            <input type="radio" name="clause" ${selectedIndex === idx ? 'checked' : ''}>
            ${escapeHtml(opt)}
          </label>
        `).join('')}
      </ul>

      <h4 style="font-size:14px; color:#1e3a8a; margin: 24px 0 12px;">Step 2: Select the clause type</h4>
      <ul class="options">
        ${CLAUSE_TYPES.map(type => `
          <label class="option ${selectedType === type ? 'selected' : ''}" onclick="selectType('${type}')">
            <input type="radio" name="type" ${selectedType === type ? 'checked' : ''}>
            ${escapeHtml(type)}
          </label>
        `).join('')}
      </ul>
    `;
  // }else if (q.question_type === 'sentence_construction') {
  //   const currentText = answers[currentIdx].text || '';
  //   const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  //   bodyHtml = `
  //     ${q.context ? `
  //       <div style="background:#fef3c7; padding:14px; border-radius:8px; margin-bottom:16px; font-size:14px; color:#78350f;">
  //         <strong>Context:</strong> ${escapeHtml(q.context)}
  //       </div>
  //     ` : ''}

  //     <div style="background:#f1f5f9; padding:14px; border-radius:8px; margin-bottom:16px;">
  //       <div style="font-size:13px; color:#64748b; margin-bottom:6px;">
  //         Target: <strong>${escapeHtml(q.subject_type)}</strong> subject, <strong>${escapeHtml(q.verb_type)}</strong> verb
  //       </div>
  //       <div style="font-size:12px; color:#94a3b8;">
  //         ${q.min_sentence_length}–${q.max_sentence_length} words
  //       </div>
  //     </div>

  //     <label style="display:block; font-size:13px; color:#334155; margin-bottom:8px; font-weight:600;">Your sentence:</label>
  //     <textarea id="textAnswer" rows="4"
  //               placeholder="Write your sentence here..."
  //               oninput="recordTextAnswer(this.value); updateWordCount(this.value)"
  //               style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px; outline:none; resize:vertical;"
  //               autofocus>${escapeHtml(currentText)}</textarea>

  //     <div style="text-align:right; font-size:12px; color:#64748b; margin-top:6px;" id="wordCountDisplay">
  //       ${wordCount} word${wordCount !== 1 ? 's' : ''}
  //     </div>
  //   `;
    } else if (q.question_type === 'pattern_choice') {
    const currentText = answers[currentIdx].text || '';
    const selectedPattern = answers[currentIdx].selected_pattern || '';

    bodyHtml = `
      <div style="background:#f1f5f9; padding:14px; border-radius:8px; margin-bottom:16px;">
        <div style="font-size:13px; color:#64748b; margin-bottom:6px;">
          Write a sentence using one of these patterns: <strong>${q.allowed_patterns.join(', ')}</strong>
        </div>
        <div style="font-size:12px; color:#94a3b8;">
          ${q.min_sentence_length}–${q.max_sentence_length} words
        </div>
      </div>

      <label style="display:block; font-size:13px; color:#334155; margin-bottom:8px; font-weight:600;">Your sentence:</label>
      <textarea id="textAnswer" rows="3"
                placeholder="Write your sentence here..."
                oninput="recordTextAnswer(this.value); updateWordCount(this.value)"
                style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px; outline:none; resize:vertical;"
                autofocus>${escapeHtml(currentText)}</textarea>

      <div style="text-align:right; font-size:12px; color:#64748b; margin-top:6px;" id="wordCountDisplay"></div>

      <label style="display:block; font-size:13px; color:#334155; margin:16px 0 8px; font-weight:600;">Select the sentence pattern:</label>
      <select onchange="recordPattern(this.value)"
              style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px;">
        <option value="">-- Select pattern --</option>
        ${q.allowed_patterns.map(p => `
          <option value="${escapeHtml(p)}" ${selectedPattern === p ? 'selected' : ''}>${escapeHtml(p)}</option>
        `).join('')}
      </select>
    `;
    } else if (q.question_type === 'sentence_construction') {
  const currentText = answers[currentIdx].text || '';
  const currentVerbAnswer = answers[currentIdx].phrasal_verb_answer || '';
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  // Show target verb if it's a phrasal verb question
  const phrasalVerbHint = q.target_phrasal_verb ? `
    <div style="background:#e0e7ff; padding:14px; border-radius:8px; margin-bottom:16px;">
      <div style="font-size:13px; color:#3730a3; margin-bottom:4px;">Target phrasal verb:</div>
      <div style="font-size:20px; font-weight:700; color:#1e3a8a;">"${escapeHtml(q.target_phrasal_verb)}"</div>
    </div>
  ` : '';

  // Second input shows ONLY for phrasal verb questions
  const secondInputHtml = q.target_phrasal_verb ? `
    <label style="display:block; font-size:13px; color:#334155; margin:16px 0 8px; font-weight:600;">
      Identify the phrasal verb in your sentence:
    </label>
    <input type="text" id="verbAnswer"
           value="${escapeHtml(currentVerbAnswer)}"
           placeholder="Type the phrasal verb..."
           oninput="recordPhrasalVerb(this.value)"
           style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px;"
           autocomplete="off">
  ` : '';

  bodyHtml = `
    ${phrasalVerbHint}
    ${q.context ? `<div style="background:#fef3c7; padding:14px; border-radius:8px; margin-bottom:16px; font-size:14px; color:#78350f;"><strong>Context:</strong> ${escapeHtml(q.context)}</div>` : ''}

    <div style="background:#f1f5f9; padding:14px; border-radius:8px; margin-bottom:16px;">
      <div style="font-size:13px; color:#64748b; margin-bottom:6px;">
        ${q.subject_type ? `Target: <strong>${escapeHtml(q.subject_type)}</strong> subject, <strong>${escapeHtml(q.verb_type)}</strong> verb` : 'Write your sentence below'}
      </div>
      <div style="font-size:12px; color:#94a3b8;">
        ${q.min_sentence_length}–${q.max_sentence_length} words
      </div>
    </div>

    <label style="display:block; font-size:13px; color:#334155; margin-bottom:8px; font-weight:600;">Your sentence:</label>
    <textarea id="textAnswer" rows="4"
              placeholder="Write your sentence here..."
              oninput="recordTextAnswer(this.value); updateWordCount(this.value)"
              style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px; outline:none; resize:vertical;"
              autofocus>${escapeHtml(currentText)}</textarea>

    <div style="text-align:right; font-size:12px; color:#64748b; margin-top:6px;" id="wordCountDisplay">
      ${wordCount} word${wordCount !== 1 ? 's' : ''}
    </div>

    ${secondInputHtml}
  `;
}


  app.innerHTML = `
    <div class="quiz-header">
      <h1>${escapeHtml(quiz.title)}</h1>
      ${timerHtml}
    </div>

    <div class="question-counter">
      Question ${currentIdx + 1} of ${questions.length}
    </div>

    ${q.instructions ? `<p style="color:#64748b; font-size:13px; margin-bottom:12px;">${escapeHtml(q.instructions)}</p>` : ''}

    <div class="question-text">${escapeHtml(q.question_text)}</div>

    ${bodyHtml}

    <div class="nav-buttons">
      <button class="btn-secondary" ${currentIdx === 0 ? 'disabled' : ''} onclick="prevQuestion()">← Prev</button>
      ${currentIdx === questions.length - 1 
        ? `<button id="submitBtn" onclick="submitAnswers()">Submit Quiz</button>` 
        : `<button onclick="nextQuestion()">Next →</button>`}
    </div>
  `;

  if (quiz.time_limit) updateTimerDisplay();
}

// Record text answer
function recordTextAnswer(value) {
  answers[currentIdx].text = value;
  // Clear selected_index (text questions don't use it)
  answers[currentIdx].selected_index = null;
}

// Human-readable form label
function formatAskFor(ask_for) {
  const map = {
    'present': 'present tense',
    'past': 'past tense',
    'future': 'future tense',
    'past_participle': 'past participle'
  };
  return map[ask_for] || ask_for;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


function selectClause(idx) {
  answers[currentIdx].selected_index = idx;
  renderQuestion();
}

function selectType(type) {
  answers[currentIdx].selected_type = type;
  renderQuestion();
}

function updateWordCount(value) {
  const el = document.getElementById('wordCountDisplay');
  if (!el) return;
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  el.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}
function recordPattern(pattern) {
  answers[currentIdx].selected_pattern = pattern;
}

function recordPhrasalVerb(value) {
  answers[currentIdx].phrasal_verb_answer = value;
}

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
loadQuiz();