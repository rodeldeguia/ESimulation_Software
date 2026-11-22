// public/student/lesson.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const params = new URLSearchParams(window.location.search);
const lessonId = new URLSearchParams(window.location.search).get('id');

const urlParams = new URLSearchParams(window.location.search);
const isPreview = urlParams.get('preview') === 'true';

// If it's a preview, hide the "Take Quiz" final buttons
if (!lessonId) window.location.href = '/student/lessons.html';

async function loadLesson() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/student-login.html'; return; }
    if (res.status === 403) {
      document.getElementById('lessonContent').innerHTML = `
        <div style="text-align:center; padding:40px;">
          <h1>🔒 Lesson Locked</h1>
          <p>You need to pass the previous lesson's quiz first.</p>
          <a href="/student/lessons.html" style="color:#1e3a8a;">← Back to Lessons</a>
        </div>
      `;
      return;
    }
    if (res.status === 404) { document.getElementById('lessonContent').textContent = 'Lesson not found.'; return; }

    const lesson = await res.json();

    // ⬇️ 1. FETCH QUIZZES ONCE AND SAVE IT ⬇️
        // ⬇️ 1. CHECK FOR PRE-TEST FIRST (Before rendering anything) ⬇️
    let allQuizzes = [];
    let visibleQuizzes = []

 

    const quizRes = await fetch(`/api/lessons/${lessonId}/quizzes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (quizRes.ok && !isPreview) {
      allQuizzes = await quizRes.json();

      console.log(allQuizzes);
console.log(visibleQuizzes);
      
      // Debug: see what the server actually sent
      console.log("Quizzes received from server:", allQuizzes);
      
      // Find the pre-test safely
      const preTest = allQuizzes.find(q => q.quiz_purpose === 'pretest');
      visibleQuizzes = allQuizzes.filter(
    q => q.quiz_purpose !== 'pretest'
);

      if (preTest) {
        console.log("Pre-test found:", preTest);
        const hasTakenPreTest = localStorage.getItem(`pretest_done_${lessonId}`);

            console.log("=== PRE-TEST CHECK ===");
        console.log("Lesson ID:", lessonId);
        console.log("Looking for key:", `pretest_done_${lessonId}`);
        console.log("Value in localStorage:", hasTakenPreTest);

       if (!hasTakenPreTest) {

        console.log("Redirecting to quiz ID:", preTest.quiz_id);
    window.location.href = `/student/quiz.html?id=${preTest.quiz_id}&isPretest=true&lesson_id=${lessonId}`;
    return; 
        }
      }else{
        console.log("✅ ALREADY TAKEN. Loading lesson...");
      }
    }

    // 2. Render Lesson
    document.getElementById('lessonContent').innerHTML = `
      <h1>${escapeHtml(lesson.title)}</h1>
            <p class="meta">Grade ${Array.isArray(lesson.grade_level) ? lesson.grade_level.join(', ') : lesson.grade_level} • Lesson ${lesson.lesson_order}</p>
      <div class="content" id="lessonBody">${lesson.discussion_content}</div>
      <div id="quizSection" style="margin-top:40px; border-top:1px solid #e2e8f0; padding-top:24px;"></div>
    `;

    // 3. Render Inline Quizzes
    const embeddedQuizzes = document.querySelectorAll('.embedded-quiz');
    for (const el of embeddedQuizzes) {
      const qId = el.getAttribute('data-quiz-id');
      
      if (!qId || qId.startsWith('temp_')) {
        el.innerHTML = `<div style="color:#92400e; background:#fef3c7; padding:16px; border-radius:8px; text-align:center;">⚠️ This inline quiz wasn't saved correctly.</div>`;
        continue; 
      }

      const quizData = lesson.embedded_quizzes ? lesson.embedded_quizzes.find(q => q.embed_quiz_id == qId) : null;

      if (quizData) {
        const options = typeof quizData.options === 'string' ? JSON.parse(quizData.options) : quizData.options;
        const optionsHtml = options.map((opt, i) => `
          <label style="display:block; padding:12px; margin-bottom:8px; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; background:#fff;">
            <input type="radio" name="quiz_${qId}" value="${i}" style="margin-right:10px;">
            <span style="font-size:15px; color:#333;">${escapeHtml(opt)}</span>
          </label>
        `).join('');

        el.innerHTML = `
          <div style="background:#fff; border:2px solid #3b82f6; border-radius:8px; padding:24px; margin:30px 0; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div style="color:#2563eb; font-weight:bold; margin-bottom:12px; font-size:14px;">📝 Quick Check</div>
            <div style="font-size:18px; color:#0f172a; margin-bottom:20px; font-weight:600;">${escapeHtml(quizData.question_text)}</div>
            <div style="margin-bottom:20px;">${optionsHtml}</div>
            <button onclick="checkInlineQuiz('${qId}')" style="background:#2563eb; color:white; padding:10px 24px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">Check Answer</button>
            <div id="quiz_result_${qId}" style="margin-top:16px; font-weight:bold;"></div>
          </div>
        `;
      }
    }

    // 4. Render Final Quizzes (Using the saved 'allQuizzes' variable)
    try {
      const quizSection = document.getElementById('quizSection');
      if (allQuizzes.length > 0) {
        quizSection.innerHTML = `
          <h2 style="color:#1e3a8a; margin-bottom:16px;">Quizzes for this Lesson</h2>
          ${visibleQuizzes.map(q => `
            <div style="background:#f1f5f9; padding:16px; border-radius:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>${escapeHtml(q.title)}</strong>
                <div style="color:#64748b; font-size:13px; margin-top:4px;">
                  ${q.quiz_purpose === 'final' ? 'Final Quiz' : 'Review Quiz'} • 
                  ${q.time_limit ? q.time_limit + ' min' : 'No time limit'}
                </div>
              </div>
              <a href="/student/quiz.html?id=${q.quiz_id}" style="background:#1e3a8a; color:white; padding:8px 16px; border-radius:6px; text-decoration:none; font-size:14px;">Take Quiz</a>
            </div>
          `).join('')}
        `;
      }
    } catch (e) { console.error('Failed to render final quizzes', e); }

     await initReadingTracker();
    setTimeout(checkIfAtBottom, 500); 

  } catch (err) {
    console.error('loadLesson error:', err);
    document.getElementById('lessonContent').textContent = 'Error loading lesson.';
  }
}

