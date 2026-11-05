// public/student/lesson.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('id');
if (!lessonId) window.location.href = '/student/lessons.html';

async function loadLesson() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

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

    if (res.status === 404) {
      document.getElementById('lessonContent').textContent = 'Lesson not found.';
      return;
    }

    const lesson = await res.json();

    // 1. Render the base lesson content
    document.getElementById('lessonContent').innerHTML = `
      <h1>${escapeHtml(lesson.title)}</h1>
      <p class="meta">Grade ${lesson.grade_level} • Lesson ${lesson.lesson_order}</p>
      <div class="content" id="lessonBody">${lesson.discussion_content}</div>
      <div id="quizSection" style="margin-top:40px; border-top:1px solid #e2e8f0; padding-top:24px;"></div>
    `;

    // 2. Render Inline Quizzes
        // --- RENDER INLINE QUIZZES ---
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
      } else {
        el.innerHTML = `<div style="color:red; text-align:center;">Quiz data not found.</div>`;
      }
    }
      

    // 3. RESTORE THE FINAL QUIZ SECTION
    try {
      const quizRes = await fetch(`/api/lessons/${lessonId}/quizzes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (quizRes.ok) {
        const quizzes = await quizRes.json();
        const quizSection = document.getElementById('quizSection');
        
        if (quizzes.length > 0) {
          quizSection.innerHTML = `
            <h2 style="color:#1e3a8a; margin-bottom:16px;">Quizzes for this Lesson</h2>
            ${quizzes.map(q => `
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
      }
    } catch (e) { console.error('Failed to load final quizzes', e); }

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

loadLesson();