// public/teacher/quiz-editor.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
if (user.role !== 'teacher' && user.role !== 'admin') {
  window.location.href = '/student/dashboard.html';
}

const params = new URLSearchParams(window.location.search);
const quizId = params.get('id');
if (!quizId) window.location.href = '/teacher/dashboard.html';

// ─── STATE ───
let quiz = null;
let questions = [];

// ─── HELPERS ───
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function showMessage(text, type) {
  const m = document.getElementById('message');
  m.textContent = text;
  m.className = `message ${type}`;
  if (type === 'success') setTimeout(() => { m.className = 'message'; }, 3000);
}

// ─── LOAD QUIZ ───
async function loadQuiz() {
  try {
    const res = await fetch(`/api/quizzes/${quizId}/edit`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    if (res.status === 403) { alert('You cannot edit this quiz'); window.location.href = '/teacher/dashboard.html'; return; }
    if (res.status === 404) { document.getElementById('quizTitle').textContent = 'Quiz not found'; return; }

    const data = await res.json();
    quiz = data.quiz;
    questions = data.questions;

    renderQuizInfo();
    renderQuestionsList();
    renderQuestionForm();

  } catch (err) {
    console.error(err);
    document.getElementById('quizTitle').textContent = 'Error loading quiz';
  }
}

// ─── RENDER QUIZ INFO ───
function renderQuizInfo() {
  document.getElementById('quizTitle').textContent = quiz.title;
  document.getElementById('quizMeta').textContent =
    `${formatQuizType(quiz.quiz_type)} • Passing: ${quiz.passing_score}% • ${questions.length} question${questions.length !== 1 ? 's' : ''}`;


   document.getElementById('setTitle').value = quiz.title;
  document.getElementById('setPassing').value = quiz.passing_score;
  document.getElementById('setTime').value = quiz.time_limit || '';
  document.getElementById('setAttempts').value = quiz.max_quiz_attempts || 3;
  document.getElementById('setItemsToShow').value = quiz.questions_per_quiz || 10;

  const banner = document.getElementById('statusBanner');
  if (quiz.is_published) {
    banner.className = 'status-banner published';
    banner.innerHTML = '<span>✅ This quiz is PUBLISHED — students can take it</span>';
    document.getElementById('publishBtn').style.display = 'none';
  } else {
    banner.className = 'status-banner draft';
    banner.innerHTML = '<span>📝 This quiz is a DRAFT — students cannot see it yet</span>';
  }
}

// ─── RENDER QUESTIONS LIST ───

function renderQuestionsList() {
  document.getElementById('questionCount').textContent = questions.length;
  const list = document.getElementById('questionsList');

  if (questions.length === 0) {
    list.innerHTML = '<div class="empty-state" style="color:#64748b; font-size:14px;">No questions yet. Add your first one below.</div>';
    return;
  }

  list.innerHTML = questions.map((q, i) => {
    return `
      <div class="question-item">
        <h4>Q${i + 1}: ${escapeHtml(getQuestionText(q))}</h4>
        ${renderQuestionPreview(q)}
        <div style="margin-top:12px; display:flex; gap:10px; border-top:1px solid #e2e8f0; padding-top:10px;">
        <button class="btn btn-outline" style="padding:4px 10px; font-size:12px;" onclick='openEditModal(${JSON.stringify(q).replace(/'/g, "&#39;")})'>✏️ Edit</button>
          <button class="btn btn-outline" style="padding:4px 10px; font-size:12px; color:#dc2626; border-color:#fca5a5;" onclick="deleteQuestion(${q.question_id})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}
// ─── Get the display text for a question (varies by type) ───
function getQuestionText(q) {
  if (quiz.quiz_type === 'preposition') return q.question_text;
  if (quiz.quiz_type === 'irregular_verb') return q.question_text;
  if (quiz.quiz_type === 'clause') return q.question_text;
  if (quiz.quiz_type === 'sva') return q.instruction;
  if (quiz.quiz_type === 'phrasal_verb') return q.instruction;
  if (quiz.quiz_type === 'sentence_pattern') return q.instruction;
  return '(unknown)';
}

// ─── Preview each question in the list ───
function renderQuestionPreview(q) {
  if (quiz.quiz_type === 'preposition' || quiz.quiz_type === 'clause') {
    const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    return `
      <p>Options: ${options.map(o => escapeHtml(o)).join(' / ')}</p>
      <p class="correct">✓ Correct: ${escapeHtml(options[q.correct_option_index] || '(none)')}</p>
    `;
  }
  if (quiz.quiz_type === 'irregular_verb') {
    return `
      <p>Verb: <strong>${escapeHtml(q.present_form)}</strong> → asking for <strong>${q.ask_for}</strong></p>
      <p class="correct">✓ Correct: ${escapeHtml(q.correct_answer)}</p>
    `;
  }
  if (quiz.quiz_type === 'sva') {
    return `
      <p>Target: <strong>${q.subject_type}</strong> subject, <strong>${q.verb_type}</strong> verb</p>
      <p>Example: <em>${escapeHtml(q.example_sentence || '')}</em></p>
    `;
  }
  if (quiz.quiz_type === 'phrasal_verb') {
    
    // return `
    //   <p>Target verb: <strong>${escapeHtml(q.target_phrasal_verb)}</strong></p>
    //   <p>Alternatives: ${Array.isArray(q.alternative_verbs) ? q.alternative_verbs.map(a => escapeHtml(a)).join(', ') : '(none)'}</p>
    //   <p>Example: <em>${escapeHtml(q.example_sentence || '')}</em></p>
    // `;
  }
  if (quiz.quiz_type === 'sentence_pattern') {
    return `
      <p>Target pattern: <strong>${escapeHtml(q.target_pattern)}</strong></p>
      <p>Allowed: ${Array.isArray(q.allowed_patterns) ? q.allowed_patterns.join(', ') : '(none)'}</p>
    `;
  }
  return '';
}

// ─── Format quiz type name ───
function formatQuizType(type) {
  const map = {
    preposition: 'Preposition (Multiple Choice)',
    irregular_verb: 'Irregular Verb',
    clause: 'Clause (Two-step)',
    sva: 'Subject-Verb Agreement',
    phrasal_verb: 'Phrasal Verb',
    sentence_pattern: 'Sentence Pattern'
  };
  return map[type] || type;
}

// ─── RENDER the add-question form (different per type) ───
function renderQuestionForm() {
  const container = document.getElementById('dynamicQuestionForm');
  container.classList.add('active');

  const common = `
    <div class="form-group">
      <label>Points</label>
      <input type="number" id="q_points" value="2" min="1" required>
    </div>
    <div class="form-group">
      <label>Hint (optional)</label>
      <input type="text" id="q_hint" placeholder="e.g., Think about tense...">
    </div>
  `;

  if (quiz.quiz_type === 'preposition') {
    container.innerHTML = `
      <div class="form-group">
        <label>Question Text</label>
        <input type="text" id="q_text" required placeholder="e.g., She is good ___ math.">
      </div>
      <div class="form-group">
        <label>Instructions (optional)</label>
        <input type="text" id="q_instructions" placeholder="e.g., Choose the correct preposition.">
      </div>
      ${common}
      <div class="form-group">
        <label>Options (one per line, minimum 2)</label>
        <textarea id="q_options" required placeholder="at&#10;in&#10;on&#10;for"></textarea>
      </div>
      <div class="form-group">
        <label>Correct Option (the exact text of the correct answer)</label>
        <input type="text" id="q_correct" required placeholder="at">
      </div>
      <div class="form-group">
        <label>Explanation (optional)</label>
        <textarea id="q_explanation" placeholder="Explain why this is correct..."></textarea>
      </div>
    `;
      } else if (quiz.quiz_type === 'irregular_verb') {
    container.innerHTML = `
      <div class="form-group">
        <label>Question Text (e.g. Fill in the missing forms )</label>
        <input type="text" id="q_text"  value = "Fill in the missing tense forms" required >
      </div>
      ${common}
      
      <div class="row">
        <div class="form-group">
          <label>Present Form</label>
          <input type="text" id="q_present" required placeholder="go">
        </div>
        <div class="form-group">
          <label>Past Form</label>
          <input type="text" id="q_past" required placeholder="went">
        </div>
      </div>
      <div class="row">
        <div class="form-group">
          <label>Future Form</label>
          <input type="text" id="q_future" required placeholder="will go">
        </div>
        <div class="form-group">
          <label>Past Participle</label>
          <input type="text" id="q_participle" required placeholder="gone">
        </div>
      </div>

      <div class="form-group" style="background:#f0fdf4; padding:16px; border-radius:8px; border:1px solid #bbf7d0;">
        <label style="color:#166534; margin-bottom:12px;">Which fields should the student fill in? (Check all that apply)</label>
        <div style="display:flex; gap:16px;">
          <label><input type="checkbox" id="blank_present" value="present"> Present</label>
          <label><input type="checkbox" id="blank_past" value="past"> Past</label>
          <label><input type="checkbox" id="blank_future" value="future"> Future</label>
          <label><input type="checkbox" id="blank_participle" value="past_participle"> Past Participle</label>
        </div>
      </div>

      <div class="form-group">
        <label>Example Sentence (optional)</label>
        <input type="text" id="q_example" placeholder="Yesterday I went to the store.">
      </div>
    `;
  
    
  } else if (quiz.quiz_type === 'clause') {
    container.innerHTML = `
      <div class="form-group">
        <label>Question Text</label>
        <input type="text" id="q_text" required value="Which part of the sentence is a clause?">
      </div>
      <div class="form-group">
        <label>Full Sentence</label>
        <textarea id="q_sentence" required placeholder="Maria believes if we work together, we will succeed."></textarea>
      </div>
      <div class="form-group">
        <label>Correct Clause (the answer text)</label>
        <input type="text" id="q_clause_text" required placeholder="if we work together">
      </div>
      <div class="form-group">
        <label>Clause Type</label>
        <select id="q_clause_type" required>
          <option value="Independent">Independent</option>
          <option value="Dependent">Dependent</option>
          <option value="Relative">Relative</option>
          <option value="Main">Main</option>
        </select>
      </div>
      ${common}
      <div class="form-group">
        <label>Options (one per line — one of these must match the correct clause above)</label>
        <textarea id="q_options" required placeholder="Maria believes&#10;if we work together&#10;we will succeed&#10;Maria believes we work together"></textarea>
      </div>
      <div class="form-group">
        <label>Explanation (optional)</label>
        <textarea id="q_explanation"></textarea>
      </div>
    `;
  } else if (quiz.quiz_type === 'sva') {
    container.innerHTML = `
      <div class="form-group">
        <label>Instruction</label>
        <input type="text" id="q_instruction" required placeholder="Write a sentence with a singular subject and singular verb.">
      </div>
      ${common}
      <div class="row">
        <div class="form-group">
          <label>Subject Type</label>
          <select id="q_subject_type" required>
            <option value="singular">Singular</option>
            <option value="plural">Plural</option>
            <option value="collective">Collective</option>
          </select>
        </div>
        <div class="form-group">
          <label>Verb Type</label>
          <select id="q_verb_type" required>
            <option value="singular">Singular</option>
            <option value="plural">Plural</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div class="form-group">
          <label>Min Words</label>
          <input type="number" id="q_min" value="5" min="1" required>
        </div>
        <div class="form-group">
          <label>Max Words</label>
          <input type="number" id="q_max" value="15" min="1" required>
        </div>
      </div>
      <div class="form-group">
        <label>Example Sentence (used in feedback)</label>
        <input type="text" id="q_example" required placeholder="She walks to school every day.">
      </div>
      <div class="form-group">
        <label>Context (optional)</label>
        <textarea id="q_context" placeholder="Think of one person or thing doing something."></textarea>
      </div>
    `;
    } else if (quiz.quiz_type === 'phrasal_verb') {
    container.innerHTML = `
      <div class="form-group">
        <label>Instruction</label>
        <input type="text" id="q_instruction" required value="Write a sentence using any phrasal verb you have learned.">
      </div>
      ${common}
      
      <div class="row">
        <div class="form-group">
          <label>Min Words</label>
          <input type="number" id="q_min" value="5" min="1" required>
        </div>
        <div class="form-group">
          <label>Max Words</label>
          <input type="number" id="q_max" value="15" min="1" required>
        </div>
      </div>
      
      <div class="form-group">
        <label>Example Sentence (Optional - for feedback)</label>
        <input type="text" id="q_example" placeholder="e.g., She gave up smoking last year.">
      </div>
    `;
  
    } else if (quiz.quiz_type === 'sentence_pattern') {
    container.innerHTML = `
      <div class="form-group">
        <label>Instruction</label>
        <input type="text" id="q_instruction" required value="Write a sentence and select its pattern.">
      </div>
      ${common}
      
      <div class="row">
        <div class="form-group">
          <label>Min Words</label>
          <input type="number" id="q_min" value="3" required>
        </div>
        <div class="form-group">
          <label>Max Words</label>
          <input type="number" id="q_max" value="15" required>
        </div>
      </div>
    `;
  }
}

// ─── SUBMIT a new question ───
document.getElementById('questionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const addBtn = document.getElementById('addBtn');
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';
  showMessage('', 'error');

  try {
    const payload = buildQuestionPayload();
    const res = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Failed to add question', 'error');
    } else {
      showMessage('Question added!', 'success');
      document.getElementById('questionForm').reset();
      await loadQuiz();   // reload questions list
    }
  } catch (err) {
    console.error(err);
    showMessage('Could not reach the server', 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = 'Add Question';
  }
});

// ─── BUILD the payload from the form (differs per quiz type) ───
function buildQuestionPayload() {
  const base = {
    points: parseInt(document.getElementById('q_points').value) || 2,
    hint: document.getElementById('q_hint').value.trim() || null
  };

  if (quiz.quiz_type === 'preposition') {
    const options = document.getElementById('q_options').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    const correct = document.getElementById('q_correct').value.trim();
    return {
      ...base,
      question_text: document.getElementById('q_text').value.trim(),
      instructions: document.getElementById('q_instructions').value.trim() || null,
      options,
      correct_option_index: options.indexOf(correct),
      correct_answer: correct,
      explanation: document.getElementById('q_explanation').value.trim() || null
    };
  }

  if (quiz.quiz_type === 'irregular_verb') {
    const blankFields = [];
    if (document.getElementById('blank_present').checked) blankFields.push('present');
    if (document.getElementById('blank_past').checked) blankFields.push('past');
    if (document.getElementById('blank_future').checked) blankFields.push('future');
    if (document.getElementById('blank_participle').checked) blankFields.push('past_participle');

    if (blankFields.length === 0) {
      throw new Error('Please select at least one blank field for the student to fill.');
    }

    return {
      ...base,
      question_text: document.getElementById('q_text').value.trim(),
      present_form: document.getElementById('q_present').value.trim(),
      past_form: document.getElementById('q_past').value.trim(),
      future_form: document.getElementById('q_future').value.trim(),
      past_participle: document.getElementById('q_participle').value.trim(),
      blank_fields: blankFields,
      example_sentence: document.getElementById('q_example').value.trim() || null
    };
  }

  if (quiz.quiz_type === 'clause') {
    const options = document.getElementById('q_options').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    const correctClause = document.getElementById('q_clause_text').value.trim();
    return {
      ...base,
      question_text: document.getElementById('q_text').value.trim(),
      sentence: document.getElementById('q_sentence').value.trim(),
      clause_text: correctClause,
      clause_type: document.getElementById('q_clause_type').value,
      options,
      correct_option_index: options.indexOf(correctClause),
      explanation: document.getElementById('q_explanation').value.trim() || null
    };
  }

  if (quiz.quiz_type === 'sva') {
    return {
      ...base,
      instruction: document.getElementById('q_instruction').value.trim(),
      subject_type: document.getElementById('q_subject_type').value,
      verb_type: document.getElementById('q_verb_type').value,
      min_sentence_length: parseInt(document.getElementById('q_min').value),
      max_sentence_length: parseInt(document.getElementById('q_max').value),
      example_sentence: document.getElementById('q_example').value.trim(),
      context: document.getElementById('q_context').value.trim() || null,
        // Phase 11 already validates; no extra rules needed
    };
  }

  if (quiz.quiz_type === 'phrasal_verb') {
    return {
      ...base,
      instruction: document.getElementById('q_instruction').value.trim(),
      min_sentence_length: parseInt(document.getElementById('q_min').value),
      max_sentence_length: parseInt(document.getElementById('q_max').value),
      example_sentence: document.getElementById('q_example').value.trim() || null,
    
    };
  }
  
   if (quiz.quiz_type === 'sentence_pattern') {
    return {
      ...base,
       instruction: document.getElementById('q_instruction').value.trim(),
      // NO target_pattern sent!
      allowed_patterns: ['S-V-O', 'S-IV', 'S-LV-C', 'S-TV-O'],
      min_sentence_length: parseInt(document.getElementById('q_min').value),
      max_sentence_length: parseInt(document.getElementById('q_max').value),
     
    };
  }

  throw new Error('Unknown quiz type');
}

// ─── PUBLISH quiz ───
document.getElementById('publishBtn').addEventListener('click', async () => {
  if (questions.length === 0) {
    alert('Add at least one question before publishing.');
    return;
  }
  if (!confirm('Publish this quiz? Students will be able to take it.')) return;

  try {
    const res = await fetch(`/api/quizzes/${quizId}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      alert('Quiz published!');
      loadQuiz();
    } else {
      alert(data.error || 'Failed to publish');
    }
  } catch (err) {
    console.error(err);
    alert('Error publishing quiz');
  }
});


async function deleteQuestion(questionId) {
  if (!confirm('Are you sure you want to delete this question?')) return;

  try {
    const res = await fetch(`/api/quizzes/${quizId}/questions/${questionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      await loadQuiz(); // Reload the list
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete question');
    }
  } catch (err) {
    console.error(err);
    alert('Error deleting question');
  }
}

// ─── QUIZ SETTINGS ───
function toggleSettings() {
  const el = document.getElementById('quizSettings');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function saveSettings() {
  const payload = {
    title: document.getElementById('setTitle').value.trim(),
    passing_score: parseFloat(document.getElementById('setPassing').value),
    time_limit: document.getElementById('setTime').value ? parseInt(document.getElementById('setTime').value) : null,
    max_quiz_attempts: parseInt(document.getElementById('setAttempts').value) || 3,
    questions_per_quiz: parseInt(document.getElementById('setItemsToShow').value) || 10
  };

  try {
    const res = await fetch(`/api/quizzes/${quizId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Settings saved successfully!');
      loadQuiz(); // Reload to update the header title/meta
      toggleSettings(); // Hide the form
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save settings');
    }
  } catch (err) {
    console.error(err);
    alert('Error saving settings');
  }
}

function editQuestion(q) {
  // 1. Confirm with the teacher
  // if (!confirm('To edit this question, the old one will be deleted and loaded into the form. Continue?')) return;

  // 2. Populate the form based on the quiz type
  const type = quiz.quiz_type;

  if (type === 'preposition') {
    document.getElementById('q_text').value = q.question_text;
    document.getElementById('q_instructions').value = q.instructions || '';
    document.getElementById('q_options').value = q.options.join('\n');
    document.getElementById('q_correct').value = q.options[q.correct_option_index] || '';
    document.getElementById('q_explanation').value = q.explanation || '';
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
  } 
  else if (type === 'irregular_verb') {
    document.getElementById('q_text').value = q.question_text;
    document.getElementById('q_present').value = q.present_form;
    document.getElementById('q_past').value = q.past_form;
    document.getElementById('q_future').value = q.future_form;
    document.getElementById('q_participle').value = q.past_participle;
    document.getElementById('q_example').value = q.example_sentence || '';
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
    
    // Check the blank fields
    const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
    document.getElementById('blank_present').checked = blanks.includes('present');
    document.getElementById('blank_past').checked = blanks.includes('past');
    document.getElementById('blank_future').checked = blanks.includes('future');
    document.getElementById('blank_participle').checked = blanks.includes('past_participle');
  }
  else if (type === 'clause') {
    document.getElementById('q_text').value = q.question_text;
    document.getElementById('q_sentence').value = q.sentence;
    document.getElementById('q_clause_text').value = q.clause_text;
    document.getElementById('q_clause_type').value = q.clause_type;
    document.getElementById('q_options').value = q.options.join('\n');
    document.getElementById('q_explanation').value = q.explanation || '';
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
  }
  else if (type === 'sva') {
    document.getElementById('q_instruction').value = q.instruction;
    document.getElementById('q_subject_type').value = q.subject_type;
    document.getElementById('q_verb_type').value = q.verb_type;
    document.getElementById('q_example').value = q.example_sentence || '';
    document.getElementById('q_context').value = q.context || '';
    document.getElementById('q_min').value = q.min_sentence_length || 5;
    document.getElementById('q_max').value = q.max_sentence_length || 15;
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
  }
  else if (type === 'phrasal_verb') {
    document.getElementById('q_instruction').value = q.instruction;
    document.getElementById('q_example').value = q.example_sentence || '';
    document.getElementById('q_min').value = q.min_sentence_length || 5;
    document.getElementById('q_max').value = q.max_sentence_length || 15;
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
  }
  else if (type === 'sentence_pattern') {
    document.getElementById('q_instruction').value = q.instruction;
    document.getElementById('q_min').value = q.min_sentence_length || 3;
    document.getElementById('q_max').value = q.max_sentence_length || 15;
    document.getElementById('q_points').value = q.points || 2;
    document.getElementById('q_hint').value = q.hint || '';
  }

  // 3. Delete the old question from the database (so we don't duplicate it)
  deleteQuestionSilently(q.question_id);

  // 4. Scroll to the form so the teacher can edit it
  document.getElementById('dynamicQuestionForm').scrollIntoView({ behavior: 'smooth' });
  showMessage('Question loaded into the form. Make your changes and click "Add Question".', 'success');
}

async function deleteQuestionSilently(questionId) {
  try {
    await fetch(`/api/quizzes/${quizId}/questions/${questionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (err) {
    console.error('Failed to delete old question during edit', err);
  }
}

// ─── EDIT QUESTION MODAL LOGIC ───
let editingQuestionId = null;

function openEditModal(q) {
  editingQuestionId = q.question_id;
  const type = quiz.quiz_type;
  const container = document.getElementById('editDynamicFields');

  // Render the exact same form fields as the "Add" form, but with IDs prefixed with 'edit_'
  if (type === 'preposition') {
    const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    container.innerHTML = `
      <div class="form-group"><label>Question Text</label><textarea id="edit_q_text" class="form-control" required>${escapeHtml(q.question_text)}</textarea></div>
      <div class="form-group"><label>Instructions</label><input type="text" id="edit_q_instructions" class="form-control" value="${escapeHtml(q.instructions || '')}"></div>
      <div class="form-group"><label>Options (one per line)</label><textarea id="edit_q_options" class="form-control" required>${options.join('\n')}</textarea></div>
      <div class="form-group"><label>Correct Option</label><input type="text" id="edit_q_correct" class="form-control" value="${escapeHtml(options[q.correct_option_index] || '')}" required></div>
      <div class="form-group"><label>Explanation</label><textarea id="edit_q_explanation" class="form-control">${escapeHtml(q.explanation || '')}</textarea></div>
    `;
  } 
  else if (type === 'irregular_verb') {
    const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
    container.innerHTML = `
      <div class="form-group"><label>Question Text</label><input type="text" id="edit_q_text" class="form-control" value="${escapeHtml(q.question_text)}"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group"><label>Present</label><input type="text" id="edit_q_present" class="form-control" value="${escapeHtml(q.present_form)}"></div>
        <div class="form-group"><label>Past</label><input type="text" id="edit_q_past" class="form-control" value="${escapeHtml(q.past_form)}"></div>
        <div class="form-group"><label>Future</label><input type="text" id="edit_q_future" class="form-control" value="${escapeHtml(q.future_form)}"></div>
        <div class="form-group"><label>Past Participle</label><input type="text" id="edit_q_participle" class="form-control" value="${escapeHtml(q.past_participle)}"></div>
      </div>
      <div class="form-group" style="background:#f0fdf4; padding:16px; border-radius:8px;">
        <label>Which fields should be blank?</label>
        <div style="display:flex; gap:16px; margin-top:8px;">
          <label><input type="checkbox" class="edit-blank-field" value="present" ${blanks.includes('present') ? 'checked' : ''}> Present</label>
          <label><input type="checkbox" class="edit-blank-field" value="past" ${blanks.includes('past') ? 'checked' : ''}> Past</label>
          <label><input type="checkbox" class="edit-blank-field" value="future" ${blanks.includes('future') ? 'checked' : ''}> Future</label>
          <label><input type="checkbox" class="edit-blank-field" value="past_participle" ${blanks.includes('past_participle') ? 'checked' : ''}> Participle</label>
        </div>
      </div>
      <div class="form-group"><label>Example Sentence</label><input type="text" id="edit_q_example" class="form-control" value="${escapeHtml(q.example_sentence || '')}"></div>
    `;
  }
  else if (type === 'clause') {
    const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
    container.innerHTML = `
      <div class="form-group"><label>Question Text</label><input type="text" id="edit_q_text" class="form-control" value="${escapeHtml(q.question_text)}"></div>
      <div class="form-group"><label>Full Sentence</label><textarea id="edit_q_sentence" class="form-control">${escapeHtml(q.sentence)}</textarea></div>
      <div class="form-group"><label>Correct Clause</label><input type="text" id="edit_q_clause_text" class="form-control" value="${escapeHtml(q.clause_text)}"></div>
      <div class="form-group"><label>Clause Type</label><input type="text" id="edit_q_clause_type" class="form-control" value="${escapeHtml(q.clause_type)}"></div>
      <div class="form-group"><label>Options (one per line)</label><textarea id="edit_q_options" class="form-control">${options.join('\n')}</textarea></div>
    `;
  }
  else if (type === 'sva') {
    container.innerHTML = `
      <div class="form-group"><label>Instruction</label><input type="text" id="edit_q_instruction" class="form-control" value="${escapeHtml(q.instruction)}"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group"><label>Subject Type</label><input type="text" id="edit_q_subject_type" class="form-control" value="${escapeHtml(q.subject_type)}"></div>
        <div class="form-group"><label>Verb Type</label><input type="text" id="edit_q_verb_type" class="form-control" value="${escapeHtml(q.verb_type)}"></div>
      </div>
      <div class="form-group"><label>Example Sentence</label><input type="text" id="edit_q_example" class="form-control" value="${escapeHtml(q.example_sentence || '')}"></div>
    `;
  }
  else if (type === 'phrasal_verb') {
    container.innerHTML = `
      <div class="form-group"><label>Instruction</label><input type="text" id="edit_q_instruction" class="form-control" value="${escapeHtml(q.instruction)}"></div>
      <div class="form-group"><label>Example Sentence</label><input type="text" id="edit_q_example" class="form-control" value="${escapeHtml(q.example_sentence || '')}"></div>
    `;
  }
  else if (type === 'sentence_pattern') {
    container.innerHTML = `
      <div class="form-group"><label>Instruction</label><input type="text" id="edit_q_instruction" class="form-control" value="${escapeHtml(q.instruction)}"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div class="form-group"><label>Min Words</label><input type="number" id="edit_q_min" class="form-control" value="${q.min_sentence_length || 3}"></div>
        <div class="form-group"><label>Max Words</label><input type="number" id="edit_q_max" class="form-control" value="${q.max_sentence_length || 15}"></div>
      </div>
    `;
  }

  document.getElementById('editQuestionModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editQuestionModal').style.display = 'none';
  editingQuestionId = null;
}

document.getElementById('editQuestionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('updateQBtn');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const type = quiz.quiz_type;
    let payload = {};

    // Build the payload based on the quiz type (using edit_ prefix)
    if (type === 'preposition') {
      const options = document.getElementById('edit_q_options').value.split('\n').map(s => s.trim()).filter(Boolean);
      const correct = document.getElementById('edit_q_correct').value.trim();
      payload = {
        question_text: document.getElementById('edit_q_text').value.trim(),
        instructions: document.getElementById('edit_q_instructions').value.trim() || null,
        options,
        correct_option_index: options.indexOf(correct),
        correct_answer: correct,
        explanation: document.getElementById('edit_q_explanation').value.trim() || null
      };
    } else if (type === 'irregular_verb') {
      const blanks = Array.from(document.querySelectorAll('.edit-blank-field:checked')).map(cb => cb.value);
      payload = {
        question_text: document.getElementById('edit_q_text').value.trim(),
        present_form: document.getElementById('edit_q_present').value.trim(),
        past_form: document.getElementById('edit_q_past').value.trim(),
        future_form: document.getElementById('edit_q_future').value.trim(),
        past_participle: document.getElementById('edit_q_participle').value.trim(),
        blank_fields: blanks,
        example_sentence: document.getElementById('edit_q_example').value.trim() || null
      };
    }
    // ... (add the same logic for clause, sva, phrasal_verb, sentence_pattern based on the edit_ IDs)
    else if (type === 'clause') {
      const options = document.getElementById('edit_q_options').value.split('\n').map(s => s.trim()).filter(Boolean);
      const correctClause = document.getElementById('edit_q_clause_text').value.trim();
      payload = {
        question_text: document.getElementById('edit_q_text').value.trim(),
        sentence: document.getElementById('edit_q_sentence').value.trim(),
        clause_text: correctClause,
        clause_type: document.getElementById('edit_q_clause_type').value.trim(),
        options,
        correct_option_index: options.indexOf(correctClause)
      };
    } else if (type === 'sva') {
      payload = {
        instruction: document.getElementById('edit_q_instruction').value.trim(),
        subject_type: document.getElementById('edit_q_subject_type').value.trim(),
        verb_type: document.getElementById('edit_q_verb_type').value.trim(),
        example_sentence: document.getElementById('edit_q_example').value.trim()
      };
    } else if (type === 'phrasal_verb') {
      payload = {
        instruction: document.getElementById('edit_q_instruction').value.trim(),
        example_sentence: document.getElementById('edit_q_example').value.trim() || null
      };
    } else if (type === 'sentence_pattern') {
      payload = {
        instruction: document.getElementById('edit_q_instruction').value.trim(),
        min_sentence_length: parseInt(document.getElementById('edit_q_min').value),
        max_sentence_length: parseInt(document.getElementById('edit_q_max').value),
        allowed_patterns: ['S-V-O', 'S-IV', 'S-LV-C', 'S-TV-O']
      };
    }

    // 1. Send UPDATE request (requires a new backend route)
    const res = await fetch(`/api/quizzes/${quizId}/questions/${editingQuestionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to update question');

    closeEditModal();
    await loadQuiz(); // Reload the list

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Update Question';
  }
});

function previewQuiz() {
  if (questions.length === 0) {
    alert('Add at least one question before previewing.');
    return;
  }
  
  // Open the student quiz page in a new tab with a special ?preview=true flag
  window.open(`/student/quiz.html?id=${quizId}&preview=true`, '_blank');
}

// ─── START ───
loadQuiz();