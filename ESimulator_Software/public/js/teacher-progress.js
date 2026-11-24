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
  // 🔥 Define the tbody variable FIRST
  const tbody = document.getElementById('lessonTableBody');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading...</td></tr>';

  try {
    const res = await fetch('/api/teacher/lesson-stats', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    
    if (!res.ok) throw new Error('Failed to load lesson stats');
    const data = await res.json();
    
    // 🔥 Ensure it's an array
    const lessons = Array.isArray(data) ? data : [];
    
    if (lessons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No lesson stats available.</td></tr>';
      return;
    }
    
    // 🔥 Render the actual rows
    tbody.innerHTML = lessons.map(l => `
      <tr>
        <td style="font-weight:600; color:var(--navy);">${l.title}</td>
        <td>${l.total_attempts || 0}</td>
        <td>
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress-fill fill-green" style="width:${l.pass_rate || 0}%"></div>
            </div>
            ${l.pass_rate || 0}%
          </div>
        </td>
        <td>
          <div class="progress-wrapper">
            <div class="progress-bar">
              <div class="progress-fill fill-blue" style="width:${l.class_average || 0}%"></div>
            </div>
            ${l.class_average || 0}%
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error loading lesson stats.</td></tr>';
  }
}

// Chart rendering (Same as your previous code)
// Chart rendering
function renderCharts(data) {
  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();
  if (doughnutChart) doughnutChart.destroy();

  // ─── 1. BAR CHART (Best Score per Lesson) ───
  const activeLessons = data.lessons.filter(l => l.status !== 'locked');
  const barLabels = activeLessons.map(l => l.title);
  const barScores = activeLessons.map(l => l.best_score || 0);

  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { 
      labels: barLabels, 
      datasets: [{ label: 'Best Score (%)', data: barScores, backgroundColor: '#3b82f6', borderRadius: 4 }] 
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
  });

  // ─── 2. LINE CHART (Score Improvement Over Time) ───
  const sessions = data.sessions || [];
  const recentSessions = sessions.slice(-10); // Take last 10 attempts
  
  const lineLabels = recentSessions.map((s, i) => `Attempt ${i + 1}`);
  const lineScores = recentSessions.map(s => Number(s.score) || 0);

  const finalLabels = lineLabels.length > 0 ? lineLabels : ['No Attempts Yet'];
  const finalScores = lineScores.length > 0 ? lineScores : [0];

  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: { 
      labels: finalLabels, 
      datasets: [{ 
        label: 'Score (%)', 
        data: finalScores, 
        borderColor: '#16a34a', 
        backgroundColor: 'rgba(22, 163, 74, 0.1)', 
        fill: true, 
        tension: 0.4,
        pointBackgroundColor: '#16a34a',
        pointRadius: 4
      }] 
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
  });

  // ─── 3. DOUGHNUT CHART (Overall Answer Distribution) ───
  // 🚨 Now using the real data from the backend!
  const totalCorrect = data.summary.correct_answers || 0;
  const totalIncorrect = data.summary.incorrect_answers || 0;

  doughnutChart = new Chart(document.getElementById('doughnutChart'), {
    type: 'doughnut',
    data: { 
      labels: ['Correct', 'Incorrect'], 
      datasets: [{ 
        data: [totalCorrect, totalIncorrect], 
        backgroundColor: ['#16a34a', '#dc2626'], 
        borderWidth: 0 
      }] 
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      cutout: '70%',
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.raw}`;
            }
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadStudents);