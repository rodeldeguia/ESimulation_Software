// public/teacher/create-quiz.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'teacher' && user.role !== 'admin') {
  window.location.href = '/student/dashboard.html';
}

const form = document.getElementById('quizForm');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const lessonSelect = document.getElementById('lesson_id');

// ─── Load lessons into the dropdown ───
async function loadLessons() {
  try {
    const res = await fetch('/api/lessons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load lessons');
    const lessons = await res.json();

    if (lessons.length === 0) {
      lessonSelect.innerHTML = '<option value="">No lessons yet — create a lesson first</option>';
      return;
    }

    lessonSelect.innerHTML = '<option value="">-- Select a lesson --</option>' +
      lessons.map(l => `<option value="${l.lesson_id}">Grade ${l.grade_level} • ${escapeHtml(l.title)}</option>`).join('');
  } catch (err) {
    console.error(err);
    lessonSelect.innerHTML = '<option value="">Error loading lessons</option>';
  }
}

// ─── Show message ───
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

// ─── Submit form ───
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('', 'error');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  const payload = {
    lesson_id: parseInt(document.getElementById('lesson_id').value),
    quiz_type: document.getElementById('quiz_type').value,
    quiz_purpose: document.getElementById('quiz_purpose').value,
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim() || null,
    passing_score: parseFloat(document.getElementById('passing_score').value),
    time_limit: document.getElementById('time_limit').value ? parseInt(document.getElementById('time_limit').value) : null,
    questions_per_quiz: parseInt(document.getElementById('questions_per_quiz').value) || 10
  };

  if (!payload.lesson_id || !payload.quiz_type || !payload.title) {
    showMessage('Please fill in all required fields.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Quiz & Continue to Add Questions →';
    return;
  }

  try {
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Failed to create quiz', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Quiz & Continue to Add Questions →';
      return;
    }

    showMessage('Quiz created! Redirecting to editor...', 'success');
    setTimeout(() => {
      window.location.href = `/teacher/quiz-editor.html?id=${data.quiz.quiz_id}`;
    }, 800);

  } catch (err) {
    console.error(err);
    showMessage('Could not reach the server', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Quiz & Continue to Add Questions →';
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadLessons();