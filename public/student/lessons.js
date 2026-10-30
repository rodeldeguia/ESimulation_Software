// public/student/lessons.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
const gradeLevel = storedUser.grade_level || '7';

async function loadLessons() {
  try {
    const res = await fetch(`/api/lessons?grade=${gradeLevel}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    const lessons = await res.json();
    const container = document.getElementById('lessonsList');

    if (lessons.length === 0) {
      container.innerHTML = '<div class="empty">No lessons available yet.</div>';
      return;
    }

    container.innerHTML = lessons.map(lesson => `
      <div class="lesson-card" onclick="window.location.href='/student/lesson.html?id=${lesson.lesson_id}'">
        <div>
          <h3>${escapeHtml(lesson.title)}</h3>
          <p>${escapeHtml(lesson.description || 'Click to view lesson')}</p>
        </div>
        <span class="arrow">→</span>
      </div>
    `).join('');

  } catch (err) {
    console.error('loadLessons error:', err);
    document.getElementById('lessonsList').innerHTML = '<div class="empty">Error loading lessons.</div>';
  }
}

// Simple XSS protection for injected text
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadLessons();