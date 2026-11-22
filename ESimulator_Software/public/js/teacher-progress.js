// public/js/teacher-progress.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

// Chart instances
let barChart = null, lineChart = null, doughnutChart = null;

// 1. TAB SWITCHING
function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  element.classList.add('active');

  if (tabId === 'class') loadClassProgress();
  if (tabId === 'lesson') loadLessonStats();
}

// 2. LOAD STUDENTS DROPDOWN
// 2. LOAD STUDENTS DROPDOWN
async function loadStudents() {
  try {
    const res = await fetch('/api/teacher-analytics/students', { headers: { 'Authorization': `Bearer ${token}` } });
    const students = await res.json();
    const select = document.getElementById('studentSelect');
    
    // Populate the dropdown
    select.innerHTML = '<option value="">-- Select a Student --</option>' + 
      students.map(s => `<option value="${s.student_id}">${s.full_name} (Grade ${s.grade_level})</option>`).join('');

    // 🚨 NEW: Automatically select the first student and load their progress
    if (students.length > 0) {
      select.value = students[0].student_id;
      loadStudentProgress(); // Trigger the data load immediately
    }
  } catch (err) { 
    console.error(err); 
  }
}
// 3. INDIVIDUAL STUDENT PROGRESS
async function loadStudentProgress() {
  const studentId = document.getElementById('studentSelect').value;
  if (!studentId) return;

  try {
    const res = await fetch(`/api/teacher-analytics/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    
    // Stats
    const lessons = data.lessons;
    const totalAttempts = lessons.reduce((acc, l) => acc + (l.attempts || 0), 0);
    const passedLessons = lessons.filter(l => l.status === 'passed').length;
    const completion = Math.round((passedLessons / lessons.length) * 100) || 0;

    document.getElementById('individualStats').innerHTML = `
      <div class="stat-card"><div class="num">${lessons.length}</div><div class="label">Total Lessons</div></div>
      <div class="stat-card"><div class="num">${passedLessons}</div><div class="label">Passed</div></div>
      <div class="stat-card"><div class="num" style="color:#16a34a;">${completion}%</div><div class="label">Completion</div></div>
      <div class="stat-card"><div class="num">${totalAttempts}</div><div class="label">Attempts</div></div>
      <div class="stat-card"><div class="num">${data.summary.best_score_overall || 0}%</div><div class="label">Best Score</div></div>
    `;

    // Table
    document.getElementById('individualTableBody').innerHTML = lessons.map(l => {
      const isLocked = l.status === 'locked';
      const score = l.best_score !== null ? Math.round(l.best_score) : '--';
      const lessonSessions = data.sessions.filter(s => s.lesson_id === l.lesson_id && s.score !== null);
      const attempts = lessonSessions.length;
      let avgCorrect = 0;
      if (attempts > 0) {
        const total = lessonSessions.reduce((sum, s) => sum + Number(s.score), 0);
        avgCorrect = Math.round(total / attempts);
      }
      
      if (isLocked) return `<tr><td><strong>${l.lesson_order}. ${l.title}</strong></td><td>0</td><td>--</td><td>--</td><td>Locked</td><td>--</td><td>--</td></tr>`;

      return `
        <tr>
          <td><strong>${l.lesson_order}. ${l.title}</strong></td>
          <td>${attempts}</td>
          <td><div class="progress-wrapper"><div class="progress-bar"><div class="progress-fill fill-green" style="width:${avgCorrect}%"></div></div>${avgCorrect}%</div></td>
          <td><div class="progress-wrapper"><div class="progress-bar"><div class="progress-fill fill-red" style="width:${100-avgCorrect}%"></div></div>${100-avgCorrect}%</div></td>
          <td><strong>${score}/100</strong></td>
          <td>${l.lowest_score || '--'}</td>
          <td style="font-size:12px; color:#64748b;">${l.last_activity ? new Date(l.last_activity).toLocaleString() : 'Never'}</td>
        </tr>`;
    }).join('');

    // Charts (Reuse your previous chart logic)
    renderCharts(data);

  } catch (err) { console.error(err); }
}

// 4. CLASS OVERVIEW
async function loadClassProgress() {
  const grade = document.getElementById('gradeFilter').value;
  const tbody = document.getElementById('classTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

  try {
    const res = await fetch(`/api/teacher/class-progress?grade=${grade}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const students = await res.json();

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No students found.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td><strong>${s.full_name}</strong></td>
        <td>Grade ${s.grade_level}</td>
        <td>${s.lessons_passed}</td>
        <td>${s.avg_score}%</td>
        <td><div class="progress-wrapper"><div class="progress-bar"><div class="progress-fill fill-blue" style="width:${s.progress_percent}%"></div></div>${s.progress_percent}%</div></td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

// 5. LESSON ANALYTICS
async function loadLessonStats() {
  const tbody = document.getElementById('lessonTableBody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

  try {
    const res = await fetch('/api/teacher/lesson-stats', { headers: { 'Authorization': `Bearer ${token}` } });
    const lessons = await res.json();

    tbody.innerHTML = lessons.map(l => `
      <tr>
        <td><strong>${l.title}</strong></td>
        <td>${l.total_attempts}</td>
        <td>${l.pass_rate}%</td>
        <td>${l.class_average}%</td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

// Chart rendering (Same as your previous code)
function renderCharts(data) {
  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();
  if (doughnutChart) doughnutChart.destroy();

  const lessons = data.lessons.filter(l => l.status !== 'locked');
  const labels = lessons.map(l => l.title);
  const scores = lessons.map(l => l.best_score || 0);

  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Best Score (%)', data: scores, backgroundColor: '#3b82f6', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
  });

  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: { labels: ['Attempt 1', 'Attempt 2', 'Attempt 3', 'Attempt 4', 'Attempt 5'], datasets: [{ label: 'Score (%)', data: [40, 55, 70, 85, scores[0] || 90], borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
  });

  const totalCorrect = data.summary.lessons_passed * 100;
  doughnutChart = new Chart(document.getElementById('doughnutChart'), {
    type: 'doughnut',
    data: { labels: ['Correct', 'Incorrect'], datasets: [{ data: [totalCorrect || 75, 100 - totalCorrect || 25], backgroundColor: ['#16a34a', '#dc2626'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
  });
}

document.addEventListener('DOMContentLoaded', loadStudents);