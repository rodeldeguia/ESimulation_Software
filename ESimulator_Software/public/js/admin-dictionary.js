// public/js/admin-dictionary.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allVerbs = [];
let allNouns = [];
let currentFilter = 'all';

// 1. Load Approved Words
async function loadDictionary() {
  try {
    const res = await fetch('/api/quizzes/dictionary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    // The backend should return { verbs: [...], nouns: [...] }
    allVerbs = data.verbs || [];
    allNouns = data.nouns || [];
    
    renderWords();
  } catch (err) {
    console.error("Error loading dictionary:", err);
  }
}

// 2. Render Approved Words
function renderWords() {
  const filteredVerbs = currentFilter === 'all' 
    ? allVerbs 
    : allVerbs.filter(w => w.toUpperCase().startsWith(currentFilter));
    
  const filteredNouns = currentFilter === 'all' 
    ? allNouns 
    : allNouns.filter(w => w.toUpperCase().startsWith(currentFilter));

  // Update Verb List
  document.getElementById('verbCount').textContent = filteredVerbs.length;
  document.getElementById('verbList').innerHTML = filteredVerbs.length > 0 
    ? filteredVerbs.map(v => `<span class="word-tag">${v}</span>`).join('') 
    : '<span style="color:var(--text-muted); font-size:13px;">No verbs found.</span>';

  // Update Noun List
  document.getElementById('nounCount').textContent = filteredNouns.length;
  document.getElementById('nounList').innerHTML = filteredNouns.length > 0 
    ? filteredNouns.map(n => `<span class="word-tag">${n}</span>`).join('') 
    : '<span style="color:var(--text-muted); font-size:13px;">No nouns found.</span>';
}

// 3. Filter by Letter
function filterWords(letter, btn) {
  currentFilter = letter;
  document.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderWords();
}

// 4. Load Pending Suggestions
async function loadSuggestions() {
  const tbody = document.getElementById('suggestionsTableBody');
  
  try {
    const res = await fetch('/api/quizzes/suggestions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Failed to fetch suggestions");
    const data = await res.json();

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-muted);">No pending suggestions.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding:12px; font-weight:600; color:var(--navy);">${item.word}</td>
        <td style="padding:12px; text-transform:capitalize;">${item.type.replace('_', ' ')}</td>
        <td style="padding:12px; display:flex; gap:8px;">
          <button onclick="handleSuggestion(${item.id}, 'approve')" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600;">✓</button>
          <button onclick="handleSuggestion(${item.id}, 'reject')" style="background:#fee2e2; color:#991b1b; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:600;">✕</button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error("Error loading suggestions:", err);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#dc2626;">Error loading suggestions.</td></tr>`;
  }
}

// 5. Handle Approve / Reject
async function handleSuggestion(id, action) {
  if (!confirm(`Are you sure you want to ${action} this word?`)) return;

  const endpoint = action === 'approve' 
    ? `/api/quizzes/suggestions/${id}/approve` 
    : `/api/quizzes/suggestions/${id}/reject`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      alert(`Suggestion ${action}d successfully!`);
      loadDictionary();   // Reload approved words
      loadSuggestions();  // Reload pending list
    } else {
      const error = await res.json();
      alert(error.error || 'Action failed');
    }
  } catch (err) {
    console.error(err);
    alert('Server error');
  }
}

// Safe logout check
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDictionary();
  loadSuggestions();
});