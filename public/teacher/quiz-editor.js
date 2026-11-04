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
    list.innerHTML = '<div class="empty-state">No questions yet. Add your first one below.</div>';
    return;
  }

  list.innerHTML = questions.map((q, i) => {
    return `
      <div class="question-item">
        <h4>Q${i + 1}: ${escapeHtml(getQuestionText(q))}</h4>
        ${renderQuestionPreview(q)}
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
    return `
      <p>Target verb: <strong>${escapeHtml(q.target_phrasal_verb)}</strong></p>
      <p>Alternatives: ${Array.isArray(q.alternative_verbs) ? q.alternative_verbs.map(a => escapeHtml(a)).join(', ') : '(none)'}</p>
      <p>Example: <em>${escapeHtml(q.example_sentence || '')}</em></p>
    `;
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
        <label>Question Text</label>
        <input type="text" id="q_text" required placeholder="e.g., Write the past tense of the verb &quot;go&quot;.">
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
      <div class="form-group">
        <label>Asking For</label>
        <select id="q_ask_for" required>
          <option value="present">Present</option>
          <option value="past">Past</option>
          <option value="future">Future</option>
          <option value="past_participle">Past Participle</option>
        </select>
      </div>
      <div class="form-group">
        <label>Correct Answer</label>
        <input type="text" id="q_correct" required placeholder="went">
      </div>
      <div class="form-group">
        <label>Alternative Answers (comma-separated, optional)</label>
        <input type="text" id="q_alternatives" placeholder="e.g., learnt, learned">
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
        <input type="text" id="q_instruction" required placeholder="Write a sentence using the phrasal verb &quot;give up&quot;.">
      </div>
      ${common}
      <div class="form-group">
        <label>Target Phrasal Verb (the answer)</label>
        <input type="text" id="q_target" required placeholder="give up">
      </div>
      <div class="form-group">
        <label>Alternative Forms (comma-separated, optional)</label>
        <input type="text" id="q_alternatives" placeholder="gave up, given up">
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
        <label>Example Sentence</label>
        <input type="text" id="q_example" required placeholder="She gave up smoking last year.">
      </div>
    `;
  } else if (quiz.quiz_type === 'sentence_pattern') {
    container.innerHTML = `
      <div class="form-group">
        <label>Instruction</label>
        <input type="text" id="q_instruction" required placeholder="Write a sentence using the Subject-Verb-Object pattern.">
      </div>
      ${common}
      <div class="form-group">
        <label>Target Pattern</label>
        <input type="text" id="q_target_pattern" required placeholder="S-V-O">
      </div>
      <div class="form-group">
        <label>Allowed Patterns (comma-separated)</label>
        <input type="text" id="q_allowed" required placeholder="S-V-O, S-IV, S-LV-C, S-TV-O">
      </div>
      <div class="row">
        <div class="form-group">
          <label>Min Words</label>
          <input type="number" id="q_min" value="3" min="1" required>
        </div>
        <div class="form-group">
          <label>Max Words</label>
          <input type="number" id="q_max" value="15" min="1" required>
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
    return {
      ...base,
      question_text: document.getElementById('q_text').value.trim(),
      present_form: document.getElementById('q_present').value.trim(),
      past_form: document.getElementById('q_past').value.trim(),
      future_form: document.getElementById('q_future').value.trim(),
      past_participle: document.getElementById('q_participle').value.trim(),
      ask_for: document.getElementById('q_ask_for').value,
      correct_answer: document.getElementById('q_correct').value.trim(),
      alternative_answers: document.getElementById('q_alternatives').value
        .split(',').map(s => s.trim()).filter(Boolean),
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
      nlp_rules: {}   // Phase 11 already validates; no extra rules needed
    };
  }

  if (quiz.quiz_type === 'phrasal_verb') {
    return {
      ...base,
      instruction: document.getElementById('q_instruction').value.trim(),
      target_phrasal_verb: document.getElementById('q_target').value.trim(),
      alternative_verbs: document.getElementById('q_alternatives').value
        .split(',').map(s => s.trim()).filter(Boolean),
      min_sentence_length: parseInt(document.getElementById('q_min').value),
      max_sentence_length: parseInt(document.getElementById('q_max').value),
      example_sentence: document.getElementById('q_example').value.trim(),
      nlp_rules: {}
    };
  }

  if (quiz.quiz_type === 'sentence_pattern') {
    return {
      ...base,
      instruction: document.getElementById('q_instruction').value.trim(),
      target_pattern: document.getElementById('q_target_pattern').value.trim(),
      allowed_patterns: document.getElementById('q_allowed').value
        .split(',').map(s => s.trim()).filter(Boolean),
      min_sentence_length: parseInt(document.getElementById('q_min').value),
      max_sentence_length: parseInt(document.getElementById('q_max').value),
      nlp_rules: {}
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

// ─── START ───
loadQuiz();