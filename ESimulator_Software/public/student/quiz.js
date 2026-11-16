// public/student/quiz.js

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

// function autoSubmit() {
//   // Instead of an alert (which pauses the JS), we show a quick message and submit
//   document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h2>⏱ Time is up!</h2><p>Submitting your answers...</p></div>';
//   submitAnswers(true); // Pass true so it skips the "unanswered" warning
// }

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  el.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('warning', timeLeft <= 60);
}

function autoSubmit() {
  // 1. Show the alert popup
  alert('⏱ Time is up! Your answers will now be automatically submitted.');
  
  // 2. Change the screen to show it's submitting
  document.body.innerHTML = '<div style="text-align:center; padding:50px;"><h2>⏱ Time is up!</h2><p>Submitting your answers...</p></div>';
  
  // 3. Force submit
  submitAnswers(true); 
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
async function submitAnswers(isAutoSubmit = false) {
  // Warn if any unanswered
    const unanswered = answers.filter((a, idx) => {
    const q = questions[idx];

    if (isPreview) {
    // In preview mode, we don't send data to the backend. 
    // We just simulate the result locally so the teacher can see the UI.
    simulatePreviewResult();
    return;}
    
    if (a.question_type === 'multiple_choice') return a.selected_index === null;
    if (a.question_type === 'text_input') return !a.text.trim();
    if (a.question_type === 'two_step_choice') return a.selected_index === null || !a.selected_type;
    if (a.question_type === 'pattern_choice') return !a.text.trim() || !a.selected_pattern;
    if (a.question_type === 'sentence_construction') {
      // If it has subject_type, it's SVA (only needs text)
      if (q.subject_type) return !a.text.trim();
      // If it doesn't, it's Phrasal Verb (needs text AND phrasal_verb_answer)
      return !a.text.trim() || !a.phrasal_verb_answer?.trim();
    }
    return true;
  }).length;
   if (unanswered > 0 && !autoSubmit) {
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
      body: JSON.stringify({ 
        answers, 
        session_id: sessionId, 
        time_taken: Math.floor((Date.now() - startTime) / 1000)
      })
    });

      if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Submit failed');
      return;
    }

        // If this is a pre-test, mark it as done and redirect to lesson
    // const urlParams = new URLSearchParams(window.location.search);
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


 const answersHtml = Object.entries(r.student_answers || {})

    .map(([field, value]) =>
      `<li><strong>${field}:</strong> ${escapeHtml(String(value))}</li>`
    )
    .join('');
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
                <strong>Pattern Selected:</strong> ${escapeHtml(String(r.selected_pattern || '(none)'))}
                ${r.is_correct ? ' ✅' : ' ❌'}
              </p>
              ${r.reason ? `<p style="color:${r.is_correct ? '#166534' : '#991b1b'}; margin-top:8px;"><strong>Feedback:</strong> ${escapeHtml(r.reason)}</p>` : ''}
              ${r.explanation ? `<p><em>${escapeHtml(r.explanation)}</em></p>` : ''}
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
    if (q.blank_fields) {
      // ─── IRREGULAR VERB (PowerPoint Style) ───
      const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
      const answersObj = answers[currentIdx].data || {};

      const renderInput = (label, field, value) => {
        const isBlank = blanks.includes(field);
        const studentValue = answersObj[field] || '';

        return `
          <div style="flex:1; text-align:center;">
            <div style="font-size:14px; color:#333; margin-bottom:8px;">${label}</div>
            ${isBlank 
              ? `<input type="text" id="iv_${field}" value="${studentValue}" oninput="recordIrregularVerb('${field}', this.value)" style="width:100%; padding:12px; border:2px solid #999; border-radius:4px; text-align:center; font-size:16px;" placeholder="">`
              : `<div style="padding:12px; border:2px solid #ccc; border-radius:4px; background:#f9f9f9; font-size:16px; color:#333;">${value}</div>`
            }
          </div>
        `;
      };

      bodyHtml = `
        <div style="background:#fff; padding:40px 20px; border:2px solid #333; border-radius:4px; margin: 20px 0;">
          <h2 style="text-align:center; font-size:20px; margin-bottom:40px; text-transform:uppercase;">Activity # 1. Supplying Irregular Verbs.</h2>
          
          <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
            <div style="font-size:18px; font-weight:bold; color:#333;">Input ➡</div>
            
            ${renderInput('Present', 'present', q.present_form)}
            ${renderInput('Past', 'past', q.past_form)}
            ${renderInput('Future', 'future', q.future_form)}
            ${renderInput('Past Participle', 'past_participle', q.past_participle)}

            <button type="button" style="background:#a0a0a0; color:white; padding:10px 20px; border:none; border-radius:4px; font-weight:bold; opacity:0.6; cursor:not-allowed;">EDIT</button>
          </div>
        </div>
      `;
    } else {
      // ─── STANDARD TEXT INPUT (SVA, Phrasal Verb) ───
      bodyHtml = `
        <input type="text" id="textAnswer" value="${answers[currentIdx].text || ''}" 
               oninput="recordTextAnswer(this.value)" 
               style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:16px;">
      `;
    }
    if (q.blank_fields) {
      // ─── IRREGULAR VERB (4 boxes) ───
      const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
      const answersObj = answers[currentIdx].data || {};

      const renderInput = (label, field, value) => {
        const isBlank = blanks.includes(field);
        return `
          <div style="flex:1; text-align:center;">
            <div style="font-weight:bold; font-size:14px; margin-bottom:8px;">${label}</div>
            ${isBlank 
              ? `<input type="text" id="iv_${field}" value="${answersObj[field] || ''}" oninput="recordIrregularVerb('${field}', this.value)" style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:6px; text-align:center;" placeholder="Fill in...">`
              : `<div style="padding:12px; background:#f1f5f9; border-radius:6px; border:1px solid #e2e8f0; color:#475569;">${value}</div>`
            }
          </div>
        `;
      };

      bodyHtml = `
        <div style="background:#f8fafc; padding:24px; border-radius:8px; border:1px dashed #94a3b8; margin-bottom:24px;">
          <div style="display:flex; gap:16px; align-items:flex-end;">
            ${renderInput('Present', 'present', q.present_form)}
            ${renderInput('Past', 'past', q.past_form)}
            ${renderInput('Future', 'future', q.future_form)}
            ${renderInput('Past Participle', 'past_participle', q.past_participle)}
          </div>
        </div>
      `;
    } else {
      // ─── STANDARD TEXT INPUT (SVA, Phrasal Verb without target) ───
      bodyHtml = `
        <input type="text" id="textAnswer" value="${answers[currentIdx].text || ''}" 
               oninput="recordTextAnswer(this.value)" 
               style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:16px;">
      `;
    }
  
            
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
          Write a sentence and identify its pattern.
        </div>
      </div>

      <label style="display:block; font-size:13px; color:#334155; margin-bottom:8px; font-weight:600;">Your sentence:</label>
      <textarea id="textAnswer" rows="3"
                placeholder="Write your sentence here..."
                oninput="recordTextAnswer(this.value)"
                style="width:100%; padding:14px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px; outline:none; resize:vertical;"
                autofocus>${currentText}</textarea>

      <label style="display:block; font-size:13px; color:#334155; margin:16px 0 8px; font-weight:600;">Select the sentence pattern:</label>
      <select onchange="recordPattern(this.value)"
              style="width:100%; padding:12px; border:2px solid #cbd5e1; border-radius:8px; font-size:15px;">
        <option value="">-- Select pattern --</option>
        ${q.allowed_patterns.map(p => `
          <option value="${p}" ${selectedPattern === p ? 'selected' : ''}>${p}</option>
        `).join('')}
      </select>
    `;
  
  } else if (q.question_type === 'sentence_construction') {
    const currentText = answers[currentIdx].text || '';
    const currentVerbAnswer = answers[currentIdx].phrasal_verb_answer || '';
    const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

    // Check if this is a Phrasal Verb question (no target_phrasal_verb is sent by the backend anymore)
    // We can distinguish it from SVA because SVA sends subject_type, Phrasal Verb does not.
    const isPhrasalVerb = !q.subject_type;

    const secondInputHtml = isPhrasalVerb ? `
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
      <h1 style="color:#1e3a8a;">${escapeHtml(quiz.title)}</h1>
      <div class="result-score pass" style="color:#16a34a; font-size:56px; font-weight:800; margin:16px 0;">100%</div>
      <p style="color:#64748b;">(Preview Mode — No data was saved)</p>
      
      <div style="margin-top:32px; display:flex; gap:12px; justify-content:center;">
        <a href="/teacher/quiz-editor.html?id=${quizId}" style="background:#1e3a8a; color:white; padding:10px 24px; border-radius:6px; text-decoration:none;">← Back to Editor</a>
      </div>
    </div>
  `;
}
// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
loadQuiz();