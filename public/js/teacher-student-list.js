// public/js/teacher-student-list.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

// Get the grade from the URL
const params = new URLSearchParams(window.location.search);
const grade = params.get('grade') || 'all';

// Set the title
const titleEl = document.getElementById('gradeTitle');
titleEl.textContent = grade === 'all' ? 'All Level' : `Grade ${grade}`;

async function loadStudents() {
  try {
    // 1. Fetch all students from the API
    const res = await fetch('/api/teacher-analytics/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const allStudents = await res.json();

    // 2. Filter by grade if needed
    let students = allStudents;
    if (grade !== 'all') {
      students = allStudents.filter(s => String(s.grade_level) === String(grade));
    }

    const tbody = document.getElementById('studentTableBody');

    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No students found for this grade.</td></tr>`;
      return;
    }

    // 3. Render rows
    tbody.innerHTML = students.map((s, index) => {
      
      // Split full name into First and Last (assuming "First Last" format)
      const nameParts = s.full_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '—';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${lastName}</td>
          <td>${firstName}</td>
          <td>—</td> <!-- Sex is not in DB yet, using placeholder -->
          <td>Grade ${s.grade_level}</td>
          <td>
            <a href="/teacher/student.html?id=${s.student_id}" class="action-link">View</a>
          </td>
          <td>
            <button class="icon-btn icon-edit" onclick="alert('Edit student ${s.student_id}')">✏️</button>
            <button class="icon-btn icon-delete" onclick="deleteStudent(${s.student_id})">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('studentTableBody').innerHTML = `<tr><td colspan="7" class="empty-state">Error loading students.</td></tr>`;
  }
}

function deleteStudent(id) {
  if (confirm('Are you sure you want to deactivate this student?')) {
    // We will implement the backend deactivate function later
    alert('Deactivate feature coming soon for student #' + id);
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

loadStudents();