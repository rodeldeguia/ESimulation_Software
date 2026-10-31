// public/student/lesson.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

// Read ?id=5 from the URL
const params = new URLSearchParams(window.location.search);
const lessonId = params.get('id');

if (!lessonId) {
  window.location.href = '/student/lessons.html';
}

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

    if (res.status === 404) {
      document.getElementById('lessonContent').textContent = 'Lesson not found.';
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

    let quizSection = '';
    try {
      const quizRes = await fetch(`/api/lessons/${lessonId}/quizzes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (quizRes.ok) {
        const quizzes = await quizRes.json();
        if (quizzes.length > 0) {
          quizSection = `
            <div style="margin-top:40px; padding-top:24px; border-top:1px solid #e2e8f0;">
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
            </div>
          `;
        }
      }
    } catch (e) { /* ignore */ }

    const lesson = await res.json();

    document.getElementById('lessonContent').innerHTML = `
      <h1>${escapeHtml(lesson.title)}</h1>
      <p class="meta">Grade ${lesson.grade_level} • Lesson ${lesson.lesson_order}</p>
      <div class="content">${lesson.discussion_content}</div>
      ${quizSection}
    `;

  } catch (err) {
    console.error('loadLesson error:', err);
    document.getElementById('lessonContent').textContent = 'Error loading lesson.';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadLesson();