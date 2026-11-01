// public/admin/logs.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadLogs() {
  try {
    const res = await fetch('/api/admin/logs?limit=100', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { window.location.href = '/teacher/dashboard.html'; return; }

    const data = await res.json();
    const container = document.getElementById('logList');
    
    if (data.logs.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center;">No activity logs yet.</td></tr>';
      return;
    }

    container.innerHTML = data.logs.map(l => {
      const date = new Date(l.created_at).toLocaleString();
      return `
        <tr>
          <td style="color:#64748b;">${date}</td>
          <td><strong>${escapeHtml(l.actor_type)}</strong> #${l.actor_id}</td>
          <td><span class="action-badge">${escapeHtml(l.action)}</span></td>
          <td>${escapeHtml(l.entity_type)} ${l.entity_id ? '#' + l.entity_id : ''}</td>
          <td style="color:#64748b; font-size:12px;">${escapeHtml(l.ip_address || '—')}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('logList').innerHTML = '<tr><td colspan="5" style="text-align:center;">Error loading logs.</td></tr>';
  }
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

loadLogs();