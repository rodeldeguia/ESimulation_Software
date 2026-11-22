// public/teacher/dashboard.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadDashboard() {
  try {
    // 1. Fetch Teacher Stats
    const statsRes = await fetch('/api/teacher/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let stats = { total_students: 0, total_lessons: 0, total_quizzes: 0, pending_lessons: 0 };
    if (statsRes.ok) stats = await statsRes.json();

    // Render Stat Cards
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <h3>My Students</h3>
        <div class="value">${stats.total_students || 0}</div>
      </div>
      <div class="stat-card">
        <h3>My Lessons</h3>
        <div class="value">${stats.total_lessons || 0}</div>
      </div>
      <div class="stat-card">
        <h3>My Quizzes</h3>
        <div class="value">${stats.total_quizzes || 0}</div>
      </div>
      <div class="stat-card">
        <h3>Pending Approvals</h3>
        <div class="value" style="color: #f59e0b;">${stats.pending_lessons || 0}</div>
      </div>
    `;

    // 2. Fetch Recent Activity
    const activityRes = await fetch('/api/teacher/recent-activity', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const activityBody = document.getElementById('recentActivity');
    let activities = [];
    
    if (activityRes.ok) activities = await activityRes.json();

    if (activities.length === 0) {
      activityBody.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No recent activity.</div>`;
    } else {
      activityBody.innerHTML = activities.map(a => {
        // Format the date nicely (e.g., "Nov 13, 2026, 2:25 PM")
        const formattedDate = new Date(a.date).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        });
        
        // Color code the score
        const scoreColor = parseFloat(a.score) >= 70 ? '#16a34a' : '#dc2626';
// 
        return `
          <div class="list-item">
            <div>
              <div class="list-item-title">${a.student_name}</div>
              <div class="list-item-meta">Completed: <strong>${a.lesson_title}</strong></div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: ${scoreColor}; font-size: 16px;">${a.score}%</div>
              <div style="font-size: 12px; color: var(--text-muted);">${formattedDate}</div>
            </div>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
}

// Logout logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadDashboard);