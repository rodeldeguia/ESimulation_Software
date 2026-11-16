// public/teacher/lesson-editor.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'teacher' && user.role !== 'admin') {
  window.location.href = '/student/dashboard.html';
}

const params = new URLSearchParams(window.location.search);
const lessonId = params.get('id');
const isEdit = !!lessonId;
let preTestQuestions = [];
let finalQuizQuestions = [];
let pendingQuizzes = [];

// 1. Initialize the editor
initLessonEditor('#discussion_content');

// 2. Load data if editing
async function loadLessonData() {
  try {
    const res = await fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load');
    const lesson = await res.json();

    document.getElementById('title').value = lesson.title;
    document.getElementById('description').value = lesson.description || '';

    // Handle Multi-Grade Checkboxes
    let grades = lesson.grade_level;
    if (typeof grades === 'string') {
      try { grades = JSON.parse(grades); } catch(e) { grades = [grades]; }
    }
    if (!Array.isArray(grades)) grades = [grades];
    
    document.querySelectorAll('#gradeCheckboxes input[type="checkbox"]').forEach(cb => {
      cb.checked = grades.includes(Number(cb.value)) || grades.includes(cb.value);
    });

    if (lesson.pre_tests && lesson.pre_tests.length > 0) {
      preTestQuestions = lesson.pre_tests;
      document.getElementById('preTestBadge').style.display = 'inline-block';
    }

    if (lesson.final_quizzes && lesson.final_quizzes.length > 0) {
      finalQuizQuestions = lesson.final_quizzes;
      document.getElementById('finalQuizBadge').style.display = 'inline-block';
    }

    document.getElementById('pageTitle').textContent = 'Edit Grammar Topic';
    document.getElementById('saveBtn').textContent = '💾 Save Changes';

    const waitForEditor = setInterval(() => {
      if (window.editorInstance) {
        clearInterval(waitForEditor);
        let htmlContent = lesson.discussion_content || '';
        window.editorInstance.setContent(htmlContent);
      }
    }, 100);

  } catch (err) {
    console.error(err);
    alert('Error loading lesson data.');
  }
}

if (isEdit) loadLessonData();

// 3. Handle Form Submit
document.getElementById('lessonForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedGrades = Array.from(document.querySelectorAll('#gradeCheckboxes input:checked')).map(cb => Number(cb.value));
  
  if (selectedGrades.length === 0) {
    alert('Please select at least one Grade Level.');
    return;
  }

  let content = '';
  if (window.editorInstance) {
    window.editorInstance.save();
    content = document.getElementById('discussion_content').value;
  } else {
    content = document.getElementById('discussion_content').value;
  }

  if (!content || content.trim() === '') {
    alert('Please write some content for the lesson.');
    return;
  }

  const payload = {
    title: document.getElementById('title').value.trim(),
    grade_level: selectedGrades,
    description: document.getElementById('description').value.trim() || null,
    discussion_content: content,
    pre_tests: preTestQuestions,
    final_quizzes: finalQuizQuestions
  };

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const url = isEdit ? `/api/lessons/${lessonId}` : '/api/lessons';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    const resultData = await res.json();
    if (!res.ok) throw new Error(resultData.error || 'Save failed');

    alert('Lesson saved successfully!');
    window.location.href = '/teacher/lessons.html';

  } catch (err) {
    console.error(err);
    alert(err.message);
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? '💾 Save Changes' : '💾 Save Lesson';
  }
});

