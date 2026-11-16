const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadQuizzes() {
  try {
    const res = await fetch('/api/quizzes', { // We will update this route to get all quizzes for teacher
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const quizzes = await res.json();
    const list = document.getElementById('quizList');
    
    if (quizzes.length === 0) {
      list.innerHTML = '<p style="color:#64748b;">No quizzes created yet.</p>';
      return;
    }

    list.innerHTML = quizzes.map(q => `
      <div class="quiz-card">
        <div>
          <h3>${q.title}</h3>
          <p>Type: ${q.quiz_type.toUpperCase()} | For Lesson: ${q.lesson_title || 'Unknown'} | Purpose: ${q.quiz_purpose.toUpperCase()}</p>
        </div>
        <a href="/teacher/quiz-editor.html?id=${q.quiz_id}" style="background:#2196F3; color:white; padding:8px 16px; border-radius:6px; text-decoration:none; font-size:14px;">Edit Questions</a>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault(); localStorage.clear(); window.location.href = '/auth/teacher-login.html';
});

loadQuizzes();