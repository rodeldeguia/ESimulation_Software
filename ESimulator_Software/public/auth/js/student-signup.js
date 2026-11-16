// public/auth/student-signup.js

const form      = document.getElementById('signupForm');
const message   = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');


// Helper: show a message in the card
function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`; 
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();  

  
  const payload = {
    full_name:   document.getElementById('full_name').value.trim(),
    username:    document.getElementById('username').value.trim(),
    password:    document.getElementById('password').value,
    grade_level: document.getElementById('grade_level').value,
    birth_date:  document.getElementById('birth_date').value || null,
    LRN:         document.getElementById('LRN').value.trim() || null
  };

  // 2. Disable button while waiting (prevent double-submit)
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  showMessage('', 'error');

  try {
    // 3. Send to the API
    const res = await fetch('/api/auth/signup/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Signup failed', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
      return;
    }


    showMessage('Account created! Redirecting to login...', 'success');

    setTimeout(() => {
      window.location.href = '/auth/student-login.html';
    }, 1500);

  } catch (err) {
    console.error('Network error:', err);
    showMessage('Could not reach the server', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign Up';
  }
});