// public/js/teacher-quizzes.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allQuizzes = [];
let currentFilter = 'final';
let currentTestQuizId = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let testAnswers = {}; 

async function loadQuizzes() {
  try {
    const res = await fetch('/api/quizzes', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) { localStorage.clear(); window.location.href = '/auth/teacher-login.html'; return; }
    
    allQuizzes = await res.json();
    renderTable();

  } catch (err) {
    console.error(err);
    document.getElementById('quizTableBody').innerHTML = '<tr><td colspan="6" class="empty-state">Error loading quizzes.</td></tr>';
  }
}

function filterQuizzes(type, tabElement) {
  currentFilter = type;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('quizTableBody');
  const filtered = allQuizzes.filter(q => q.quiz_purpose === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No ${currentFilter === 'final' ? 'final quizzes' : 'pre-tests'} created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((q, index) => {
    const isPreTest = q.quiz_purpose === 'pretest';
    const badgeText = isPreTest ? 'PRE-TEST' : 'FINAL';
    const badgeClass = isPreTest ? 'badge-pretest' : 'badge-final';
    const statusBadge = q.is_published 
      ? '<span style="color:#166534; font-weight:600;">Published</span>' 
      : '<span style="color:#92400e; font-weight:600;">Draft</span>';

    return `
      <tr>
        <td>${index + 1}</td>
        <td style="font-weight:600; color:var(--navy);">${q.title}</td>
        <td>${q.lesson_title || 'Unknown Lesson'}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>${statusBadge}</td>
        <td style="display:flex; gap:10px; align-items:center;">
          <a href="/teacher/quiz-editor.html?id=${q.quiz_id}" class="action-btn" style="color:var(--navy);" title="Edit Questions">✏️</a>
          <button class="action-btn" style="color:var(--navy);" onclick="previewQuiz(${q.quiz_id})" title="Preview Correct Answers">👁️</button>
          <button class="action-btn" style="color:#16a34a;" onclick="startTest(${q.quiz_id})" title="Test Quiz Functionality">🧪</button>
          <button class="action-btn" style="color:#dc2626;" onclick="deleteQuiz(${q.quiz_id})" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════
// 1. PREVIEW LOGIC
// ═══════════════════════════════════════════════
async function previewQuiz(id) {
  const quiz = allQuizzes.find(q => q.quiz_id === id);
  if (!quiz) return;

  document.getElementById('previewTitle').textContent = quiz.title;
  document.getElementById('previewMeta').textContent = `${quiz.quiz_type.toUpperCase()} • ${quiz.quiz_purpose === 'pretest' ? 'Pre-Test' : 'Final Quiz'}`;
  document.getElementById('previewContent').innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">Loading questions...</div>';
  document.getElementById('previewModal').style.display = 'flex';

  try {
    const res = await fetch(`/api/quizzes/${id}/questions`, { headers: { 'Authorization': `Bearer ${token}` } });
    const questions = await res.json();

    if (questions.length === 0) {
      document.getElementById('previewContent').innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;">No questions added to this quiz yet.</div>';
      return;
    }

    document.getElementById('previewContent').innerHTML = questions.map((q, i) => `
      <div class="preview-question">
        <h4>Q${i + 1}: ${q.question_text || q.instruction || q.sentence || 'Question'}</h4>
        ${renderQuestionPreview(q, quiz.quiz_type)}
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('previewContent').innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;">Error loading questions.</div>';
  }
}

function renderQuestionPreview(q, type) {
  if (type === 'preposition' || type === 'clause') {
    return q.options.map((opt, idx) => `
      <div class="preview-option ${idx === q.correct_option_index ? 'correct' : ''}">
        ${opt} ${idx === q.correct_option_index ? ' ✅' : ''}
      </div>
    `).join('');
  }
  if (type === 'irregular_verb') {
    return `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        <div><label style="font-size:12px; color:#666;">Present</label><input class="test-input" disabled value="${q.present_form}"></div>
        <div><label style="font-size:12px; color:#666;">Past</label><input class="test-input" disabled value="${q.past_form}"></div>
        <div><label style="font-size:12px; color:#666;">Future</label><input class="test-input" disabled value="${q.future_form}"></div>
        <div><label style="font-size:12px; color:#666;">Past Participle</label><input class="test-input" disabled value="${q.past_participle}"></div>
      </div>
    `;
  }
  if (type === 'phrasal_verb' || type === 'sva') {
    return `<input class="test-input" disabled placeholder="${q.example_sentence || 'Type your sentence here...'}">`;
  }
  if (type === 'sentence_pattern') {
    return q.allowed_patterns.map(p => `<div class="preview-option">${p}</div>`).join('');
  }
  return '<p style="color:#666; font-style:italic;">Preview not available for this type.</p>';
}

// ═══════════════════════════════════════════════
// 2. TEST LOGIC (Interactive Student View)
// ═══════════════════════════════════════════════
async function startTest(id) {
  const quiz = allQuizzes.find(q => q.quiz_id === id);
  if (!quiz) return;

  currentTestQuizId = id;
  currentQuestionIndex = 0;
  testAnswers = {};
  
  document.getElementById('testTitle').textContent = quiz.title;
  document.getElementById('testContent').innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8;">Loading test...</div>';
  document.getElementById('testModal').style.display = 'flex';

  try {
    const res = await fetch(`/api/quizzes/${id}/questions`, { headers: { 'Authorization': `Bearer ${token}` } });
    currentQuestions = await res.json();

    if (currentQuestions.length === 0) {
      document.getElementById('testContent').innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;">No questions added to this quiz yet.</div>';
      return;
    }

    renderTestQuestion();

  } catch (err) {
    console.error(err);
    document.getElementById('testContent').innerHTML = '<div style="text-align:center; padding:40px; color:#dc2626;">Error loading test.</div>';
  }
}

function renderTestQuestion() {
  const q = currentQuestions[currentQuestionIndex];
  const quiz = allQuizzes.find(x => x.quiz_id === currentTestQuizId);
  const type = quiz.quiz_type;
  const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;
  const progress = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;

  let questionHTML = '';

  if (type === 'preposition' || type === 'clause') {
    questionHTML = `
      <h4 style="font-size:18px; color:var(--navy); margin-bottom:16px;">${q.question_text || 'Question'}</h4>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${q.options.map((opt, idx) => `
          <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--border-color); border-radius:6px; cursor:pointer;">
            <input type="radio" name="testAnswer" value="${idx}" onchange="saveTestAnswer(${idx})" ${testAnswers[currentQuestionIndex] === idx ? 'checked' : ''}>
            ${opt}
          </label>
        `).join('')}
      </div>
    `;
  } 
  else if (type === 'irregular_verb') {
  const blanks = Array.isArray(q.blank_fields) ? q.blank_fields : JSON.parse(q.blank_fields || '[]');
  const answersObj = testAnswers[currentQuestionIndex] || {};

  // Helper to render an input (editable) or a disabled display (read-only)
  const renderInput = (label, field, value) => {
    const isBlank = blanks.includes(field);
    return `
      <div>
        <label style="font-size:12px; color:#666;">${label}</label>
        ${isBlank 
          ? `<input type="text" class="test-input" value="${answersObj[field] || ''}" oninput="saveComplexAnswer('${field}', this.value)" placeholder="Type answer...">`
          : `<div style="padding:10px; background:#e2e8f0; border-radius:6px; font-size:14px; color:#64748b; cursor:not-allowed;">${value}</div>`
        }
      </div>
    `;
  };

  questionHTML = `
    <h4 style="font-size:18px; color:var(--navy); margin-bottom:16px;">${q.question_text || 'Fill in the missing tenses'}</h4>
    <div style="background:#f8fafc; padding:20px; border-radius:8px;">
      <p style="margin-bottom:12px; font-size:14px; color:#64748b;">Fill in only the blank fields. The provided fields are read-only.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        ${renderInput('Present', 'present', q.present_form)}
        ${renderInput('Past', 'past', q.past_form)}
        ${renderInput('Future', 'future', q.future_form)}
        ${renderInput('Past Participle', 'past_participle', q.past_participle)}
      </div>
    </div>
  `;
}
   else if (type === 'sva') {
    questionHTML = `
      <h4 style="font-size:18px; color:var(--navy); margin-bottom:16px;">${q.instruction || q.question_text}</h4>
      <textarea class="test-input" rows="4" placeholder="Type your sentence here..." style="resize:vertical;" oninput="saveTestAnswer(this.value)">${testAnswers[currentQuestionIndex] || ''}</textarea>
      <div id="testDuplicateError" style="display:none; color:#dc2626; font-size:13px; margin-top:8px; font-weight:600;"></div>
    `;
  }

  else if (type === 'phrasal_verb') {
    questionHTML = `
      <h4 style="font-size:18px; color:var(--navy); margin-bottom:16px;">${q.instruction || q.question_text}</h4>
      <p style="font-size:14px; margin-bottom:12px; color:var(--text-muted);">Target Phrasal Verb: <strong>${q.target_phrasal_verb || 'Not specified'}</strong></p>
      <textarea class="test-input" rows="4" placeholder="Type your sentence here..." style="resize:vertical; margin-bottom:12px;" oninput="saveTestAnswer(this.value)">${testAnswers[currentQuestionIndex] || ''}</textarea>
      <input type="text" class="test-input" placeholder="Type the exact phrasal verb you used" id="testPhrasalVerb" value="${testAnswers[currentQuestionIndex + '_verb'] || ''}" oninput="saveTestAnswer(this.value, '_verb')">
      <div id="testDuplicateError" style="display:none; color:#dc2626; font-size:13px; margin-top:8px; font-weight:600;"></div>
    `;
  
  }else if (type === 'clause') {
    questionHTML = `
      <h4 style="font-size:18px; color:var(--navy); margin-bottom:12px;">${q.question_text || 'Question'}</h4>
      <div style="background:#f8fafc; padding:16px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:16px;">
        <p style="font-size:15px; color:#333;"><strong>Sentence:</strong> ${q.sentence}</p>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${q.options.map((opt, idx) => `
          <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--border-color); border-radius:6px; cursor:pointer;">
            <input type="radio" name="testAnswer" value="${idx}" onchange="saveTestAnswer(${idx})" ${testAnswers[currentQuestionIndex] === idx ? 'checked' : ''}>
            ${opt}
          </label>
        `).join('')}
      </div>
    `;
  }
  else if (type === 'sentence_pattern') {
    questionHTML = `
      <h4 style="font-size:18px; color:var(--navy); margin-bottom:16px;">${q.instruction || q.question_text}</h4>
      
      <label style="font-size:13px; font-weight:600; color:var(--text-main); margin-bottom:6px; display:block;">Select Pattern:</label>
      <select class="test-input" style="margin-bottom:12px;" onchange="saveTestAnswer(this.value, '_pattern')">
        <option value="">-- Select a Pattern --</option>
        ${q.allowed_patterns.map(p => `<option value="${p}" ${testAnswers[currentQuestionIndex + '_pattern'] === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>

      <label style="font-size:13px; font-weight:600; color:var(--text-main); margin-bottom:6px; display:block;">Write your sentence:</label>
      <textarea class="test-input" rows="3" placeholder="Type your sentence here..." style="resize:vertical;" oninput="saveTestAnswer(this.value)">${testAnswers[currentQuestionIndex] || ''}</textarea>
    `;
  }

  const progressPercent = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;

  document.getElementById('testContent').innerHTML = `
    <div style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:6px;">
        <span>Question ${progress}</span>
        <span>${Math.round(progressPercent)}% Complete</span>
      </div>
      <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
        <div style="height:100%; width:${progressPercent}%; background:var(--primary-blue); transition:0.3s;"></div>
      </div>
    </div>
    ${questionHTML}
       <div style="display:flex; justify-content:space-between; margin-top:24px;">
      <button class="btn" style="background:#f1f5f9;" onclick="prevTestQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Previous</button>
      
      ${isLastQuestion 
        ? `<button id="testNextBtn" class="btn" style="background:#16a34a; color:white;" onclick="submitTestAnswers()">✅ Submit & Check</button>`
        : `<button id="testNextBtn" class="btn btn-primary" onclick="nextTestQuestion()">Next →</button>`
      }
    </div>
  `;
}

function saveTestAnswer(value, suffix = '') {
  testAnswers[currentQuestionIndex + suffix] = value;

  // Only check duplicates for the main sentence (not the _verb or _pattern suffix)
  if (suffix === '') {
    const currentText = value.trim().toLowerCase();
    const errorEl = document.getElementById('testDuplicateError');
    const nextBtn = document.getElementById('testNextBtn');

    if (currentText.length > 0) {
      // Find if this exact sentence was used in a DIFFERENT question
      let duplicateIdx = -1;
      for (let i = 0; i < currentQuestions.length; i++) {
        if (i !== currentQuestionIndex) {
          const otherAnswer = testAnswers[i];
          if (typeof otherAnswer === 'string' && otherAnswer.trim().toLowerCase() === currentText) {
            duplicateIdx = i;
            break;
          }
        }
      }

      if (duplicateIdx !== -1) {
        if (errorEl) {
          errorEl.style.display = 'block';
          errorEl.textContent = `⚠️ You already used this exact sentence in Question ${duplicateIdx + 1}. Please write a different one.`;
        }
        if (nextBtn) nextBtn.disabled = true;
      } else {
        if (errorEl) errorEl.style.display = 'none';
        if (nextBtn) nextBtn.disabled = false;
      }
    } else {
      if (errorEl) errorEl.style.display = 'none';
      if (nextBtn) nextBtn.disabled = false;
    }
  }
}

function saveComplexAnswer(field, value) {
  if (!testAnswers[currentQuestionIndex] || typeof testAnswers[currentQuestionIndex] !== 'object') {
    testAnswers[currentQuestionIndex] = {};
  }
  testAnswers[currentQuestionIndex][field] = value;
}

function nextTestQuestion() {
  const currentText = testAnswers[currentQuestionIndex] ? testAnswers[currentQuestionIndex].trim().toLowerCase() : '';
  
  if (currentText.length > 0) {
    let duplicateIdx = -1;
    for (let i = 0; i < currentQuestions.length; i++) {
      if (i !== currentQuestionIndex && typeof testAnswers[i] === 'string' && testAnswers[i].trim().toLowerCase() === currentText) {
        duplicateIdx = i;
        break;
      }
    }
    if (duplicateIdx !== -1) {
      alert(`You cannot continue. This sentence is already used in Question ${duplicateIdx + 1}. Please change it.`);
      return; // Block navigation
    }
  }

  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    renderTestQuestion();
  }
}

function prevTestQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderTestQuestion();
  }
}

async function submitTestAnswers() {

const textAnswers = Object.keys(testAnswers)
    .filter(key => !key.includes('_'))
    .map(key => testAnswers[key])
    .filter(val => val && typeof val === 'string' && val.trim() !== '')
    .map(val => val.trim().toLowerCase());

  const uniqueAnswers = new Set(textAnswers);
  if (uniqueAnswers.size !== textAnswers.length) {
    alert("You cannot submit this test. You have used the same sentence for multiple questions.");
    return;
  }

  const quiz = allQuizzes.find(x => x.quiz_id === currentTestQuizId);
  if (!quiz) return;

  document.getElementById('testContent').innerHTML = `
    <div style="text-align:center; padding:60px;">
      <div style="font-size:24px; margin-bottom:16px;">🧪 Checking Answers...</div>
      <p style="color:var(--text-muted);">Validating...</p>
    </div>
  `;

  // Format answers
  const formattedAnswers = currentQuestions.map((q, i) => {
    const answer = testAnswers[i];
    if (quiz.quiz_type === 'preposition' || quiz.quiz_type === 'clause') {
      return { question_id: q.question_id, selected_index: answer, selected_type: q.clause_type };
    }
    if (quiz.quiz_type === 'irregular_verb') {
      return { question_id: q.question_id, data: answer || {} };
    }
      if (quiz.quiz_type === 'sva' || quiz.quiz_type === 'phrasal_verb' || quiz.quiz_type === 'sentence_pattern') {
      return { 
        question_id: q.question_id, 
        text: testAnswers[i] || '',
        selected_pattern: quiz.quiz_type === 'sentence_pattern' ? testAnswers[i + '_pattern'] : undefined,
        phrasal_verb_answer: quiz.quiz_type === 'phrasal_verb' ? testAnswers[i + '_verb'] : undefined 
      };
    }
    return { question_id: q.question_id, text: answer || '' };
  });

  try {
    // 🔥 CALL THE NEW TEST ROUTE (No session required!)
    const res = await fetch(`/api/quizzes/${quiz.quiz_id}/test-submit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ answers: formattedAnswers })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check answers');

    let reportHTML = '';

    data.results.forEach((result, i) => {
      const isCorrect = result.is_correct;
      let studentAnsStr = '';
      let correctAnsStr = '';
      let nlpReason = result.reason || '';

      if (quiz.quiz_type === 'preposition' || quiz.quiz_type === 'clause') {
        studentAnsStr = result.selected_answer || '(No answer)';
        correctAnsStr = result.correct_answer || 'Check question';
          if (result.question_text) {
                studentAnsStr = `Question: ${result.question_text}\nYour Answer: ${studentAnsStr}`;
  }

      } 
      else if (quiz.quiz_type === 'irregular_verb') {
        studentAnsStr = JSON.stringify(result.student_answers);
        correctAnsStr = `Present: ${result.present_form}, Past: ${result.past_form}`;
      }
      else if (quiz.quiz_type === 'sva') {
        studentAnsStr = result.student_text;
        correctAnsStr = result.instruction ? `Instruction: ${result.instruction}` : 'Valid sentence';
      }
           else if (quiz.quiz_type === 'phrasal_verb') {
        studentAnsStr = `${result.student_text} (Identified Verb: ${result.phrasal_verb_answer || 'none'})`;
        correctAnsStr = result.detected_verb ? `NLP Detected: ${result.detected_verb}` : 'No phrasal verb detected';
      }
      else if (quiz.quiz_type === 'sentence_pattern') {
        studentAnsStr = `${result.student_text} (${result.selected_pattern})`;
        correctAnsStr = result.detected_pattern;
      }

            reportHTML += `
        <div style="margin-bottom:16px; padding:16px; border-radius:8px; border:1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}; background:${isCorrect ? '#dcfce7' : '#fee2e2'};">
          <p style="font-weight:600; margin-bottom:8px; color:${isCorrect ? '#166534' : '#991b1b'};">
            ${isCorrect ? '✅' : '❌'} Question ${i + 1}
          </p>
          <div style="font-size:14px; color:#334155;">
            <div style="margin-bottom:4px;"><strong>Your Answer:</strong> ${studentAnsStr}</div>
            
            <!-- Only show if correctAnsStr exists (for multiple choice/irregular verbs) -->
            ${correctAnsStr ? `<div style="margin-bottom:4px;"><strong>Correct Answer:</strong> ${correctAnsStr}</div>` : ''}
            
            <!-- For SVA: Show the NLP Reason instead -->
            ${nlpReason ? `<div style="margin-top:8px; padding:8px; background:rgba(0,0,0,0.05); border-radius:4px; font-style:italic; font-size:13px; color:${isCorrect ? '#166534' : '#991b1b'};"><strong>System Evaluation:</strong> ${nlpReason}</div>` : ''}
          </div>
        </div>
      `;
    });

    document.getElementById('testContent').innerHTML = `
      <div style="text-align:center; padding:20px; margin-bottom:20px; background:#f8fafc; border-radius:12px;">
        <h2 style="color:var(--navy); margin-bottom:8px;">Score: ${data.score}/${data.total} (${data.percentage}%)</h2>
        <p style="color:var(--text-muted); font-size:14px;">This matches exactly what the student would see.</p>
      </div>
      ${reportHTML}
      <div style="display:flex; justify-content:center; margin-top:24px;">
        <button onclick="closeModal('testModal')" class="btn btn-primary">Done</button>
      </div>
    `;

  } catch (err) {
    console.error(err);
    document.getElementById('testContent').innerHTML = `
      <div style="text-align:center; padding:40px; color:#dc2626;">
        Error: ${err.message}
      </div>
      <div style="display:flex; justify-content:center; margin-top:24px;">
        <button onclick="closeModal('testModal')" class="btn btn-primary">Close</button>
      </div>
    `;
  }
}
// ─── UTILS ───
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

async function deleteQuiz(id) {
  if (!confirm('Are you sure you want to delete this quiz? All its questions will be lost.')) return;
  try {
    const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) loadQuizzes();
    else alert('Failed to delete quiz');
  } catch (err) { console.error(err); }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadQuizzes);