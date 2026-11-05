// public/teacher/lesson-editor.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'teacher' && user.role !== 'admin') {
  window.location.href = '/student/dashboard.html';
}

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('id'); // If present, we are editing
const isEdit = !!lessonId;

// 1. Initialize the editor
initLessonEditor('#discussion_content');

let pendingQuizzes = []; // Holds quizzes before the lesson is saved

// 2. Load data if editing
async function loadLessonData() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load');
    const lesson = await res.json();

    document.getElementById('title').value = lesson.title;
    // document.getElementById('lesson_order').value = lesson.lesson_order;
    document.getElementById('grade_level').value = lesson.grade_level;
    document.getElementById('description').value = lesson.description || '';
    // document.getElementById('prerequisite_lesson_id').value = lesson.prerequisite_lesson_id || '';

    // Update UI
    document.getElementById('pageTitle').textContent = 'Edit Grammar Topic';
    document.getElementById('pageSubtitle').textContent = `Editing: ${lesson.title}`;
    document.getElementById('saveBtn').textContent = '💾 Save Changes';

    // Wait for TinyMCE to load, then set content
    const setContent = () => {
      const editor = tinymce.get('discussion_content');
      if (editor) {
        editor.setContent(lesson.discussion_content || '');
      } else {
        setTimeout(setContent, 100); // keep checking
      }
    };
    setContent();

  } catch (err) {
    console.error(err);
    showAlert('Error loading lesson data.', 'error');
  }
}
// 2. Load data if editing
async function loadLessonData() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load');
    const lesson = await res.json();

    document.getElementById('title').value = lesson.title;
    document.getElementById('grade_level').value = lesson.grade_level;
    document.getElementById('description').value = lesson.description || '';

    document.getElementById('pageTitle').textContent = 'Edit Grammar Topic';
    document.getElementById('pageSubtitle').textContent = `Editing: ${lesson.title}`;
    document.getElementById('saveBtn').textContent = '💾 Save Changes';

    // ⬇️ THE FIX: Wait for TinyMCE to be completely ready
    const waitForEditor = setInterval(() => {
      if (window.editorInstance) {
        clearInterval(waitForEditor);
        window.editorInstance.setContent(lesson.discussion_content || '');
      }
    }, 100);

  } catch (err) {
    console.error(err);
    showAlert('Error loading lesson data.', 'error');
  }
}

// 3. Handle Form Submit

document.getElementById('lessonForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  let content = '';
  if (window.editorInstance) {
    window.editorInstance.save();
    content = document.getElementById('discussion_content').value;
  } else {
    content = document.getElementById('discussion_content').value;
  }

  if (!content || content.trim() === '') {
    showAlert('Please write some content.', 'error');
    return;
  }

  const payload = {
    title: document.getElementById('title').value.trim(),
    grade_level: document.getElementById('grade_level').value,
    description: document.getElementById('description').value.trim() || null,
    discussion_content: content
  };

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  clearAlert();

  try {
    const url = isEdit ? `/api/lessons/${lessonId}` : '/api/lessons';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');

    showAlert('Lesson and quizzes saved successfully!', 'success');
    setTimeout(() => { window.location.href = '/teacher/lessons.html'; }, 1500);

  } catch (err) {
    console.error(err);
    showAlert(err.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? '💾 Save Changes' : '💾 Save Topic';
  }
});

