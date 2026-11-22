// public/student/settings.js

const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/student-login.html';

// ─── 1. Load Current User Data ───
async function loadUserData() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/auth/student-login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Populate fields
    document.getElementById('fullName').value = user.full_name || user.username;
    document.getElementById('username').value = user.username;
    document.getElementById('gradeLevel').value = `Grade ${storedUser.grade_level || '--'}`;
    
    // If you have a birth date in the DB, set it here
    if (user.birth_date) {
      document.getElementById('birthDate').value = user.birth_date.split('T')[0];
    }
    
    // Set profile pic if exists
    if (user.profile_picture) {
      document.getElementById('profilePicPreview').src = user.profile_picture;
    }

  } catch (err) {
    console.error('Failed to load user data:', err);
  }
}

// ─── 2. Handle Profile Form Submit ───
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const fullName = document.getElementById('fullName').value;
  const birthDate = document.getElementById('birthDate').value;

  try {
    // Note: You will need to create this endpoint in your backend
    // POST /api/student/profile
    const res = await fetch('/api/student/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ full_name: fullName, birth_date: birthDate })
    });

    if (res.ok) {
      showAlert('profileAlert', 'Profile updated successfully!', 'success');
      // Update local storage name so header updates
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.full_name = fullName;
      localStorage.setItem('user', JSON.stringify(storedUser));
      
      // Refresh header profile
      if (window.loadHeaderProfile) window.loadHeaderProfile();
    } else {
      throw new Error('Update failed');
    }
  } catch (err) {
    showAlert('profileAlert', 'Failed to update profile.', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// ─── 3. Handle Password Form Submit ───
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if (newPass !== confirmPass) {
    showAlert('passwordAlert', 'New passwords do not match.', 'error');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Updating...';
  btn.disabled = true;

  try {
    // Note: You will need to create this endpoint in your backend
    // POST /api/auth/change-password
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
    });

    const data = await res.json();

    if (res.ok) {
      showAlert('passwordAlert', 'Password updated successfully!', 'success');
      document.getElementById('passwordForm').reset();
    } else {
      showAlert('passwordAlert', data.error || 'Incorrect current password.', 'error');
    }
  } catch (err) {
    showAlert('passwordAlert', 'Failed to update password.', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// ─── Helpers ───
function showAlert(id, message, type) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.style.display = 'block';
  
  // Hide after 4 seconds
  setTimeout(() => {
    el.style.display = 'none';
  }, 4000);
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = '/auth/student-login.html';
  });
}

// Init
document.addEventListener('DOMContentLoaded', loadUserData);