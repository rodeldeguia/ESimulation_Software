// public/student/final-quizzes.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

const TYPE_LABELS = {
  irregular_verb:    'Irregular Verbs',
  preposition:       'Prepositions',
  clause:            'Clause Identification',
  phrasal_verb:      'Phrasal Verbs',
  sva:               'Subject-Verb Agreement',
  sentence_pattern:  'Sentence Patterns'
};

async function loadFinalQuizzes() {
  const list = document.getElementById('quizList');
  try {
    const res = await fetch('/api/quizzes/final-list', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    if (!res.ok) {
      list.innerHTML = `<div style="padding: 20px; color: #dc2626; grid-column: 1 / -1;">
        Could not load quizzes (HTTP ${res.status}).
      </div>`;
      return;
    }

    const data = await res.json();
    const quizzes = data.quizzes || [];

    if (!quizzes.length) {
      list.innerHTML = `<div style="padding: 20px; color: var(--text-muted); grid-column: 1 / -1;">
        No final quizzes available yet for your grade level.
      </div>`;
      return;
    }

    list.innerHTML = quizzes.map(q => {
      const isLocked = q.status === 'locked';

      let badgeClass = 'badge-open';
      let badgeLabel = 'Available';
      if (q.status === 'passed')      { badgeClass = 'badge-passed'; badgeLabel = 'Passed'; }
      else if (q.status === 'failed') { badgeClass = 'badge-failed'; badgeLabel = 'Failed'; }
      else if (q.status === 'in_progress') { badgeClass = 'badge-open'; badgeLabel = 'In Progress'; }
      else if (q.status === 'locked') { badgeClass = 'badge-locked'; badgeLabel = 'Locked'; }

      const typeLabel = TYPE_LABELS[q.quiz_type] || q.quiz_type;

      let metaParts = [];
      if (q.total_items)  metaParts.push(`${q.total_items} item${q.total_items !== 1 ? 's' : ''}`);
      if (q.time_limit)   metaParts.push(`${q.time_limit} min`);
      if (q.best_score !== null && q.total_items) {
        metaParts.push(`Best: ${Math.round(q.best_score)}%`);
      }
      if (q.attempts > 0) metaParts.push(`${q.attempts}/${q.max_attempts} attempts`);

      const lockedReason = q.status === 'locked'
        ? 'Pass the previous quiz to unlock'
        : '';

      return `
        <div class="quiz-item ${isLocked ? 'locked' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span class="status-badge ${badgeClass}">${badgeLabel}</span>
            <span style="font-size:11px; color:#94a3b8; font-weight:600;">Lesson ${q.lesson_order}</span>
          </div>
          <h3>${escapeHtml(q.title || 'Final Quiz')}</h3>
          <p style="font-size:12px; color:#64748b; margin-top:-4px;">${escapeHtml(q.lesson_title || '')} · ${escapeHtml(typeLabel)}</p>
          ${q.description ? `<p>${escapeHtml(q.description)}</p>` : ''}
          ${metaParts.length ? `<div class="quiz-meta">${escapeHtml(metaParts.join(' · '))}</div>` : ''}
          <div class="quiz-actions">
            ${isLocked
              ? `<div class="btn-locked" title="${escapeHtml(lockedReason)}">🔒 Locked</div>`
              : `<a href="/student/quiz.html?id=${q.quiz_id}" class="btn-start">
                   ${q.status === 'passed' ? 'Retake Quiz' :
                     q.status === 'failed' ? 'Try Again' :
                     q.status === 'in_progress' ? 'Continue Quiz' : 'Start Quiz'}
                 </a>`}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Final quizzes error:', err);
    list.innerHTML = `<div style="padding: 20px; color: #dc2626; grid-column: 1 / -1;">
      ⚠️ Error loading final quizzes.
    </div>`;
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = '/auth/student-login.html';
});

document.addEventListener('DOMContentLoaded', loadFinalQuizzes);