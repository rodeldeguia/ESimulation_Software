// public/student/quiz.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const params   = new URLSearchParams(window.location.search);
const quizId   = params.get('id');
if (!quizId) window.location.href = '/student/lessons.html';

const app = document.getElementById('app');

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
      selected_index: null,
      selected_index: null,    // for multiple choice
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
function renderQuestion() {
  const q = questions[currentIdx];
  const selected = answers[currentIdx].selected_index;

  const timerHtml = quiz.time_limit
    ? `<div class="timer" id="timer">⏱ --:--</div>`
    : '';

  const optionsHtml = q.options.map((opt, idx) => `
    <label class="option ${selected === idx ? 'selected' : ''}" onclick="selectOption(${idx})">
      <input type="radio" name="opt" ${selected === idx ? 'checked' : ''}>
      ${escapeHtml(opt)}
    </label>
  `).join('');

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

    <ul class="options">${optionsHtml}</ul>

    <div class="nav-buttons">
      <button class="btn-secondary" ${currentIdx === 0 ? 'disabled' : ''} onclick="prevQuestion()">← Prev</button>
      ${currentIdx === questions.length - 1 
        ? `<button id="submitBtn" onclick="submitAnswers()">Submit Quiz</button>` 
        : `<button onclick="nextQuestion()">Next →</button>`}
    </div>
  `;

  if (quiz.time_limit) updateTimerDisplay();
}

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
      ${result.results.map((r, i) => `
        <div class="result-item ${r.is_correct ? 'correct' : 'wrong'}">
          <h4>Q${i + 1}: ${escapeHtml(r.question_text)}</h4>
          ${r.selected_answer !== undefined ? `<p><strong>Your answer:</strong> ${escapeHtml(String(r.selected_answer))}</p>` : ''}
          ${!r.is_correct ? `<p><strong>Correct answer:</strong> ${escapeHtml(r.correct_answer)}</p>` : ''}
          ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
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

  // ─── Render based on question type ───
  let bodyHtml = '';

  if (q.question_type === 'multiple_choice') {
    bodyHtml = `
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
             autocomplete="off" autofocus>
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

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
loadQuiz();