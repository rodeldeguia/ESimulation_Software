// public/student/progress.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

let performanceChart = null;
const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

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
    console.log('Student grade:', storedUser.grade_level);
  console.log('Lessons returned:', data.lessons.map(l => l.lesson_order + '. ' + l.title));
    
    // Extract real data from the backend
    const totalQuizzes = data.summary.total_quizzes || 0;
    const totalAttempts = data.summary.attempts || 0;
    const avgCorrect = data.summary.avg_correct || 0;
    const avgIncorrect = data.summary.avg_incorrect || 0;
    
    const correctAnswers = data.summary.correct_answers || 0;
    const incorrectAnswers = data.summary.incorrect_answers || 0;

    // ─── 1. Render Stat Cards ───
    document.getElementById('summary').innerHTML = `
      <div class="stat-card">
        <div class="label">Total Quizzes Taken</div>
        <div class="number">${totalQuizzes}</div>
      </div>
      <div class="stat-card green">
        <div class="label">Avg. Correct Rate:</div>
        <div class="number">${avgCorrect}%</div>
      </div>
      <div class="stat-card red">
        <div class="label">Avg. Incorrect Rate:</div>
        <div class="number">${avgIncorrect}%</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Attempts</div>
        <div class="number">${totalAttempts}</div>
      </div>
    `;

    // ─── 2. Render Lesson List ───
    const listContainer = document.getElementById('lessonList');
    
    if (data.lessons.length === 0) {
      listContainer.innerHTML = '<p style="text-align:center; color:#64748b;">No lessons available.</p>';
      return;
    }

    listContainer.innerHTML = data.lessons.map((l, index) => {
      const isLocked = l.status === 'locked';
      
      // Determine which layout to show based on status
      if (isLocked) {
        return `
          <div class="lesson-row locked">
            <div class="lesson-title">
              <div class="lesson-icon icon-gray">🔒</div>
              Lesson ${l.lesson_order}. ${escapeHtml(l.title)}
            </div>
            <div class="lesson-meta">
              <div class="meta-locked">
                <span>🔒</span> Complete previous lesson to unlock.
              </div>
            </div>
          </div>
        `;
      }

      // If passed/unlocked
      const score = l.best_score !== null ? Math.round(l.best_score) : '--';
      const timeSpent = l.time_spent_mins ? `${l.time_spent_mins} min` : '0 min';
      const nextUnlocked = index + 2; // Assuming next lesson is +1
      
      return `
        <div class="lesson-row passed">
          <div class="lesson-title">
            <div class="lesson-icon icon-blue">▶</div>
            Lesson ${l.lesson_order}. ${escapeHtml(l.title)}
          </div>
          <div class="lesson-meta">
            <div class="meta-passed">
              <span>✅</span> Passed
            </div>
            <div class="meta-score">Score: <strong>${score}</strong> / 100</div>
            <div class="meta-time">Time Spent: ${timeSpent}</div>
            ${nextUnlocked <= data.lessons.length ? `<div class="meta-unlock">Lesson ${nextUnlocked} Unlocked <span>›</span></div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // ─── 3. Render Doughnut Chart ───
    document.getElementById('chartCenterNum').textContent = correctAnswers;
    document.getElementById('legendCorrect').textContent = `${correctAnswers} Correct Answers`;
    document.getElementById('legendIncorrect').textContent = `${incorrectAnswers} Incorrect Answers`;

    if (performanceChart) performanceChart.destroy();
    
    const ctx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [correctAnswers, incorrectAnswers],
          backgroundColor: ['#16a34a', '#ef4444'], // Green and Red
          borderWidth: 0,
          cutout: '75%' // Makes it a thin ring
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, // We built custom HTML legend
          tooltip: { enabled: false } // Clean UI, no hover tooltips
        }
      }
    });

  } catch (err) {
    console.error(err);
    document.getElementById('lessonList').innerHTML = '<p style="text-align:center; color:#dc2626;">Error loading progress.</p>';
  }
}

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
    window.location.href = '/index.html';
  });
}

document.addEventListener('DOMContentLoaded', loadProgress);