// public/admin/dashboard.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadDashboard() {
  try {
    // 1. Fetch Stats
    const statsRes = await fetch('/api/admin/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    const stats = await statsRes.json();

    // Render Stat Cards
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <h3>Total Teachers</h3>
        <div class="value">${stats.total_teachers || 0}</div>
      </div>
      <div class="stat-card">
        <h3>Total Students</h3>
        <div class="value">${stats.total_students || 0}</div>
      </div>
      <div class="stat-card">
        <h3>Total Lessons</h3>
        <div class="value">${stats.total_lessons || 0}</div>
      </div>
      <div class="stat-card">
        <h3>Quizzes Taken</h3>
        <div class="value">${stats.total_quizzes || 0}</div>
      </div>
    `;

    // 2. Fetch Pending Lessons
    const pendingRes = await fetch('/api/admin/lessons/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pendingLessons = await pendingRes.json();

    const pendingBody = document.getElementById('pendingLessons');
    
    if (pendingLessons.length === 0) {
      pendingBody.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">No lessons pending approval. 🎉</div>`;
    } else {
      pendingBody.innerHTML = pendingLessons.slice(0, 5).map(lesson => `
        <div class="list-item">
          <div>
            <div class="list-item-title">${lesson.title}</div>
            <div class="list-item-meta">Grade ${lesson.grade_level} • By ${lesson.teacher_name}</div>
          </div>
          <span class="badge">Pending</span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
}

// Safe check for logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadDashboard);