// public/teacher/create-lesson.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const form      = document.getElementById('lessonForm');
const message   = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    title:              document.getElementById('title').value.trim(),
    lesson_order:       Number(document.getElementById('lesson_order').value),
    grade_level:        document.getElementById('grade_level').value,
    description:        document.getElementById('description').value.trim() || null,
    discussion_content: document.getElementById('discussion_content').value,
    prerequisite_lesson_id: document.getElementById('prerequisite_lesson_id').value
      ? Number(document.getElementById('prerequisite_lesson_id').value)
      : null
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';
  showMessage('', 'error');

  try {
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/teacher-login.html';
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Failed to create lesson', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Lesson';
      return;
    }

    showMessage('Lesson created! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/teacher/lessons.html';
    }, 1000);

  } catch (err) {
    console.error('create lesson error:', err);
    showMessage('Could not reach server', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Lesson';
  }
});