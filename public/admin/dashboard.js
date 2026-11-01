// public/admin/dashboard.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

// Get user info from localStorage (saved at login)
const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
if (storedUser.role !== 'admin') {
  // Not an admin — kick them back to teacher dashboard
  window.location.href = '/teacher/dashboard.html';
}

document.getElementById('adminName').textContent = `👤 ${storedUser.full_name || 'Admin'}`;

// ─────────────────────────────────────────
// LOAD DASHBOARD DATA
// ─────────────────────────────────────────
async function loadDashboard() {
  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Fetch Overview Stats
    const statsRes = await fetch('/api/admin/overview', { headers });
    if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    const stats = await statsRes.json();

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <div class="num">${stats.total_students}</div>
        <div class="label">Active Students</div>
      </div>
      <div class="stat-card">
        <div class="num">${stats.total_teachers}</div>
        <div class="label">Active Teachers</div>
      </div>
      <div class="stat-card">
        <div class="num">${stats.published_lessons}</div>
        <div class="label">Published Lessons</div>
      </div>
      <div class="stat-card ${stats.pending_lessons > 0 ? 'alert' : ''}">
        <div class="num">${stats.pending_lessons}</div>
        <div class="label">Pending Approvals</div>
      </div>
    `;

    // 2. Fetch Pending Lessons (Quick View)
    const pendingRes = await fetch('/api/admin/lessons/pending', { headers });
    const pending = await pendingRes.json();
    
    const pendingContainer = document.getElementById('pendingLessons');
    
    if (pending.length === 0) {
      pendingContainer.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;">No lessons pending approval. Great job!</div>';
    } else {
      // Show only top 3
      pendingContainer.innerHTML = pending.slice(0, 3).map(l => `
        <div class="queue-item">
          <div>
            <h4>${escapeHtml(l.title)}</h4>
            <p>By ${escapeHtml(l.teacher_name || 'Unknown Teacher')} • Grade ${l.grade_level} • Order ${l.lesson_order}</p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-approve" onclick="quickApprove(${l.lesson_id})">Approve</button>
          </div>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error(err);
    document.getElementById('statsGrid').innerHTML = '<p style="color:red;">Error loading stats.</p>';
  }
}

// ─────────────────────────────────────────
// QUICK APPROVE
// ─────────────────────────────────────────
async function quickApprove(lessonId) {
  if (!confirm('Approve this lesson and publish it to students?')) return;

  try {
    const res = await fetch(`/api/admin/lessons/${lessonId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      // Reload the dashboard to reflect changes
      loadDashboard();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to approve');
    }
  } catch (err) {
    console.error(err);
    alert('Error approving lesson.');
  }
}

// ─────────────────────────────────────────
// LOGOUT & HELPERS
// ─────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = '/auth/teacher-login.html';
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Start
loadDashboard();