// public/admin/approvals.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadApprovals() {
  try {
    const res = await fetch('/api/admin/lessons/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { window.location.href = '/teacher/dashboard.html'; return; }

    const lessons = await res.json();
    const container = document.getElementById('approvalList');
    
    if (lessons.length === 0) {
      container.innerHTML = '<div class="empty">No lessons pending approval. Great job!</div>';
      return;
    }

    container.innerHTML = lessons.map(l => `
      <div class="approval-card">
        <div class="info">
          <h3>${escapeHtml(l.title)}</h3>
          <p>${escapeHtml(l.description || 'No description provided')}</p>
          <p class="meta">By ${escapeHtml(l.teacher_name || 'Unknown')} • Grade ${l.grade_level} • Order ${l.lesson_order}</p>
        </div>
        <div class="actions">
          <button class="btn-approve" onclick="approve(${l.lesson_id})">Approve</button>
          <button class="btn-reject" onclick="reject(${l.lesson_id})">Reject</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('approvalList').innerHTML = '<div class="empty">Error loading approvals.</div>';
  }
}

async function approve(lessonId) {
  if (!confirm('Approve this lesson? Students will be able to see it.')) return;
  try {
    const res = await fetch(`/api/admin/lessons/${lessonId}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadApprovals();
    else alert('Failed to approve');
  } catch (err) { console.error(err); }
}

async function reject(lessonId) {
  if (!confirm('Reject this lesson? It will remain a draft.')) return;
  try {
    const res = await fetch(`/api/admin/lessons/${lessonId}/reject`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadApprovals();
    else alert('Failed to reject');
  } catch (err) { console.error(err); }
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault(); localStorage.clear(); window.location.href = '/auth/teacher-login.html';
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadApprovals();