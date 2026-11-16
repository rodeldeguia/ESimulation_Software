// public/js/teacher-students.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadStudentStats() {
  try {
    const res = await fetch('/api/teacher-analytics/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const students = await res.json();

    // Count students per grade
    const gradeCounts = { 7: 0, 8: 0, 9: 0, 10: 0 };
    students.forEach(s => {
      if (gradeCounts[s.grade_level] !== undefined) {
        gradeCounts[s.grade_level]++;
      }
    });

    const total = students.length;

    // Render Cards
    document.getElementById('studentStats').innerHTML = `
      <div class="stat-card" onclick="window.location.href='/teacher/student-list.html?grade=7'">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-number">${gradeCounts[7]}</div>
        <div class="stat-label">Grade 7</div>
      </div>
      
      <div class="stat-card" onclick="window.location.href='/teacher/student-list.html?grade=8'">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-number">${gradeCounts[8]}</div>
        <div class="stat-label">Grade 8</div>
      </div>

      <div class="stat-card" onclick="window.location.href='/teacher/student-list.html?grade=9'">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-number">${gradeCounts[9]}</div>
        <div class="stat-label">Grade 9</div>
      </div>

      <div class="stat-card" onclick="window.location.href='/teacher/student-list.html?grade=10'">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-number">${gradeCounts[10]}</div>
        <div class="stat-label">Grade 10</div>
      </div>

      <div class="stat-card all-levels" onclick="window.location.href='/teacher/student-list.html?grade=all'">
        <div class="stat-icon">🏫</div>
        <div class="stat-number">${total}</div>
        <div class="stat-label">All Levels</div>
      </div>
    `;

  } catch (err) {
    console.error(err);
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
loadStudentStats();