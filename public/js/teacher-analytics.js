const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadClassAnalytics() {
  try {
    const res = await fetch('/api/teacher-analytics/class-analytics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load analytics');
    const data = await res.json();

    renderDifficultyChart(data.lessonDifficulty);
    renderLeaderboard(data.leaderboard);
    renderStruggling(data.struggling);

        renderTypeChart(data.quizTypeStats);
    renderAtRisk(data.atRisk);
    renderDropOff(data.dropOff);

  } catch (err) {
    console.error(err);
    alert('Error loading analytics');
  }
}


function renderTypeChart(stats) {
  const labels = stats.map(s => s.quiz_type.toUpperCase());
  const scores = stats.map(s => s.avg_score || 0);

  const ctx = document.getElementById('typeChart').getContext('2d');
  new Chart(ctx, {
    type: 'radar', // A radar chart is perfect for showing strengths/weaknesses
    data: {
      labels: labels,
      datasets: [{
        label: 'Class Average (%)',
        data: scores,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#1e3a8a',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20 }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderAtRisk(students) {
  const list = document.getElementById('atRiskList');
  if (!students || students.length === 0) {
    list.innerHTML = '<p style="color:#16a34a;">No at-risk students right now. 🎉</p>';
    return;
  }

  list.innerHTML = students.map(s => {
    const lastActive = s.last_active ? new Date(s.last_active).toLocaleDateString() : 'Never';
    return `
      <div class="list-item">
        <div>
          <strong>${s.full_name}</strong><br>
          <span>Last Active: ${lastActive}</span>
        </div>
        <div style="color:#dc2626; font-weight:800; font-size:14px;">
          ${s.total_fails} Fails
        </div>
      </div>
    `;
  }).join('');
}

function renderDropOff(data) {
  const labels = data.map(d => d.title);
  const started = data.map(d => d.started_count);
  const completed = data.map(d => d.completed_count);

  const ctx = document.getElementById('dropOffChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Students who Started',
          data: started,
          backgroundColor: '#94a3b8',
          borderRadius: 4
        },
        {
          label: 'Students who Completed',
          data: completed,
          backgroundColor: '#16a34a',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}
function renderDifficultyChart(lessons) {
  const labels = lessons.map(l => l.title);
  const scores = lessons.map(l => l.avg_score || 0);

  const ctx = document.getElementById('difficultyChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Class Average Score (%)',
        data: scores,
        backgroundColor: scores.map(s => s < 70 ? '#dc2626' : '#16a34a'), // Red if < 70, Green if >= 70
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Horizontal bar chart for easier reading of long titles
      scales: { x: { beginAtZero: true, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderLeaderboard(students) {
  const list = document.getElementById('leaderboardList');
  if (students.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;">No data yet.</p>';
    return;
  }

  list.innerHTML = students.map((s, i) => `
    <div class="list-item">
      <div>
        <strong>${i + 1}. ${s.full_name}</strong><br>
        <span>Avg Time: ${Math.round(s.avg_time)}s</span>
      </div>
      <div style="font-weight:800; color:var(--navy); font-size:18px;">${Math.round(s.avg_score)}%</div>
    </div>
  `).join('');
}

function renderStruggling(students) {
  const list = document.getElementById('strugglingList');
  if (students.length === 0) {
    list.innerHTML = '<p style="color:#16a34a;">All students are doing well! 🎉</p>';
    return;
  }

  list.innerHTML = students.map(s => `
    <div class="list-item">
      <div>
        <strong>${s.full_name}</strong><br>
        <span>Failed Attempts: ${s.failed_attempts}</span>
      </div>
      <div style="font-weight:800; color:#dc2626; font-size:18px;">${Math.round(s.avg_score)}%</div>
    </div>
  `).join('');
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

loadClassAnalytics();