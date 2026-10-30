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
      selected_index: null
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
  const unanswered = answers.filter(a => a.selected_index === null).length;
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
          <p><strong>Your answer:</strong> ${escapeHtml(r.selected_answer || '(none)')}</p>
          ${!r.is_correct ? `<p><strong>Correct answer:</strong> ${escapeHtml(r.correct_answer)}</p>` : ''}
          ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
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