// 4. Preview Function
function previewLesson() {
  if (typeof tinymce !== 'undefined' && tinymce.get('discussion_content')) {
    tinymce.triggerSave();
  }
  
  const title = document.getElementById('title').value || 'Preview';
  const content = document.getElementById('discussion_content').value;

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Preview: ${escapeHtml(title)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #4CAF50; padding-left: 15px; }
        .info-box-blue { background: #e3f2fd; border-left: 6px solid #2196F3; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .tip-box-green { background: #e8f5e9; border-left: 6px solid #4CAF50; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .warning-box-yellow { background: #fff3e0; border-left: 6px solid #FF9800; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .important-box-red { background: #ffebee; border-left: 6px solid #f44336; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .grammar-example { background: linear-gradient(135deg, #667eea 10%, #764ba2 100%); color: white; padding: 25px; margin: 25px 0; border-radius: 10px; }
        .grammar-example strong { color: #FFD700; }
        .grammar-example .explanation { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 5px; margin-top: 15px; }
        pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-left: 4px solid #4CAF50; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; }
        th { background: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      ${content}
      <hr>
      <p style="color: #999; text-align: center; margin-top: 40px;">📄 Preview — students will see exactly this layout.</p>
    </body>
    </html>
  `);
  win.document.close();
}

// ═══════════════════════════════════════════════════════
// INSERT QUIZ MODAL LOGIC
// ═══════════════════════════════════════════════════════

function openQuizModal() {

   if (!window.editorInstance) {
    alert("The editor is still loading. Please wait a moment.");
    return;
  }

  const modal = document.getElementById('quizModal');
  modal.style.display = 'flex';
  document.getElementById('modalQuizType').value = 'preposition';
  document.getElementById('modalQuestionText').value = '';
  renderModalFields('preposition');
}

function closeQuizModal() {
  document.getElementById('quizModal').style.display = 'none';
}

document.getElementById('modalQuizType')?.addEventListener('change', (e) => {
  renderModalFields(e.target.value);
});

function renderModalFields(type) {
  const container = document.getElementById('modalDynamicFields');
  if (type === 'preposition') {
    container.innerHTML = `
      <div class="form-group" style="margin-top:16px;">
        <label>Options (Comma-separated)</label>
        <input type="text" id="modalOptions" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;" value="at, in, on, for">
      </div>
      <div class="form-group">
        <label>Correct Option</label>
        <input type="text" id="modalCorrect" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;" value="at">
      </div>
      <div class="form-group">
        <label>Explanation (Optional)</label>
        <input type="text" id="modalExplanation" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
      </div>
    `;
  } else if (type === 'clause') {
    container.innerHTML = `
      <div class="form-group" style="margin-top:16px;">
        <label>Full Sentence</label>
        <input type="text" id="modalSentence" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Options (Comma-separated clauses)</label>
        <input type="text" id="modalOptions" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Correct Clause</label>
        <input type="text" id="modalCorrect" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Clause Type</label>
        <select id="modalClauseType" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:4px;">
          <option value="Independent">Independent</option>
          <option value="Dependent">Dependent</option>
        </select>
      </div>
    `;
  }
}

async function saveQuizToLesson() {
  const type = document.getElementById('modalQuizType').value;
  const text = document.getElementById('modalQuestionText').value.trim();
  const optionsRaw = document.getElementById('modalOptions').value;
  const correct = document.getElementById('modalCorrect').value.trim();
  
  if (!text || !correct) return alert('Question and correct answer are required.');

 

  const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (!options.includes(correct)) return alert('Correct answer must exactly match an option.');

  // Instead of a hidden div, we insert a visible "Quiz Block" that TinyMCE won't delete
  const blockId = 'quiz-block-' + Date.now();

  const quizData = { text, options, correct };

   const quizHtml = `
    <div class="inline-quiz-placeholder" title='${JSON.stringify(quizData)}' style="border: 2px dashed #3b82f6; background: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 8px;">
      <strong>📝 Interactive Quiz:</strong> ${text}<br>
      <em>(Options: ${options.join(', ')} | Correct: ${correct})</em>
    </div>
    <p><br></p>
  `;

  if (window.editorInstance) {
    window.editorInstance.insertContent(quizHtml);
  }

  closeQuizModal();
}

// 5. Utilities
function showAlert(text, type) {
  const box = document.getElementById('alertBox');
  box.textContent = text;
  box.className = `alert ${type}`;
  if (type === 'success') setTimeout(clearAlert, 4000);
}

function clearAlert() {
  document.getElementById('alertBox').className = 'alert';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}