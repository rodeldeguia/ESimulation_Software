// public/student/lessons.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
const gradeLevel = storedUser.grade_level || '7';

// Array of colors to cycle through for the lesson circles
const circleColors = ['c-green', 'c-blue', 'c-yellow', 'c-purple', 'c-pink'];

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
      container.innerHTML = '<div style="padding: 40px; text-align:center; color:var(--text-muted); grid-column: 1 / -1;">No lessons available yet.</div>';
      return;
    }

    container.innerHTML = lessons.map((lesson, index) => {
      // Assign a color based on the index (cycles through the array)
      const colorClass = circleColors[index % circleColors.length];
      const lessonNumber = index + 1;

      if (lesson.locked) {
        return `
          <div class="lesson-card locked">
            <div class="circle-num" style="background: #cbd5e1;">${lessonNumber}</div>
            <div class="lesson-title">${escapeHtml(lesson.title)}</div>
            <div class="lesson-desc">${escapeHtml(lesson.description || 'Locked lesson')}</div>
            <div style="margin-top: auto;">
              <div class="status-locked">
                <span>🔒 Locked</span>
                <span style="font-size:11px;">Complete previous lesson to unlock</span>
              </div>
            </div>
          </div>
        `;
      }
      
      return `
        <a href="/student/lesson.html?id=${lesson.lesson_id}" class="lesson-card">
          <div class="circle-num ${colorClass}">${lessonNumber}</div>
          <div class="lesson-title">${escapeHtml(lesson.title)}</div>
          <div class="lesson-desc">${escapeHtml(lesson.description || 'Click to view lesson')}</div>
          <div class="btn-view" style="margin-top: auto;">View Lesson</div>
        </a>
      `;
    }).join('');

  } catch (err) {
    console.error('loadLessons error:', err);
    document.getElementById('lessonsList').innerHTML = '<div style="padding: 40px; text-align:center; color:#dc2626; grid-column: 1 / -1;">Error loading lessons.</div>';
  }
}

// Simple XSS protection for injected text
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/auth/student-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadLessons);