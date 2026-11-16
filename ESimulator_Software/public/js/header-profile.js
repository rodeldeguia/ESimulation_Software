// public/js/header-profile.js
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return; // If no token, do nothing (they will be redirected anyway)

  try {
    const res = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // 1. Update the Header Profile Picture
      const headerPic = document.getElementById('headerProfilePic');
      if (headerPic && data.user.profile_picture) {
        // Add a timestamp to bypass browser caching so the new image shows immediately
        headerPic.src = `${data.user.profile_picture}?t=${Date.now()}`;
      }

      // 2. Update the Header Name
      const headerName = document.getElementById('teacherName') || document.getElementById('navUserName');
      if (headerName && data.user.full_name) {
        headerName.textContent = data.user.full_name;
      }
    }
  } catch (err) {
    console.error("Failed to load header profile:", err);
  }
});