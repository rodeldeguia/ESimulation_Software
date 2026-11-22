// public/js/teacher-students.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allStudents = [];

async function loadStudents() {
  try {
    // Note: Assuming your backend returns an array of students with their progress data
    const res = await fetch('/api/teacher-analytics/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch students');
    allStudents = await res.json();

    renderTable(allStudents);

  } catch (err) {
    console.error(err);
    document.getElementById('studentTableBody').innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">Error loading students.</td></tr>`;
  }
}

function renderTable(students) {
  const tbody = document.getElementById('studentTableBody');
  document.getElementById('totalCount').textContent = students.length;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No students found.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, index) => {
    // Split full name
    const nameParts = s.full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Assuming the backend returns these fields (if not, they default to 0)
    const lessonsPassed = s.lessons_passed || 0;
    const totalLessons = s.total_lessons || 10; // Assuming 10 total for now
    const progressPercent = Math.min(Math.round((lessonsPassed / totalLessons) * 100), 100);

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div style="font-weight: 600; color: var(--navy);">${firstName} ${lastName}</div>
          <div style="font-size: 12px; color: var(--text-muted);">@${s.username || 'student'}</div>
        </td>
        <td>Grade ${s.grade_level}</td>
        <td><strong>${lessonsPassed}</strong> / ${totalLessons}</td>
        <td>
          <!-- A simple progress bar -->
          <div style="background: #e2e8f0; border-radius: 10px; height: 8px; width: 100px; overflow: hidden;">
            <div style="background: var(--primary-blue); height: 100%; width: ${progressPercent}%;"></div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${progressPercent}% Complete</div>
        </td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>
          <!-- Button to view personal progress -->
          <a href="/teacher/student.html?id=${s.student_id}" class="action-link">View Progress</a>
        </td>
      </tr>
    `;
  }).join('');
}

// Search Function
function filterTable() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allStudents.filter(s => 
    s.full_name.toLowerCase().includes(query) || 
    `grade ${s.grade_level}`.includes(query)
  );
  renderTable(filtered);
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadStudents);