const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allVerbs = [];
let allNouns = [];
let currentFilter = 'all';

// 1. Fetch existing dictionary words
async function loadDictionary() {
  try {
    const res = await fetch('/api/quizzes/dictionary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();

    // Save to global state
    allVerbs = data.verbs || [];
    allNouns = data.nouns || [];

    // Render initially
    renderWords();

  } catch (err) {
    console.error('Failed to load dictionary:', err);
    document.getElementById('verbList').innerHTML = `<span style="color:#dc2626;">Error: ${err.message}</span>`;
    document.getElementById('nounList').innerHTML = `<span style="color:#dc2626;">Error: ${err.message}</span>`;
  }
}

// 2. Render words based on the current filter
function renderWords() {
  // Filter Verbs
  const filteredVerbs = currentFilter === 'all' 
    ? allVerbs 
    : allVerbs.filter(w => w.toUpperCase().startsWith(currentFilter));

  document.getElementById('verbCount').textContent = filteredVerbs.length;
  document.getElementById('verbList').innerHTML = filteredVerbs.length > 0
    ? filteredVerbs.map(v => `<span class="word-tag">${v}</span>`).join('')
    : '<span style="color:var(--text-muted); font-size:13px;">No verbs starting with this letter.</span>';

  // Filter Nouns
  const filteredNouns = currentFilter === 'all' 
    ? allNouns 
    : allNouns.filter(w => w.toUpperCase().startsWith(currentFilter));

  document.getElementById('nounCount').textContent = filteredNouns.length;
  document.getElementById('nounList').innerHTML = filteredNouns.length > 0
    ? filteredNouns.map(n => `<span class="word-tag">${n}</span>`).join('')
    : '<span style="color:var(--text-muted); font-size:13px;">No nouns starting with this letter.</span>';
}

// 3. Handle letter click
function filterWords(letter, btnElement) {
  currentFilter = letter;
  
  // Update active button UI
  document.querySelectorAll('.alpha-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');

  // Re-render
  renderWords();
}

// 4. Submit a new word suggestion
document.getElementById('suggestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('suggestBtn');
  const word = document.getElementById('newWord').value.trim();
  const type = document.getElementById('wordType').value;

  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/quizzes/suggest-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ word, type })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to suggest word');

    alert('Word submitted! Waiting for Admin approval.');
    document.getElementById('suggestForm').reset();

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit to Admin';
  }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

// Start
loadDictionary();