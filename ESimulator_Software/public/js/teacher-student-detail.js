// public/js/teacher-student-detail.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const params = new URLSearchParams(window.location.search);
const studentId = params.get('id');

if (!studentId) {
  window.location.href = '/teacher/students.html';
}

let performanceChart = null;

async function loadStudentDetail() {
  try {
    const res = await fetch(`/api/teacher-analytics/students/${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/teacher-login.html';
      return;
    }

    if (!res.ok) {
      alert('Student not found');
      window.location.href = '/teacher/students.html';
      return;
    }

    const data = await res.json();
    const { student, lessons, summary } = data;

    // Update Page Title
    document.getElementById('studentName').textContent = `${student.full_name} (Grade ${student.grade_level})`;

    // Render Stats
    const totalAttempts = lessons.reduce((acc, l) => acc + (l.attempts || 0), 0);
    const passedLessons = lessons.filter(l => l.status === 'passed').length;
    const completion = lessons.length > 0 ? Math.round((passedLessons / lessons.length) * 100) : 0;

    document.getElementById('individualStats').innerHTML = `
      <div class="stat-card"><div class="num">${lessons.length}</div><div class="label">Total Lessons</div></div>
      <div class="stat-card"><div class="num">${passedLessons}</div><div class="label">Passed</div></div>
      <div class="stat-card"><div class="num" style="color:#16a34a;">${completion}%</div><div class="label">Completion</div></div>
      <div class="stat-card"><div class="num">${totalAttempts}</div><div class="label">Attempts</div></div>
      <div class="stat-card"><div class="num">${summary.best_score_overall || 0}%</div><div class="label">Best Score</div></div>
    `;

    // Render Table
    const tbody = document.getElementById('individualTableBody');
    
    if (lessons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No lessons available.</td></tr>';
    } else {
      tbody.innerHTML = lessons.map(l => {
        const isLocked = l.status === 'locked';
        const score = l.best_score !== null ? Math.round(l.best_score) : '--';
        
        // Calculate average correct/incorrect for this lesson based on attempts
        const attempts = l.attempts || 0;
        let avgCorrect = 0;
        let avgIncorrect = 0;
        
        if (attempts > 0 && l.best_score !== null) {
          // If we only have best_score, we approximate. 
          // For true accuracy, the backend should send the exact per-lesson counts.
          avgCorrect = Math.round(l.best_score); 
          avgIncorrect = 100 - avgCorrect;
        }

        return `
          <tr>
            <td><strong>${l.lesson_order}. ${l.title}</strong></td>
            <td>${attempts}</td>
            <td>
              <div class="progress-wrapper">
                <div class="progress-bar"><div class="progress-fill fill-green" style="width:${avgCorrect}%"></div></div>
                ${avgCorrect}%
              </div>
            </td>
            <td>
              <div class="progress-wrapper">
                <div class="progress-bar"><div class="progress-fill fill-red" style="width:${avgIncorrect}%"></div></div>
                ${avgIncorrect}%
              </div>
            </td>
            <td><strong>${score}/100</strong></td>
            <td style="font-size:12px; color:#64748b;">${l.last_activity ? new Date(l.last_activity).toLocaleString() : 'Never'}</td>
          </tr>
        `;
      }).join('');
    }

    // Render Chart
    renderChart(summary);

  } catch (err) {
    console.error('Error loading student detail:', err);
    alert('Error loading student data');
  }
}

function renderChart(summary) {
  if (performanceChart) performanceChart.destroy();

  const totalCorrect = summary.correct_answers || 0;
  const totalIncorrect = summary.incorrect_answers || 0;

  const ctx = document.getElementById('performanceChart').getContext('2d');
  performanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Correct', 'Incorrect'],
      datasets: [{
        data: [totalCorrect, totalIncorrect],
        backgroundColor: ['#16a34a', '#dc2626'],
        borderWidth: 0,
        cutout: '70%'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = '/auth/teacher-login.html';
});

document.addEventListener('DOMContentLoaded', loadStudentDetail);