window.checkInlineQuiz = async function(quizId) {
  const selected = document.querySelector(`input[name="quiz_${quizId}"]:checked`);
  if (!selected) return alert('Please select an answer.');

  const selectedIndex = parseInt(selected.value);
  const resultDiv = document.getElementById(`quiz_result_${quizId}`);
  resultDiv.textContent = 'Checking...';

  try {
    const res = await fetch('/api/quizzes/check-inline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ quiz_id: quizId, selected_index: selectedIndex })
    });
    const data = await res.json();
    resultDiv.textContent = data.isCorrect ? '✅ Correct!' : '❌ Incorrect. Try again.';
    resultDiv.style.color = data.isCorrect ? '#16a34a' : '#dc2626';
  } catch (err) {
    resultDiv.textContent = 'Error checking answer.';
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Mark reading complete when the student scrolls to the bottom

// ═══════════════════════════════════════════════════════
// Reading timer (accumulates active seconds only)
// ═══════════════════════════════════════════════════════
let readingSeconds = 0;         // seconds in this session
let readingTimer = null;        // setInterval handle
let readingCompleted = false;   // true once bottom reached
let readingPaused = true;       // starts paused until first server ack

function startReadingTimer() {
  if (readingTimer || readingCompleted) return;
  readingPaused = false;
  readingTimer = setInterval(() => {
    readingSeconds++;
  }, 1000);
}

function pauseReadingTimer() {
  if (readingTimer) {
    clearInterval(readingTimer);
    readingTimer = null;
  }
  readingPaused = true;
}

async function flushReadingProgress(keepalive = false) {
  if (readingSeconds < 1) return;
  const payload = JSON.stringify({ seconds: readingSeconds });
  const url = `/api/lessons/${lessonId}/reading-pause`;
  readingSeconds = 0; // reset immediately so we don't double-send

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload,
      keepalive
    });
  } catch (e) {
    console.warn('Failed to flush reading time:', e);
  }
}

async function completeReading() {
  if (readingCompleted) return;
  readingCompleted = true;
  pauseReadingTimer();

  try {
    await fetch(`/api/lessons/${lessonId}/reading-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ seconds: readingSeconds })
    });
    readingSeconds = 0;
    console.log('Reading marked complete');
  } catch (e) {
    console.error('markReadingComplete failed:', e);
  }
}

// ─── Initialize on lesson load ───
async function initReadingTracker() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}/reading-start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      console.warn('Could not start reading session:', res.status);
      return;
    }
    const data = await res.json();

    if (data.reading_status === 'completed') {
      readingCompleted = true;
      return; // no timer needed
    }

    // Start the local timer
    startReadingTimer();
  } catch (e) {
    console.error('initReadingTracker error:', e);
  }
}

// ─── Pause when tab hidden ───
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseReadingTimer();
    flushReadingProgress(true);
  } else if (!readingCompleted) {
    startReadingTimer();
  }
});

// ─── Pause & flush when leaving page ───
window.addEventListener('pagehide', () => {
  pauseReadingTimer();
  // sendBeacon survives page unload — use it for last flush
  if (readingSeconds > 0) {
    const url = `/api/lessons/${lessonId}/reading-pause`;
    const blob = new Blob(
      [JSON.stringify({ seconds: readingSeconds })],
      { type: 'application/json' }
    );
    // Note: sendBeacon can't set Authorization header, so we use fetch with keepalive instead
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ seconds: readingSeconds }),
      keepalive: true
    });
    readingSeconds = 0;
  }
});

// ─── Detect bottom of page ───
function checkIfAtBottom() {
  if (readingCompleted) return;
  if (readingSeconds < 5) return;

  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = window.innerHeight;
  const totalScrollable = scrollHeight - clientHeight;

  const isLongPage = totalScrollable > 200;
  // Within 150px of the bottom OR scrolled 90% of the way down
  const nearBottom = scrollTop + clientHeight >= scrollHeight - 150;
  const scrolledMost = scrollTop >= totalScrollable * 0.90;

  if (isLongPage && (nearBottom || scrolledMost)) {
    completeReading();
  } else if (!isLongPage && readingSeconds >= 15) {
    completeReading();
  }
}



setInterval(() => {
  if (!readingPaused && readingSeconds >= 30 && !readingCompleted) {
    flushReadingProgress(false);
    checkIfAtBottom();  // ← also re-check scroll
  }
}, 30000);

setInterval(() => {
  if (!readingCompleted && readingSeconds >= 10) {
    checkIfAtBottom();
  }
}, 5000);

loadLesson();

window.addEventListener('scroll', checkIfAtBottom, { passive: true });
// Also fire on load in case the lesson is very short (fits on one screen)
window.addEventListener('load', checkIfAtBottom);

// Flush accumulated seconds every 30s while actively reading



