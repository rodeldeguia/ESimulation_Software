// public/js/auth-check.js
(function() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  // 1. If no token or user data, kick to login
  if (!token || !userStr) {
    window.location.href = '/auth/teacher-login.html';
    return;
  }

  const user = JSON.parse(userStr);
  const currentPath = window.location.pathname; // e.g., "/admin/settings.html"

  // 2. Define who is allowed where
  if (currentPath.startsWith('/admin') && user.role !== 'admin') {
    alert("Access Denied. Admins only.");
    window.location.href = '/teacher/dashboard.html'; // Kick teachers out of admin pages
  }

  if (currentPath.startsWith('/teacher') && user.role !== 'teacher' && user.role !== 'admin') {
    // Students cannot go to teacher pages
    window.location.href = '/student/dashboard.html';
  }

  if (currentPath.startsWith('/student') && user.role !== 'student') {
    // Teachers/Admins cannot go to student pages (optional, but good practice)
    window.location.href = '/teacher/dashboard.html';
  }
})(); 