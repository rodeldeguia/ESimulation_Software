// public/admin/teachers.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadTeachers() {
  const tbody = document.getElementById('teacherList');

  try {
    const res = await fetch('/api/admin/teachers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { window.location.href = '/teacher/dashboard.html'; return; }

    const teachers = await res.json();
    
    if (teachers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No teachers found.</td></tr>';
      return;
    }

    tbody.innerHTML = teachers.map(t => `
      <tr>
        <td>
          <strong style="color: var(--navy);">${escapeHtml(t.full_name)}</strong><br>
          <span style="color:var(--text-muted); font-size:12px;">@${escapeHtml(t.username)}</span>
        </td>
        <td>${escapeHtml(t.department || '—')}</td>
        <td>
          <span style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: ${t.role === 'admin' ? '#e0e7ff' : '#f1f5f9'}; 
            color: ${t.role === 'admin' ? '#3730a3' : '#475569'};">
            ${t.role}
          </span>
        </td>
        <td>
          <span style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: ${t.is_active ? '#dcfce7' : '#fee2e2'}; 
            color: ${t.is_active ? '#166534' : '#991b1b'};">
            ${t.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style="font-weight: 600;">${t.lesson_count || 0}</td>
        <td>
          <button style="padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; margin-right: 4px;
            background: ${t.is_active ? '#fee2e2' : '#dcfce7'}; 
            color: ${t.is_active ? '#991b1b' : '#166534'};" 
            onclick="toggleActive(${t.teacher_id}, ${!t.is_active})">
            ${t.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button style="padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none;
            background: #e0e7ff; color: #3730a3;" 
            onclick="changeRole(${t.teacher_id}, '${t.role === 'admin' ? 'teacher' : 'admin'}')">
            Make ${t.role === 'admin' ? 'Teacher' : 'Admin'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: red;">Error loading teachers.</td></tr>';
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

// Helper function to prevent XSS attacks
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadTeachers);