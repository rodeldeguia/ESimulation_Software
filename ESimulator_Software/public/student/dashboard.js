// public/student/dashboard.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

// ─── Local escape helper (dashboard doesn't use QuizUI) ───
function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

const CARD_COLORS = ['c-green', 'c-blue', 'c-yellow', 'c-purple', 'c-pink'];

async function loadDashboard() {
  try {
    // ─── 1. Get user info ───
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    document.getElementById('navUserName').textContent = user.username;
    document.getElementById('navUserGrade').textContent = `Grade ${storedUser.grade_level || '--'}`;

    // ─── 2. Fetch lessons ───
    const lessonRes = await fetch('/api/lessons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!lessonRes.ok) {
      throw new Error(`Lessons API failed (HTTP ${lessonRes.status})`);
    }

    const lessons = await lessonRes.json();

    // ─── 3. Compute passed count ───
    const passedCount = lessons.filter(l => l.status === 'passed').length;

    // ─── 4. Render lesson cards ───
    const grid = document.getElementById('lessonsGrid');

    if (!lessons.length) {
      grid.innerHTML = `<div style="padding: 20px; color: var(--text-muted); grid-column: 1 / -1;">No lessons yet.</div>`;
    } else {
      grid.innerHTML = lessons.map((l, index) => {
        const isLocked = l.locked === true;
        const colorClass = CARD_COLORS[index % CARD_COLORS.length];
        const hasScore = l.best_score !== null && l.best_score !== undefined;

        return `
          <div class="lesson-card">
            <div class="circle-num ${colorClass}">${index + 1}</div>
            <div class="lesson-title">${escapeHtml(l.title || 'Untitled Lesson')}</div>
            <div class="lesson-desc">${escapeHtml(l.description || '')}</div>
            ${hasScore ? `
              <div style="font-size:11px; color:#16a34a; font-weight:600; margin-bottom:8px;">
                Best: ${Math.round(Number(l.best_score))}%
              </div>
            ` : ''}
            <div class="card-bottom">
              ${isLocked
                ? `<div class="status-locked">🔒 Locked<br><span style="font-size:11px;">Complete previous lesson to unlock</span></div>`
                : `<a href="/student/lesson.html?id=${l.lesson_id}" class="btn-view">View</a>`}
            </div>
          </div>
        `;
      }).join('');
    }

    // ─── 5. Progress bar ───
    const total = lessons.length;
    const percent = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    document.getElementById('completedLessons').textContent = passedCount;
    document.getElementById('totalLessons').textContent = total;
    document.getElementById('overallProgressPercent').textContent = `${percent}%`;
    document.getElementById('overallProgressBar').style.width = `${percent}%`;

  } catch (err) {
    console.error('Dashboard error:', err);
    document.getElementById('lessonsGrid').innerHTML = `
      <div style="padding: 20px; color: #dc2626; grid-column: 1 / -1;">
        ⚠️ Could not load lessons. Check the console for details.
      </div>
    `;
  }
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/auth/student-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadDashboard);