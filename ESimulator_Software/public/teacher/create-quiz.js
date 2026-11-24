const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';



// Read the URL parameter to set the default type
const urlParams = new URLSearchParams(window.location.search);
const typeParam = urlParams.get('type');

if (typeParam === 'pretest' || typeParam === 'final') {
  const purposeSelect = document.getElementById('quizPurpose');
  if (purposeSelect) {
    purposeSelect.value = typeParam;
  }

}

const subtitle = document.querySelector('.form-card p');
if (subtitle) {
  subtitle.textContent = typeParam === 'pretest' 
    ? 'Create a pre-test that students must pass before reading the lesson.' 
    : 'Select a lesson and choose the type of quiz.';
}


async function loadLessons() {
  try {
    // 🔥 Pass the purpose so the backend only filters out lessons with a FINAL quiz
    const res = await fetch('/api/lessons/withoutquiz?purpose=final', { 
      headers: { 'Authorization': `Bearer ${token}` } 
    });
    const lessons = await res.json();
    document.getElementById('lesson_id').innerHTML = '<option value="">-- Select Lesson --</option>' + 
      lessons.map(l => `<option value="${l.lesson_id}">Grade ${l.grade_level} • ${l.title}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}
loadLessons();

document.getElementById('quizForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.textContent = 'Creating...';

  const payload = {
    lesson_id: document.getElementById('lesson_id').value,
    quiz_type: document.getElementById('quiz_type').value,
    title: document.getElementById('title').value,
    passing_score: document.getElementById('passing_score').value,
    time_limit: document.getElementById('time_limit').value || null,
    max_quiz_attempts: document.getElementById('max_quiz_attempts').value || 3,
    questions_per_quiz: document.getElementById('questions_per_quiz').value || 10,
    quiz_purpose: typeParam // We are creating a final quiz
  };

  try {
    // We will use the existing /api/quizzes POST route
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload ) // Save as FINAL
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = `/teacher/quiz-editor.html?id=${data.quiz.quiz_id}`;
  } catch (err) {
    alert(err.message);
    btn.disabled = false; btn.textContent = 'Create Quiz & Add Questions →';
  }
});