// 4. Preview Function
async function previewLesson() {
  if (typeof tinymce !== 'undefined' && tinymce.get('discussion_content')) {
    tinymce.triggerSave();
  }
  
  const title = document.getElementById('title').value || 'Preview';
  let content = document.getElementById('discussion_content').value;

  // 🔥 1. Find the NEW placeholder format (data-quiz-id="43")
  const quizRegex = /<div class="embedded-quiz" data-quiz-id="(\d+)"[^>]*>.*?<\/div>/gs;
  const matches = [...content.matchAll(quizRegex)];

  // 🔥 2. Fetch each quiz from the database and render it
  for (const match of matches) {
    const fullMatchString = match[0];
    const quizId = match[1];

    try {
      // We use the API we created to fetch the quiz by ID
      const res = await fetch(`/api/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const quiz = await res.json();
      
      if (quiz && quiz.options) {
        // Build the actual quiz UI
        const optionsHTML = quiz.options.map((opt, idx) => `
          <label style="display:block; padding:10px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:8px; cursor:pointer;">
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
        
        // Replace the empty div with the real quiz UI
        content = content.replace(fullMatchString, renderedQuiz);
      }
    } catch (err) {
      console.error("Failed to load quiz for preview", quizId);
    }
  }

  // 3. Open the window
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
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; }
        th { background: #4CAF50; color: white; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${content}
      <hr>
      <p style="color: #999; text-align: center; margin-top: 40px;">📄 Preview — students will see this layout.</p>
    </body>
    </html>
  `);
  win.document.close();
}

// ═══════════════════════════════════════════════════════
// PRE-TEST BUILDER LOGIC (THE MISSING PART)
// ═══════════════════════════════════════════════════════
function openPreTestModal() {
  const modal = document.getElementById('preTestModal');
  if (!modal) {
    alert("Modal not found in HTML.");
    return;
  }
  
  // 🔥 THE MAGIC FIX: Move modal to the body so it escapes the editor container
  document.body.appendChild(modal); 
  
  modal.style.display = 'flex';
  renderModalPreTestList();
}
function closePreTestModal() {
  document.getElementById('preTestModal').style.display = 'none';
}

function addPreTestQuestion() {
  const text = document.getElementById('ptQuestion').value.trim();
  const optionsRaw = document.getElementById('ptOptions').value;
  const correct = document.getElementById('ptCorrect').value.trim();

  if (!text || !correct || !optionsRaw) {
    return alert('Question, options, and correct answer are required.');
  }
  
  const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (!options.includes(correct)) {
    return alert('Correct answer must exactly match one of the options.');
  }

  preTestQuestions.push({
    question_text: text,
    options: options,
    correct_option_index: options.indexOf(correct),
    correct_answer: correct
  });

  // Clear inputs
  document.getElementById('ptQuestion').value = '';
  document.getElementById('ptOptions').value = '';
  document.getElementById('ptCorrect').value = '';
  
  // Show badge
  document.getElementById('preTestBadge').style.display = 'inline-block';

  // Re-render list
  renderModalPreTestList();
}

function renderModalPreTestList() {
  const list = document.getElementById('modalPreTestList');
  if (preTestQuestions.length === 0) {
    list.innerHTML = '<p style="color:#64748b; font-size:14px; text-align:center;">No questions added yet.</p>';
    return;
  }

  list.innerHTML = preTestQuestions.map((q, i) => `
    <div style="background:white; border:1px solid #e2e8f0; padding:12px; margin-bottom:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>Q${i+1}:</strong> ${escapeHtml(q.question_text)}<br>
        <span style="font-size:12px; color:#64748b;">Options: ${q.options.join(', ')} | Correct: ${q.correct_answer}</span>
      </div>
      <button type="button" onclick="removePreTestQuestion(${i})" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">Remove</button>
    </div>
  `).join('');
}

function removePreTestQuestion(index) {
  preTestQuestions.splice(index, 1);
  renderModalPreTestList();
}

function previewPreTest() {
  if (preTestQuestions.length === 0) return alert('Add some questions first!');
  
  const win = window.open('', '_blank');
  let html = '<html><head><title>Pre-Test Preview</title><style>body{font-family:sans-serif; padding:40px; max-width:800px; margin:auto;}</style></head><body>';
  html += '<h1>Pre-Test Preview</h1>';
  
  preTestQuestions.forEach((q, i) => {
    html += `<div style="margin-bottom:20px; border:1px solid #ccc; padding:15px; border-radius:8px;">`;
    html += `<strong>Q${i+1}: ${q.question_text}</strong><br><br>`;
    q.options.forEach(opt => {
      html += `<label style="display:block; margin-bottom:5px;"><input type="radio" name="q${i}"> ${opt}</label>`;
    });
    html += `</div>`;
  });
  
  html += '</body></html>';
  win.document.write(html);
  win.document.close();
}

// Utilities
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function openQuizModal() {
  if (!window.editorInstance) {
    alert("The editor is still loading. Please wait a moment.");
    return;
  }

  const modal = document.getElementById('quizModal');
  if (!modal) {
    alert("Quiz Modal not found in HTML.");
    return;
  }
  
  // 🔥 Move to body so it sits above TinyMCE
  document.body.appendChild(modal); 
  
  modal.style.display = 'flex';
  document.getElementById('modalQuizType').value = 'preposition';
  document.getElementById('modalQuestionText').value = '';
  renderModalFields('preposition');
}

function closeQuizModal() {
  document.getElementById('quizModal').style.display = 'none';
}

function openPreTestModal() {
  const modal = document.getElementById('preTestModal');
  if (!modal) return;
  
  // 🔥 Move to body so it sits above TinyMCE
  document.body.appendChild(modal); 
  
  modal.style.display = 'flex';
  renderModalPreTestList();
}

// ═══════════════════════════════════════════════════════
// INLINE QUIZ MODAL LOGIC (THE MISSING PART)
// ═══════════════════════════════════════════════════════

// 1. This function builds the form fields inside the modal
function renderModalFields(type) {
  const container = document.getElementById('modalDynamicFields');
  
  if (type === 'preposition') {
    container.innerHTML = `
      <div class="form-group" style="margin-top:16px;">
        <label>Options (Comma-separated)</label>
        <input type="text" id="modalOptions" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;" value="at, in, on, for">
      </div>
      <div class="form-group">
        <label>Correct Option</label>
        <input type="text" id="modalCorrect" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;" value="at">
      </div>
      <div class="form-group">
        <label>Explanation (Optional)</label>
        <input type="text" id="modalExplanation" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;">
      </div>
    `;
  } else if (type === 'clause') {
    container.innerHTML = `
      <div class="form-group" style="margin-top:16px;">
        <label>Full Sentence</label>
        <input type="text" id="modalSentence" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Options (Comma-separated clauses)</label>
        <input type="text" id="modalOptions" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Correct Clause</label>
        <input type="text" id="modalCorrect" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;">
      </div>
      <div class="form-group">
        <label>Clause Type</label>
        <select id="modalClauseType" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:4px;">
          <option value="Independent">Independent</option>
          <option value="Dependent">Dependent</option>
        </select>
      </div>
    `;
  }
}

// 2. Listen for changes on the Quiz Type dropdown
document.getElementById('modalQuizType')?.addEventListener('change', (e) => {
  renderModalFields(e.target.value);
});

// 3. Save the Quiz to the Editor
async function saveQuizToLesson() {
  const type = document.getElementById('modalQuizType').value;
  const text = document.getElementById('modalQuestionText').value.trim();
  const optionsRaw = document.getElementById('modalOptions')?.value || '';
  const correct = document.getElementById('modalCorrect')?.value.trim() || '';
  
  if (!text || !correct) {
    return alert('Question and correct answer are required.');
  }

  const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (!options.includes(correct)) {
    return alert('Correct answer must exactly match an option.');
  }

  // 🔥 1. Save to backend FIRST
  try {
    const res = await fetch('/api/quizzes/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        lesson_id: lessonId || null, // If new lesson, will link on save
        question_text: text,
        options: options,
        correct_option_index: options.indexOf(correct),
        created_by: user.id
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save quiz');

    const realQuizId = result.quiz_id || result.embed_quiz_id || result.insertId;

    // 🔥 2. Insert the placeholder with the REAL ID (matches backend regex)
    const quizHtml = `
      <div class="embedded-quiz" data-quiz-id="${realQuizId}" contenteditable="false" style="border: 2px dashed #3b82f6; background: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <strong>📝 Interactive Quiz (ID: ${realQuizId})</strong><br>
        <em>Click "Save Lesson" to finalize.</em>
      </div>
      <p><br></p>
    `;

    if (window.editorInstance) {
      window.editorInstance.insertContent(quizHtml);
    }

    closeQuizModal();
    
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}