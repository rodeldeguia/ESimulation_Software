const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'admin') {
  window.location.href = '/teacher/dashboard.html';
}

// Safely check if the element exists before updating it
const nameElement = document.getElementById('navUserName');
if (nameElement) {
    nameElement.textContent = user.full_name || 'Admin';
}

let allLessons = [];
let currentTab = 'pending'; // 'pending' or 'approved'

// 1. Load data
async function loadLessons() {
  const list = document.getElementById('lessonsList');
  try {
    const res = await fetch('/api/admin/lessons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load');
    
    allLessons = await res.json();
    renderLessons();

  } catch (err) {
    list.innerHTML = `<div class="empty-state" style="color:#dc2626;">Error: ${err.message}</div>`;
  }
}

// 2. Switch Tabs
function switchTab(tab, el) {
  currentTab = tab;
  
  // UI Updates
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.style.color = 'var(--text-muted)';
    t.style.borderBottomColor = 'transparent';
  });
  el.classList.add('active');
  el.style.color = 'var(--navy)';
  el.style.borderBottomColor = 'var(--navy)';

  renderLessons();
}

// 3. Render the table/cards

// public/js/admin-approvals.js

// public/js/admin-approvals.js

function renderLessons() {
  const list = document.getElementById('lessonsList');
  const gradeFilter = document.getElementById('gradeFilter').value;

  let filtered = allLessons.filter(l => {
    const matchTab = currentTab === 'pending' ? l.is_published === 0 : l.is_published === 1;
    
    // Grade filter handles both arrays like [7,8] and strings
    let grades = l.grade_level;
    if (typeof grades === 'string') {
      try { grades = JSON.parse(grades); } catch { grades = [grades]; }
    }
    if (Array.isArray(grades)) grades = grades.flat(Infinity);
    else grades = [grades];
    
    const matchGrade = gradeFilter === 'all' ? true : grades.map(String).includes(String(gradeFilter));

    // 🚨 NEW: Hide lessons without a final quiz from the Pending tab
    if (currentTab === 'pending') {
      const hasFinalQuiz = Number(l.final_quiz_count) > 0;
      if (!hasFinalQuiz) return false; 
    }

    return matchTab && matchGrade;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No ${currentTab} lessons found (with completed quizzes).</div>`;
    return;
  }

  list.innerHTML = filtered.map(l => {
    const isPending = currentTab === 'pending';
    const hasFinal = Number(l.final_quiz_count) > 0;
    const hasPreTest = Number(l.pretest_count) > 0;
    
    let quizStatus = '';
    if (hasFinal && hasPreTest) quizStatus = '<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">✅ Pre-Test & Final Quiz</span>';
    else if (hasFinal) quizStatus = '<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">✅ Final Quiz</span>';
    else if (hasPreTest) quizStatus = '<span style="background:#e0e7ff; color:#3730a3; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">✅ Pre-Test Only</span>';
    
    // Format grade display
    let gradeDisplay = l.grade_level;
    if (typeof gradeDisplay === 'string') {
      try { gradeDisplay = JSON.parse(gradeDisplay); } catch {}
    }
    if (Array.isArray(gradeDisplay)) gradeDisplay = gradeDisplay.flat(Infinity).join(', ');

    return `
      <div class="approval-card">
        <div class="approval-info">
          <h3>${isPending ? '' : '✅ '}${l.lesson_order}. ${l.title}</h3>
          <p class="teacher">👨‍🏫 Created by: ${l.teacher_name || 'Unknown Teacher'}</p>
          <p>📚 Grade ${gradeDisplay} • Order: ${l.lesson_order}</p>
          <p>📝 ${l.description || 'No description provided.'}</p>
          <div style="margin-top: 10px;">${quizStatus}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; min-width:140px;">
          <button class="btn btn-view" style="background:var(--navy); color:white;" onclick="viewLesson(${l.lesson_id})">👁️ View</button>
          
          ${isPending ? `
            <button class="btn btn-approve" onclick="approveLesson(${l.lesson_id})">✓ Approve</button>
            <button class="btn btn-reject" onclick="rejectLesson(${l.lesson_id})">✕ Reject</button>
          ` : `
            <button class="btn btn-reject" onclick="deleteLesson(${l.lesson_id})">🗑️ Delete</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// 4. Actions
async function approveLesson(id) {
  if (!confirm('Approve this lesson and make it visible to students?')) return;
  try {
    const res = await fetch(`/api/admin/lessons/${id}/approve`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadLessons();
    else alert('Failed to approve');
  } catch (err) { console.error(err); }
}

async function rejectLesson(id) {
  if (!confirm('Reject this lesson? It will remain a draft.')) return;
  try {
    const res = await fetch(`/api/admin/lessons/${id}/reject`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadLessons();
    else alert('Failed to reject');
  } catch (err) { console.error(err); }
}

async function deleteLesson(id) {
  if (!confirm('Are you sure you want to permanently delete this lesson? This will also delete its quizzes.')) return;
  try {
    const res = await fetch(`/api/lessons/${id}`, { // Reuse the teacher delete route
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadLessons();
    else alert('Failed to delete');
  } catch (err) { console.error(err); }
}

// 5. View Modal
// 5. View Modal
function viewLesson(lessonId) {
  // Find the lesson from the array
  const lesson = allLessons.find(l => l.lesson_id === lessonId);
  if (!lesson) return;
  
  // Set the title and meta
  document.getElementById('modalLessonTitle').textContent = lesson.title;
  document.getElementById('modalLessonMeta').textContent = `Grade ${lesson.grade_level} • By ${lesson.teacher_name}`;
  
  // Inject the HTML into the target div
  document.getElementById('content-render-target').innerHTML = lesson.discussion_content || '<p>No content.</p>';

  // Handle the approve button visibility
  const approveBtn = document.getElementById('modalApproveBtn');
  if (lesson.is_published) {
    approveBtn.style.display = 'none'; 
  } else {
    approveBtn.style.display = 'block';
    approveBtn.onclick = () => { approveLesson(lesson.lesson_id); closeViewModal(); };
  }

  // Show the modal
  document.getElementById('viewLessonModal').style.display = 'flex';
}

function closeViewModal() {
  document.getElementById('viewLessonModal').style.display = 'none';
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

loadLessons();