// public/student/quiz.js
QuizUI.injectStyles();

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
const params = new URLSearchParams(window.location.search);
const quizId = params.get('id');
if (!quizId) window.location.href = '/student/lessons.html';

// ⬇️ Secure Preview Mode
// Only allow preview if the URL says so AND the user is a teacher/admin
const requestedPreview = params.get('preview') === 'true';
const isTeacher = user.role === 'teacher' || user.role === 'admin';
const isPreview = requestedPreview && isTeacher; 

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
    const res = await fetch(`/api/quizzes/${quizId}${isPreview ? '?preview=true' : ''}`, {
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
    console.log(data.session);
console.log(data.session.time_remaining);
console.log('SESSION:', data.session);
console.log('TIME REMAINING:', data.session.time_remaining);
console.log('QUIZ:', data.quiz);

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
        // Start timer if the quiz has one
        // Start timer if the quiz has one
       // Start timer if the quiz has one
    if (quiz.time_limit && data.session.time_remaining !== null) {
      timeLeft = data.session.time_remaining; 
      startTimer();
    } else {
      timeLeft = null;
      document.getElementById('timer')?.remove();
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
  if (timerHandle) clearInterval(timerHandle); // Prevent double timers
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
  if (timerHandle) clearInterval(timerHandle);

  // 1. Alert the student that time is up
  alert('⏱ Time is up! Your answers will now be automatically submitted.');

  // 2. Replace the quiz screen with a sleek loading state
  app.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div style="font-size: 48px; margin-bottom: 16px; animation: pulse 1s infinite;">⏱</div>
      <h2 style="color: var(--navy); font-size: 28px; margin-bottom: 12px;">Time's Up!</h2>
      <p style="color: var(--text-muted); font-size: 16px;">Submitting your answers automatically. Please wait...</p>
    </div>
  `;

  // 3. Wait 2 seconds, then actually submit the answers
  setTimeout(() => {
    submitAnswers(true);
  }, 2000); 
}



function selectOption(idx) {
  answers[currentIdx].selected_index = idx;
  renderQuestion();
}

function nextQuestion() {
  const currentAnswer = answers[currentIdx];
  const currentQuestion = questions[currentIdx];

  // ─── Enforce clause type selection ───
  if (currentQuestion.question_type === 'two_step_choice') {
    if (currentAnswer.selected_index !== null && !currentAnswer.selected_type) {
      alert('⚠️ Please select the clause type (Step 2) before proceeding.');
      return;
    }
  }

  // ─── Duplicate sentence check (your existing logic) ───
  const currentText = currentAnswer.text ? currentAnswer.text.trim().toLowerCase() : '';
  if (currentText.length > 0) {
    const duplicateIdx = answers.findIndex((a, idx) =>
      idx !== currentIdx && a.text && a.text.trim().toLowerCase() === currentText
    );
    if (duplicateIdx !== -1) {
      alert(`You cannot continue. This sentence is already used in Question ${duplicateIdx + 1}. Please change it.`);
      return;
    }
  }

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
async function submitAnswers(isAutoSubmit = false) {
  if (isPreview) {
    simulatePreviewResult();
    return;
  }

  // Check for unanswered questions ONLY if this is a manual submission
  // Check for unanswered questions ONLY if this is a manual submission
  if (!isAutoSubmit) {
    const unanswered = answers.filter((a, idx) => {
      const q = questions[idx];
      if (a.question_type === 'multiple_choice') return a.selected_index === null;
      if (a.question_type === 'text_input') {
        if (q.blank_fields) {
          const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
          const studentData = a.data || {};
          return blanks.some(field => !studentData[field] || !studentData[field].trim());
        }
        return !a.text.trim(); 
      }
      if (a.question_type === 'two_step_choice') return a.selected_index === null || !a.selected_type;
      if (a.question_type === 'pattern_choice') return !a.text.trim() || !a.selected_pattern;
      if (a.question_type === 'sentence_construction') {
        if (q.subject_type) return !a.text.trim();
        return !a.text.trim() || !a.phrasal_verb_answer?.trim();
      }
      return true;
    }).length;

    // Notify them, but let them choose to proceed
    if (unanswered > 0) {
      const proceed = confirm(`⚠️ Wait!\n\nYou have ${unanswered} unanswered question(s).\n\nIf you submit now, they will be marked as WRONG.\n\nDo you still want to submit?`);
      if (!proceed) {
        return; // Stop submission if they click Cancel
      }
    }
  }

  if (timerHandle) clearInterval(timerHandle);

  const payload = {
    answers: answers.map(a => ({
      question_id: a.question_id,
      selected_index: a.selected_index,
      selected_type: a.selected_type,
      selected_pattern: a.selected_pattern,
      text: a.text || '',
      phrasal_verb_answer: a.phrasal_verb_answer || '',
      data: a.data || {} 
    })),
    session_id: sessionId,
    time_taken: Math.floor((Date.now() - startTime) / 1000)
  };

  const endpoint = (sessionId === 999999) 
    ? `/api/quizzes/${quizId}/test-submit`
    : `/api/quizzes/${quizId}/submit`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Submit failed');
      return;
    }

    const result = await res.json();
    
    // Handle Pre-Test logic
    if (params.get('isPretest') === 'true') {
      const lessonId = params.get('lesson_id') || quiz.lesson_id;
      localStorage.setItem(`pretest_done_${lessonId}`, 'true');
      result.title = "Pre-Test Complete!";
      renderResults(result, true, lessonId);
      return;
    }

    if (sessionId === 999999) alert('Test mode complete! No data was saved.');
    
    // Show the beautiful result page
    renderResults(result);

  } catch (err) {
    console.error(err);
    alert('Error submitting. Please try again.');
  }
}


function renderResults(result, isPretest = false, lessonId = null) {
  // 1. Calculate scores
  const correct = result.score;
  const total = result.total;
  const wrong = total - correct;
  
  // 2. Determine pass/fail message
  const isPass = result.passed;
  const messageText = isPass ? 'Great Job!' : 'Keep Practicing!';
  const messageColor = isPass ? '#198037' : '#ed3d40';

  // 3. Determine button link/text
  let btnHref = '/student/lessons.html';
  let btnText = 'Back to Lessons';
  if (isPretest && lessonId) {
    btnHref = `/student/lesson.html?id=${lessonId}`;
    btnText = 'Continue to Lesson';
  }

  // Hide the quiz wrapper background
  app.style.display = 'none';

  // 4. Inject the ENTIRE result UI into the body
  const resultHtml = `
    <style>
      /* Scoped styles for the result screen */
      .result-backdrop {
        position: fixed; inset: 0; background: rgba(15, 23, 47, .34); z-index: 100;
      }
      .results-modal {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 90%; max-width: 600px; /* Smaller max-width */
        background: #fff; border-radius: 16px;
        box-shadow: 0 9px 27px rgba(25,33,58,0.15); z-index: 101;
        font-family: "Century Gothic", "Trebuchet MS", Arial, sans-serif; color: #100d42;
        box-sizing: border-box;
        display: flex; flex-direction: column;
      }
      .results-modal * { box-sizing: border-box; }
      
      .results__header { 
        padding: 16px 20px; border-bottom: 2px solid #e4e2ef; 
        display: flex; align-items: center; justify-content: center; 
      }
      .results__header h2 { 
        margin: 0; font-size: clamp(20px, 3vw, 26px); color: #082775; font-weight: 700; 
      }
      
      .results__body { padding: 20px 30px 24px; text-align: center; }
      
      .score { margin: 0; line-height: 1.2; font-size: clamp(16px, 2vw, 20px); }
      .score strong { 
        color: #198037; font-size: clamp(28px, 4vw, 36px); font-weight: 800; 
        vertical-align: baseline; margin-left: 4px; 
      }
      
      .congratulations { font-size: clamp(18px, 2.5vw, 22px); margin: 4px 0 20px; font-weight: 600; }
      
      .answer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .answer-card { 
        border: 1.5px solid; border-radius: 12px; padding: 12px 10px; 
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
      .answer-card--correct { background: #f2faf4; border-color: #cce2d5; }
      .answer-card--wrong { background: #fff0f2; border-color: #efd0d6; }
      
      .status-icon { 
        display: flex; width: 40px; height: 40px; 
        border-radius: 50%; align-items: center; justify-content: center; 
        margin-bottom: 8px; color: white; 
      }
      .status-icon svg { width: 22px; height: 22px; stroke-width: 3; }
      .answer-card--correct .status-icon { background: linear-gradient(130deg, #32b733, #25a82c); }
      .answer-card--wrong .status-icon { background: #ed3d40; }
      
      .answer-card h3 { margin: 0; font-size: clamp(14px, 1.8vw, 16px); font-weight: 400; }
      .answer-card > strong { display: block; font-size: clamp(24px, 3vw, 30px); font-weight: 700; line-height: 1.1; }
      .answer-card--correct > strong { color: #208333; }
      .answer-card--wrong > strong { color: #e53c40; }
      
      .encouragement { margin: 20px 0 16px; font-size: clamp(14px, 2vw, 18px); color: #49416f; }
      
      .results__footer { border-top: 1px solid #f0f0f1; padding-top: 16px; }
      .next-button { 
        width: 100%; max-width: 280px; height: 48px; /* Smaller button */
        border: 2px solid #edb120; border-radius: 8px; color: #fff; 
        background: linear-gradient(#ffcb09, #ffb800); 
        box-shadow: 0 3px 5px #b16c0026, inset 0 2px 3px #ffe36b70; 
        font-size: clamp(15px, 2vw, 18px); font-weight: 700; 
        cursor: pointer; transition: filter .15s, transform .15s; 
        text-decoration: none; display: inline-flex; align-items: center; justify-content: center; 
      }
      .next-button:hover { filter: brightness(1.04); }
      .next-button:active { transform: translateY(1px); }

      /* Small screen tweaks */
      @media (max-width: 500px) {
        .results__body { padding: 16px 15px; }
        .answer-grid { grid-template-columns: 1fr; gap: 10px; }
        .answer-card { flex-direction: row; gap: 12px; padding: 10px; justify-content: flex-start; }
        .status-icon { margin-bottom: 0; width: 32px; height: 32px; }
        .answer-card h3 { font-size: 14px; }
        .answer-card > strong { font-size: 20px; margin-left: auto; }
        .next-button { height: 44px; }
      }
    </style>

    <div class="result-backdrop"></div>
    
    <section class="results-modal" role="dialog" aria-modal="true" aria-labelledby="results-title">
      <header class="results__header"><h2 id="results-title">Quiz Results</h2></header>
      <div class="results__body">
        <p class="score">You scored: <strong>${correct}/${total}</strong></p>
        <p class="congratulations" style="color: ${messageColor};">${messageText}</p>
        
        <div class="answer-grid">
          <div class="answer-card answer-card--correct">
            <span class="status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
            <h3>Correct Answers</h3>
            <strong>${correct}</strong>
          </div>
          <div class="answer-card answer-card--wrong">
            <span class="status-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </span>
            <h3>Wrong Answers</h3>
            <strong>${wrong}</strong>
          </div>
        </div>

        <p class="encouragement">Keep it up! Ready to move on to the next topic?</p>
        
        <div class="results__footer">
          <a href="${btnHref}" class="next-button">${btnText}</a>
        </div>
      </div>
    </section>
  `;

  document.body.insertAdjacentHTML('beforeend', resultHtml);
}



// Record text answer
function recordTextAnswer(value) {
  answers[currentIdx].text = value;
  answers[currentIdx].selected_index = null;
const currentText = value.trim().toLowerCase();
  const errorEl = document.getElementById('duplicateError');
  const nextBtn = document.getElementById('nextBtn'); // We need an ID on the Next button

  if (currentText.length > 0) {
    // Find WHICH question index has the duplicate
    const duplicateIdx = answers.findIndex((a, idx) => 
      idx !== currentIdx && a.text && a.text.trim().toLowerCase() === currentText
    );

    if (duplicateIdx !== -1) {
      // Show which question has the duplicate
      if (errorEl) {
        errorEl.style.display = 'block';
        errorEl.textContent = `⚠️ You already used this exact sentence in Question ${duplicateIdx + 1}. Please write a different one.`;
      }
      if (nextBtn) nextBtn.disabled = true;
    } else {
      if (errorEl) errorEl.style.display = 'none';
      if (nextBtn) nextBtn.disabled = false;
    }
  } else {
    if (errorEl) errorEl.style.display = 'none';
    if (nextBtn) nextBtn.disabled = false;
  }
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
function recordPattern(val) {
  answers[currentIdx].selected_pattern = val; }

function recordPhrasalVerb(value) {
  answers[currentIdx].phrasal_verb_answer = value;
}


function recordIrregularVerb(field, value) {
  if (!answers[currentIdx].data) answers[currentIdx].data = {};
  answers[currentIdx].data[field] = value;
}

function simulatePreviewResult() {
  // Destroy timer if running
  if (timerHandle) clearInterval(timerHandle);

  // Show a fake result page so the teacher sees what it looks like
  app.innerHTML = `
    <div class="result-card">
      <h1 style="color:#1e3a8a;">${QuizUI.escapeHtml(quiz.title)}</h1>
      <div class="result-score pass" style="color:#16a34a; font-size:56px; font-weight:800; margin:16px 0;">100%</div>
      <p style="color:#64748b;">(Preview Mode — No data was saved)</p>
      
      <div style="margin-top:32px; display:flex; gap:12px; justify-content:center;">
        <a href="/teacher/quiz-editor.html?id=${quizId}" style="background:#1e3a8a; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">← Back to Editor</a>
      </div>
    </div>
  `;
}

let bannerTimeoutHandle = null;

function checkIrregularVerbAnswer() {
  const q = questions[currentIdx];
  const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
  const answersObj = answers[currentIdx].data || {};

  if (!answers[currentIdx].checkedFields) answers[currentIdx].checkedFields = {};

  let checkedAny = false;
  for (const field of blanks) {
    if (String(answersObj[field] || '').trim() === '') continue;
    answers[currentIdx].checkedFields[field] = true;
    checkedAny = true;
  }

  if (!checkedAny) {
    alert('Please fill in at least one field before clicking CHECK.');
    return;
  }

  // Stamp the banner timer so it shows now
  answers[currentIdx].bannerShownAt = Date.now();

  // Clear any pending auto-hide from a previous click
  if (bannerTimeoutHandle) clearTimeout(bannerTimeoutHandle);

  renderQuestion();

  // Re-render once the banner has faded out, so it disappears from the DOM
  bannerTimeoutHandle = setTimeout(() => {
    renderQuestion();
  }, 2600);
}

// thsi is a inline check sentecne pattern

function checkPatternAnswer() {
  const currentText = answers[currentIdx].text ? answers[currentIdx].text.trim() : '';
  const selectedPattern = answers[currentIdx].selected_pattern;
  
  if (!currentText) {
    alert('Please type a sentence first.');
    return;
  }
  if (!selectedPattern) {
    alert('Please select a sentence pattern.');
    return;
  }

  // Check against the correct pattern (assuming your backend sends this)
  const q = questions[currentIdx];
  const isCorrect = selectedPattern === q.correct_pattern;
  
  answers[currentIdx].checked = true;
  answers[currentIdx].isCorrect = isCorrect;
  
  renderQuestion(); // Re-renders to show the Green/Red feedback banner
}


// 2. Jump to a specific question
function jumpToQuestion(index) {
  currentIdx = index;
  renderQuestion(); // Re-renders the current question and hides the tracker panel
}


// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
loadQuiz();