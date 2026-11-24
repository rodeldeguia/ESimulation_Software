// public/js/teacher-lessons.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allLessons = [];
let currentPreviewId = null;

// 🚨 State variables for filtering
let currentMainTab = 'my_lessons'; // 'my_lessons' or 'all_published'
let currentGradeFilter = 'all';

async function loadLessons() {
  try {
    const res = await fetch('/api/lessons', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    
    allLessons = await res.json();
    applyFilters();

  } catch (err) {
    console.error(err);
    document.getElementById('lessonsBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading lessons.</td></tr>';
  }
}

function filterTab(tabName, tabElement) {
  document.querySelectorAll('#mainTabs .tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');
  currentMainTab = tabName;
  applyFilters();
}

function filterGrade(grade, tabElement) {
  document.querySelectorAll('#gradeTabs .tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');
  currentGradeFilter = grade;
  applyFilters();
}

function applyFilters() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentTeacherId = currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  let filtered = allLessons;

  // 1. Filter by Main Tab
  if (currentMainTab === 'my_lessons') {
    // Show only this teacher's lessons (drafts and published)
    filtered = filtered.filter(l => l.teacher_id === currentTeacherId);
  } else if (currentMainTab === 'all_published') {
    // Show ONLY published lessons from everyone
    filtered = filtered.filter(l => l.is_published === 1);
  }

  // 2. Filter by Grade Level
  if (currentGradeFilter !== 'all') {
    const targetGrade = String(currentGradeFilter);
    
    filtered = filtered.filter(l => {
      let grades = l.grade_level;
      if (typeof grades === 'string') {
        try { grades = JSON.parse(grades); } catch { grades = [grades]; }
      }
      if (Array.isArray(grades)) {
        grades = grades.flat(Infinity); 
      } else {
        grades = [grades];
      }
      const lessonGrades = grades.map(g => String(g));
      return lessonGrades.includes(targetGrade);
    });
  }

  renderTable(filtered);
}

function filterLessons(grade, tabElement) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');

  const filtered = allLessons.filter(l => {
    let grades = l.grade_level;

    // 1. Parse if it's a string
    if (typeof grades === 'string') {
      try {
        grades = JSON.parse(grades);
      } catch {
        grades = [grades];
      }
    }

    // 2. Handle the double bracket issue (flatten the array)
    // If it looks like [[7, 8]], this flattens it to [7, 8]
    if (Array.isArray(grades)) {
      grades = grades.flat(Infinity); 
    } else {
      grades = [grades];
    }

    // 3. Convert both to strings to safely compare (handles '7' vs 7)
    const targetGrade = String(grade);
    const lessonGrades = grades.map(g => String(g));

    return lessonGrades.includes(targetGrade);
  });

  renderTable(filtered);
} 

