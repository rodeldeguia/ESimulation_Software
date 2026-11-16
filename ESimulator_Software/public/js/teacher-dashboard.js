// public/js/teacher-dashboard.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'teacher' && user.role !== 'admin') {
  window.location.href = '/student/dashboard.html';
}

// Set Name in Header
document.getElementById('teacherName').textContent = user.full_name || 'Teacher';

async function loadDashboard() {
  try {
    // 1. Fetch Stats
    const statsRes = await fetch('/api/teacher-analytics/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    const stats = await statsRes.json();

    // 2. Fetch Students (for the number of students)
    const studentsRes = await fetch('/api/teacher-analytics/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const students = await studentsRes.json();

    // 3. Inject Cards exactly like the picture
    document.getElementById('statsGrid').innerHTML = `
      
      <!-- Blue Card -->
      <div class="stat-card card-blue">
        <div class="stat-card-body">
          <div class="stat-icon">👨‍🎓</div>
          <div class="stat-data">
            <div class="stat-number">${stats.total_students}</div>
            <div class="stat-label">Students</div>
          </div>
        </div>
        <a href="/teacher/students.html" class="stat-footer" style="color: #111; text-decoration: none;">View Details</a>
      </div>

      <!-- Green Card -->
      <div class="stat-card card-green">
        <div class="stat-card-body">
          <div class="stat-icon">📚</div>
          <div class="stat-data">
            <div class="stat-number">${stats.total_lessons}</div>
            <div class="stat-label">Lessons</div>
          </div>
        </div>
        <a href="/teacher/lessons.html" class="stat-footer" style="color: #111; text-decoration: none;">View Details</a>
      </div>

      <!-- Yellow Card -->
      <div class="stat-card card-yellow">
        <div class="stat-card-body">
          <div class="stat-icon">📝</div>
          <div class="stat-data">
            <div class="stat-number">${stats.total_quizzes}</div>
            <div class="stat-label">Quizzes</div>
          </div>
        </div>
        <a href="/teacher/quizzes.html" class="stat-footer" style="color: #111; text-decoration: none;">View Details</a>
      </div>

      <!-- Red Card -->
      <div class="stat-card card-red">
        <div class="stat-card-body">
          <div class="stat-icon">📊</div>
          <div class="stat-data">
            <div class="stat-number">%</div>
            <div class="stat-label">Progress</div>
          </div>
        </div>
        <a href="/teacher/progress.html" class="stat-footer">View Details</a>
      </div>

    `;

  } catch (err) {
    console.error('Dashboard Load Error:', err);
    document.getElementById('statsGrid').innerHTML = '<p>Error loading data.</p>';
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

loadDashboard();