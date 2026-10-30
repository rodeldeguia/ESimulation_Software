// public/student/dashboard.js

// ─────────────────────────────────────────
// 1. AUTH GUARD — run immediately on page load
// ─────────────────────────────────────────
const token = localStorage.getItem('token');

if (!token) {
  // No token → not logged in → redirect to login
  window.location.href = '/auth/student-login.html';
}

// (Code below only runs if a token exists.
//  Note: technically it still runs after the redirect is queued,
//  but the fetch will fail quickly if we're navigating away — fine for this case.)

// ─────────────────────────────────────────
// 2. FETCH CURRENT USER FROM SERVER
// ─────────────────────────────────────────
async function loadUser() {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // If the token is expired/invalid, server returns 401
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/student-login.html';
      return;
    }

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    const user = data.user;

    // ─────────────────────────────────────────
    // 3. FILL THE PAGE
    // ─────────────────────────────────────────
    document.getElementById('userName').textContent     = user.username;
    document.getElementById('userUsername').textContent = user.username;
    document.getElementById('userId').textContent       = user.id;

    // Note: /api/auth/me only returns id, role, username from the token.
    // Grade level isn't in the token — we'd need another endpoint for that.
    // For now, we can show it from localStorage if we saved it at login.
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('userGrade').textContent = storedUser.grade_level || '—';

    // Show content, hide loader
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';

  } catch (err) {
    console.error('loadUser error:', err);
    document.getElementById('loading').textContent = 'Something went wrong. Try refreshing.';
  }
}

loadUser();

// ─────────────────────────────────────────
// 4. LOGOUT (stub — we finish in Step 4.4)
// ─────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/student-login.html';
});