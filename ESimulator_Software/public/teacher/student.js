// public/teacher/student.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const params = new URLSearchParams(window.location.search);
const studentId = params.get('id');
if (!studentId) window.location.href = '/teacher/dashboard.html';

async function loadStudent() {
  try {
    const res = await fetch(`/api/teacher-analytics/students/${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return;
    }
    if (res.status === 404) {
      document.getElementById('title').textContent = 'Student not found';
      return;
    }

    const data = await res.json();
    document.getElementById('title').textContent = 
      `${data.student.full_name} — Grade ${data.student.grade_level}`;

    document.getElementById('summary').innerHTML = `
      <div class="stat-card"><div class="num">${data.summary.completion_percent}%</div><div class="label">Complete</div></div>
      <div class="stat-card"><div class="num">${data.summary.lessons_passed}/${data.summary.total_lessons}</div><div class="label">Passed</div></div>
      <div class="stat-card"><div class="num">${data.summary.lessons_attempted}</div><div class="label">Attempted</div></div>
      <div class="stat-card"><div class="num">${data.summary.best_score_overall !== null ? data.summary.best_score_overall + '%' : '—'}</div><div class="label">Best Score</div></div>
    `;

    document.getElementById('lessonsList').innerHTML = data.lessons.map(l => `
      <div class="lesson-item">
        <div>
          <h3>${l.lesson_order}. ${escapeHtml(l.title)}</h3>
          <p>${l.attempts > 0 ? `${l.attempts} attempts` : 'Not attempted'}
             • Best: ${l.best_score !== null ? l.best_score + '%' : '—'}</p>
        </div>
        <span class="badge ${l.status}">${formatStatus(l.status)}</span>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('title').textContent = 'Error loading student.';
  }
}

function formatStatus(s) {
  const m = {
    'locked': 'Locked', 'reading_required': 'Available',
    'final_available': 'Available', 'final_in_progress': 'In Progress',
    'passed': 'Passed', 'failed': 'Failed', 'max_attempts_reached': 'Max Attempts'
  };
  return m[s] || s;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadStudent();