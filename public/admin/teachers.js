// public/admin/teachers.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadTeachers() {
  try {
    const res = await fetch('/api/admin/teachers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { window.location.href = '/teacher/dashboard.html'; return; }

    const teachers = await res.json();
    
    if (teachers.length === 0) {
      document.getElementById('teacherList').innerHTML = '<tr><td colspan="6">No teachers found.</td></tr>';
      return;
    }

    document.getElementById('teacherList').innerHTML = teachers.map(t => `
      <tr>
        <td>
          <strong>${escapeHtml(t.full_name)}</strong><br>
          <span style="color:#64748b; font-size:12px;">@${escapeHtml(t.username)}</span>
        </td>
        <td>${escapeHtml(t.department || '—')}</td>
        <td><span class="badge ${t.role}">${t.role}</span></td>
        <td><span class="badge ${t.is_active ? 'active' : 'inactive'}">${t.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>${t.lesson_count}</td>
        <td>
          <button class="btn-action ${t.is_active ? 'btn-danger' : 'btn-success'}" 
                  onclick="toggleActive(${t.teacher_id}, ${!t.is_active})">
            ${t.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-action btn-primary" 
                  onclick="changeRole(${t.teacher_id}, '${t.role === 'admin' ? 'teacher' : 'admin'}')">
            Make ${t.role === 'admin' ? 'Teacher' : 'Admin'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('teacherList').innerHTML = '<tr><td colspan="6">Error loading teachers.</td></tr>';
  }
}

async function toggleActive(teacherId, newState) {
  try {
    const res = await fetch(`/api/admin/teachers/${teacherId}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ is_active: newState })
    });
    if (res.ok) loadTeachers();
    else alert('Failed to update status');
  } catch (err) { console.error(err); }
}

async function changeRole(teacherId, newRole) {
  if (!confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) return;
  try {
    const res = await fetch(`/api/admin/teachers/${teacherId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ role: newRole })
    });
    if (res.ok) loadTeachers();
    else alert('Failed to update role');
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

loadTeachers();