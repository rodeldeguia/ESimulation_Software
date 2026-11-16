// public/student/progress.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

async function loadProgress() {
  try {
    const res = await fetch('/api/analytics/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    const data = await res.json();

    // ─── Summary cards ───
    document.getElementById('summary').innerHTML = `
      <div class="stat-card">
        <div class="number">${data.summary.completion_percent}%</div>
        <div class="label">Overall Complete</div>
      </div>
      <div class="stat-card">
        <div class="number">${data.summary.lessons_passed}/${data.summary.total_lessons}</div>
        <div class="label">Lessons Passed</div>
      </div>
      <div class="stat-card">
        <div class="number">${data.summary.lessons_attempted}</div>
        <div class="label">Lessons Attempted</div>
      </div>
      <div class="stat-card">
        <div class="number">${data.summary.best_score_overall !== null ? data.summary.best_score_overall + '%' : '—'}</div>
        <div class="label">Best Quiz Score</div>
      </div>
    `;

    // ─── Lesson list ───
    if (data.lessons.length === 0) {
      document.getElementById('lessonList').innerHTML = '<p style="text-align:center; color:#64748b;">No lessons available yet.</p>';
      return;
    }

    document.getElementById('lessonList').innerHTML = data.lessons.map(l => {
      const scoreClass = l.best_score === null ? 'none'
                        : l.best_score >= 70 ? 'pass' : 'fail';
      const scoreText = l.best_score !== null ? `${l.best_score}%` : '—';
      const badgeClass = l.status;
      const badgeLabel = formatStatus(l.status);

      return `
        <div class="lesson-item">
          <div class="lesson-info">
            <h3>${l.lesson_order}. ${escapeHtml(l.title)}</h3>
            <p>${l.attempts > 0 ? `${l.attempts} attempt${l.attempts > 1 ? 's' : ''}` : 'Not yet attempted'}</p>
          </div>
          <div class="lesson-meta">
            <span class="badge ${badgeClass}">${badgeLabel}</span>
            <div class="score ${scoreClass}">${scoreText}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('lessonList').textContent = 'Error loading progress.';
  }
}

function formatStatus(status) {
  const map = {
    'locked': 'Locked',
    'reading_required': 'Available',
    'final_available': 'Available',
    'final_in_progress': 'In Progress',
    'passed': 'Passed',
    'failed': 'Failed',
    'max_attempts_reached': 'Max Attempts'
  };
  return map[status] || status;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadProgress();