// public/admin/students.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadStudents() {
  try {
    const res = await fetch('/api/admin/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { window.location.href = '/teacher/dashboard.html'; return; }

    const students = await res.json();
    
    if (students.length === 0) {
      document.getElementById('studentList').innerHTML = '<tr><td colspan="5">No students found.</td></tr>';
      return;
    }

    document.getElementById('studentList').innerHTML = students.map(s => `
      <tr>
        <td>
          <strong>${escapeHtml(s.full_name)}</strong><br>
          <span style="color:#64748b; font-size:12px;">@${escapeHtml(s.username)}</span>
        </td>
        <td>Grade ${s.grade_level}</td>
        <td>${s.lessons_passed}</td>
        <td><span class="badge ${s.is_active ? 'active' : 'inactive'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-action ${s.is_active ? 'btn-danger' : 'btn-success'}" 
                  onclick="toggleActive(${s.student_id}, ${!s.is_active})">
            ${s.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('studentList').innerHTML = '<tr><td colspan="5">Error loading students.</td></tr>';
  }
}

async function toggleActive(studentId, newState) {
  try {
    const res = await fetch(`/api/admin/students/${studentId}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ is_active: newState })
    });
    if (res.ok) loadStudents();
    else alert('Failed to update status');
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

loadStudents();