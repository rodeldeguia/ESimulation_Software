// public/auth/teacher-login.js

const form      = document.getElementById('loginForm');
const message   = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  showMessage('', 'error');

  try {
    const res = await fetch('/api/auth/login/teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Login failed', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showMessage('Login successful! Redirecting...', 'success');

    // Teacher OR admin — both get sent to teacher dashboard for now
    setTimeout(() => {
      window.location.href = '/teacher/dashboard.html';
    }, 800);

  } catch (err) {
    console.error('Network error:', err);
    showMessage('Could not reach the server', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log In';
  }
});