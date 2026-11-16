// public/js/teacher-lessons.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allLessons = [];
let currentPreviewId = null;

async function loadLessons() {
  try {
    const res = await fetch('/api/lessons', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    
    allLessons = await res.json();
    renderTable(allLessons);

  } catch (err) {
    console.error(err);
    document.getElementById('lessonsBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading lessons.</td></tr>';
  }
}

function filterLessons(grade, tabElement) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');

  let filtered = allLessons;
  if (grade !== 'all') {
    filtered = allLessons.filter(l => 
      String(l.grade_level) === String(grade) || 
      (Array.isArray(l.grade_level) && l.grade_level.includes(Number(grade)))
    );
  }

  renderTable(filtered);
}

function renderTable(lessons) {
  const tbody = document.getElementById('lessonsBody');

  if (lessons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">No lessons found for this grade.</td></tr>';
    return;
  }

  tbody.innerHTML = lessons.map((l, index) => {
    const gradeDisplay = Array.isArray(l.grade_level) ? l.grade_level.join(', ') : l.grade_level;
    const isPublished = l.is_published === 1;
    const statusBadge = isPublished 
      ? '<span class="badge badge-published">Published</span>' 
      : '<span class="badge badge-draft">Draft</span>';

    return `
      <tr>
        <td>${index + 1}</td>
        <td><strong style="color:var(--navy);">${l.title}</strong></td>
        <td>Grade ${gradeDisplay}</td>
        <td>${statusBadge}</td>
        <td>
          <!-- PREVIEW BUTTON -->
          <button onclick="previewLesson(${l.lesson_id})" class="action-btn" style="color:var(--navy);" title="Preview">👁️</button>
          <a href="/teacher/lesson-editor.html?id=${l.lesson_id}" class="action-btn" style="color:var(--navy);" title="Edit">✏️</a>
          <button class="action-btn" style="color:#dc2626; border:none; background:none; cursor:pointer;" onclick="deleteLesson(${l.lesson_id})" title="Delete">🗑️</button>
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

document.addEventListener('DOMContentLoaded', loadLessons);