function renderTable(lessons) {
  const tbody = document.getElementById('lessonsBody');
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentTeacherId = currentUser.id;

  if (lessons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">No lessons found for this grade.</td></tr>';
    return;
  }

  tbody.innerHTML = lessons.map((l, index) => {
    const isOwner = l.teacher_id === currentTeacherId;
    
    // Handle grade level display
    let gradeDisplay = l.grade_level;
    if (typeof gradeDisplay === 'string') {
      try { gradeDisplay = JSON.parse(gradeDisplay); } catch { gradeDisplay = [gradeDisplay]; }
    }
    if (Array.isArray(gradeDisplay)) {
      gradeDisplay = gradeDisplay.flat(Infinity).join(', ');
    }

    const isPublished = l.is_published === 1;
    const statusBadge = isPublished 
      ? '<span class="badge badge-published">Published</span>' 
      : '<span class="badge badge-draft">Draft</span>';

    const authorName = isOwner ? 'You' : (l.teacher_name || 'Another Teacher');

    const hasPreTest = Number(l.pretest_count) > 0;
    const hasFinalQuiz = Number(l.final_count) > 0;

    let quizStatusHtml = '';
    if (!hasPreTest && !hasFinalQuiz) {
      quizStatusHtml = `<span class="badge" style="background:#fee2e2; color:#991b1b;">⚠️ No Quizzes</span>`;
    } else {
      const preTestBadge = hasPreTest 
        ? `<span class="badge" style="background:#e0e7ff; color:#3730a3;">✅ Pre-Test</span>` 
        : `<span class="badge" style="background:#f1f5f9; color:#94a3b8;">❌ No Pre-Test</span>`;
      
      const finalBadge = hasFinalQuiz 
        ? `<span class="badge" style="background:#dcfce7; color:#166534;">✅ Final Quiz</span>` 
        : `<span class="badge" style="background:#f1f5f9; color:#94a3b8;">❌ No Final Quiz</span>`;

      quizStatusHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap;">${preTestBadge} ${finalBadge}</div>`;
    }

       // 🚨 SUBMIT BUTTON LOGIC (Condition based, no new DB column)
    let submitBtnHtml = '';
    
    if (isOwner && !isPublished) {
      if (hasFinalQuiz) {
        // We use a custom data attribute to remember if we already clicked it
        submitBtnHtml = `
          <button id="btn-submit-${l.lesson_id}" class="action-btn" style="background:#16a34a; color:white; padding:4px 8px; border-radius:4px;" onclick="submitForApproval(${l.lesson_id}, this)">
            📤 Submit
          </button>
        `;
      } else {
        // Disabled if no final quiz
        submitBtnHtml = `
          <button class="action-btn" style="background:#f1f5f9; color:#94a3b8; cursor:not-allowed; padding:4px 8px; border-radius:4px;" title="Add a Final Quiz first" disabled>
            🔒 Locked
          </button>
        `;
      }
    }
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong style="color:var(--navy);">${l.title}</strong>
          <div style="font-size: 12px; color: var(--text-muted);">By ${authorName}</div>
        </td>
        <td>Grade ${gradeDisplay}</td>
        <td>${statusBadge}</td>
        <td>${quizStatusHtml}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
          <button onclick="previewLesson(${l.lesson_id})" class="action-btn" style="color:var(--navy);">Preview</button>
          
          ${isOwner ? `
            <a href="/teacher/lesson-editor.html?id=${l.lesson_id}" class="action-btn" style="color:var(--navy);">Edit</a>
            <button class="action-btn" style="color:#dc2626; border:none; background:none; cursor:pointer;" onclick="deleteLesson(${l.lesson_id})">Delete</button>
          ` : `
            <span style="font-size: 12px; color: #94a3b8; font-style: italic;">View Only</span>
          `}
          
          ${submitBtnHtml}
        </td>
      </tr>
    `;
  }).join('');
}
// ─── PREVIEW LOGIC ───
// ─── PREVIEW LOGIC (FETCH FULL CONTENT) ───
async function previewLesson(id) {
  document.getElementById('modalLessonTitle').textContent = 'Loading...';
  document.getElementById('modalLessonMeta').textContent = '';
  document.getElementById('content-render-target').innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">Loading lesson content...</div>';
  document.getElementById('previewModal').style.display = 'flex';

  try {
    const res = await fetch(`/api/lessons/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Failed to load lesson content");
    const lesson = await res.json();

    document.getElementById('modalLessonTitle').textContent = lesson.title;
    document.getElementById('modalLessonMeta').textContent = `Grade ${lesson.grade_level} • By ${lesson.teacher_name || 'You'}`;
    
    // 🔥 SCAN AND REPLACE EMBEDDED QUIZZES
    let content = lesson.discussion_content || '';
    const quizRegex = /<div class="embedded-quiz" data-quiz-id="(\d+)"[^>]*>.*?<\/div>/gs;
    const matches = [...content.matchAll(quizRegex)];

    for (const match of matches) {
      const fullMatchString = match[0];
      const quizId = match[1];
      
      // Find the quiz data in the lesson object
      const quiz = (lesson.embedded_quizzes || []).find(q => q.embed_quiz_id == quizId);
      
      if (quiz) {
        const optionsHTML = quiz.options.map(opt => `
          <label style="display:block; padding:10px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:8px;">
            <input type="radio" name="q_${quizId}" style="margin-right:8px;"> ${opt}
          </label>
        `).join('');

        const renderedQuiz = `
          <div style="background: #f8fafc; border: 2px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <strong style="color: #1e3a8a; font-size: 16px;">📝 Interactive Quiz</strong>
            <p style="margin-top: 10px; margin-bottom: 16px;">${quiz.question_text}</p>
            <div>${optionsHTML}</div>
          </div>
        `;
        
        content = content.replace(fullMatchString, renderedQuiz);
      }
    }

    document.getElementById('content-render-target').innerHTML = content;

  } catch (err) {
    console.error(err);
    document.getElementById('content-render-target').innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;">Error loading lesson content.</div>';
  }
}

function closePreviewModal() {
  document.getElementById('previewModal').style.display = 'none';
  currentPreviewId = null;
}

// ─── DELETE LOGIC ───
async function deleteLesson(id) {
  if (!confirm('Are you sure you want to delete this lesson? This will also delete all its quizzes and student progress.')) return;

  try {
    const res = await fetch(`/api/lessons/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      loadLessons();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete lesson');
    }
  } catch (err) {
    console.error(err);
    alert('Error deleting lesson');
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

async function submitForApproval(id, btnElement) {
  if (!confirm('Submit this lesson for admin approval?')) return;
  
  // 🚨 Instantly change the button text and color
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = '📤 Submitted';
  btnElement.style.background = '#e0e7ff';
  btnElement.style.color = '#3730a3';
  btnElement.style.cursor = 'not-allowed';
  btnElement.disabled = true;

  try {
    const res = await fetch(`/api/lessons/${id}/submit-approval`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      // Success, the button stays "Submitted"
      alert('Lesson submitted for approval! The admin will see it in the Pending tab.');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to submit');
      // Revert button if it failed
      btnElement.innerHTML = originalText;
      btnElement.style.background = '#16a34a';
      btnElement.style.color = 'white';
      btnElement.style.cursor = 'pointer';
      btnElement.disabled = false;
    }
  } catch (err) { 
    console.error(err);
    // Revert button on network error
    btnElement.innerHTML = originalText;
    btnElement.style.background = '#16a34a';
    btnElement.style.color = 'white';
    btnElement.style.cursor = 'pointer';
    btnElement.disabled = false;
  }
}
document.addEventListener('DOMContentLoaded', loadLessons);