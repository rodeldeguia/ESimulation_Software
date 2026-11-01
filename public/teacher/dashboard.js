// public/teacher/dashboard.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadDashboard() {
  try {
    // Overview stats
    const statsRes = await fetch('/api/teacher-analytics/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (statsRes.status === 401) {
      localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return;
    }
    const stats = await statsRes.json();

    document.getElementById('stats').innerHTML = `
      <div class="stat"><div class="num">${stats.total_students}</div><div class="label">Students</div></div>
      <div class="stat"><div class="num">${stats.total_lessons}</div><div class="label">Lessons</div></div>
      <div class="stat"><div class="num">${stats.total_quizzes}</div><div class="label">Quizzes</div></div>
      <div class="stat"><div class="num">${stats.total_attempts}</div><div class="label">Quiz Attempts</div></div>
    `;

    // Student list
    const studentsRes = await fetch('/api/teacher-analytics/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const students = await studentsRes.json();

    if (students.length === 0) {
      document.getElementById('studentsTable').innerHTML = '<p style="color:#64748b;">No students yet.</p>';
      return;
    }

    document.getElementById('studentsTable').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Grade</th>
            <th>Lessons Passed</th>
            <th>Best Score</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td>${escapeHtml(s.full_name)}</td>
              <td>Grade ${s.grade_level}</td>
              <td>${s.lessons_passed}</td>
              <td>${s.best_score !== null ? s.best_score + '%' : '—'}</td>
              <td class="${s.is_active ? 'status-active' : 'status-inactive'}">
                ${s.is_active ? 'Active' : 'Inactive'}
              </td>
              <td><a href="/teacher/student.html?id=${s.student_id}">View</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

  } catch (err) {
    console.error(err);
    document.getElementById('studentsTable').textContent = 'Error loading dashboard.';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = '/auth/teacher-login.html';
});

loadDashboard();