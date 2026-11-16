// public/teacher/lessons.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadLessons() {
  try {
    const res = await fetch('/api/lessons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }

    const lessons = await res.json();
    const list = document.getElementById('lessonsList');

    if (lessons.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#94a3b8;">No lessons yet. Click "Create Lesson" to start.</td></tr>';
      return;
    }

    list.innerHTML = lessons.map(l => `
      <tr>
        <td>${l.lesson_order}</td>
        <td><strong>${escapeHtml(l.title)}</strong></td>
        <td>Grade ${l.grade_level}</td>
        <td><span class="badge ${l.is_published ? 'published' : 'draft'}">${l.is_published ? 'Published' : 'Draft'}</span></td>
        <td>
         <a href="/teacher/lesson-editor.html?id=${l.lesson_id}" class="action-link">Edit</a>
          <a href="/student/lesson.html?id=${l.lesson_id}" class="action-link" target="_blank">Preview</a>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('lessonsList').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:#dc2626;">Error loading lessons</td></tr>';
  }
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault(); localStorage.clear(); window.location.href = '/auth/teacher-login.html';
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadLessons();