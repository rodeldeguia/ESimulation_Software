// public/admin/students.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadStudents() {
  const tbody = document.getElementById('studentList');

  try {
    // Make sure this endpoint matches your backend route!
    const res = await fetch('/api/admin/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch");
    const students = await res.json();

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">No students found.</td></tr>`;
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td style="font-weight: 600; color: var(--navy);">${escapeHtml(s.full_name)}</td>
        <td>Grade ${s.grade_level}</td>
        <td>${s.lessons_passed || 0}</td>
        <td>
          <span style="padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;
            background: ${s.is_active ? '#dcfce7' : '#fee2e2'}; 
            color: ${s.is_active ? '#166534' : '#991b1b'};">
            ${s.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button style="padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none;
            background: ${s.is_active ? '#fee2e2' : '#dcfce7'}; 
            color: ${s.is_active ? '#991b1b' : '#166534'};" 
            onclick="toggleStudent(${s.student_id}, ${!s.is_active})">
            ${s.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Error loading students.</td></tr>`;
  }
}

async function toggleStudent(studentId, newState) {
  if (!confirm(`Are you sure you want to ${newState ? 'Activate' : 'Deactivate'} this student?`)) return;

  try {
    const res = await fetch(`/api/admin/students/${studentId}/active`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ is_active: newState })
    });
    
    if (res.ok) {
      loadStudents(); // Refresh the table
    } else {
      alert("Failed to update status.");
    }
  } catch (err) {
    console.error(err);
  }
}

// Helper function to prevent XSS attacks
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', loadStudents);