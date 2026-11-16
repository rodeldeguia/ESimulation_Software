// public/js/settings.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

async function loadProfile() {
  try {
    const res = await fetch('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error("Failed to load profile");
    const data = await res.json();
    
    // 1. Fill the Text Inputs
    if (document.getElementById('fullName')) document.getElementById('fullName').value = data.user.full_name || '';
    if (document.getElementById('username')) document.getElementById('username').value = data.user.username || '';

    // 2. Update the Header Name
    const navName = document.getElementById('navUserName');
    if (navName) navName.textContent = data.user.full_name;

    // 3. Update the Images
    const profileImagePath = data.user.profile_picture 
      ? `${data.user.profile_picture}?t=${Date.now()}` 
      : 'https://via.placeholder.com/80';
    
    const previewPic = document.getElementById('previewPic');
    if (previewPic) previewPic.src = profileImagePath;

    // 4. Handle Role-specific fields (Safely!)
    if (data.role === 'student') {
      // Only run if the student fields exist on the page
      if (document.getElementById('studentFields')) {
        document.getElementById('studentFields').style.display = 'block';
      }
      if (document.getElementById('teacherFields')) {
        document.getElementById('teacherFields').style.display = 'none';
      }
      if (document.getElementById('gradeLevel')) {
        document.getElementById('gradeLevel').value = data.user.grade_level || '';
      }
    } else {
      // Teacher / Admin
      if (document.getElementById('studentFields')) {
        document.getElementById('studentFields').style.display = 'none';
      }
      if (document.getElementById('teacherFields')) {
        document.getElementById('teacherFields').style.display = 'flex'; 
      }
      if (document.getElementById('department')) document.getElementById('department').value = data.user.department || '';
      if (document.getElementById('specialization')) document.getElementById('specialization').value = data.user.specialization || '';
      if (document.getElementById('contactNumber')) document.getElementById('contactNumber').value = data.user.contact_number || '';
    }

  } catch (err) {
    console.error("Frontend Error:", err.message);
    // alert("Error loading profile: " + err.message);
  }
}

// Handle Form Submission
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('full_name', document.getElementById('fullName').value);
    formData.append('username', document.getElementById('username').value);
    
    // Only append teacher fields if they exist
    if (document.getElementById('department')) {
        formData.append('department', document.getElementById('department').value);
    }
    if (document.getElementById('contactNumber')) {
        formData.append('contact_number', document.getElementById('contactNumber').value);
    }
    
    // Only append student fields if they exist
    if (document.getElementById('gradeLevel')) {
        formData.append('grade_level', document.getElementById('gradeLevel').value);
    }

    const newPass = document.getElementById('newPassword');
    if (newPass && newPass.value) formData.append('password', newPass.value);

    const fileInput = document.getElementById('profilePic');
    if (fileInput && fileInput.files[0]) formData.append('profile_picture', fileInput.files[0]);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const result = await res.json();
      if (res.ok) {
        alert('Profile updated successfully!');
        loadProfile(); // Reload the data
      } else {
        alert('Error: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    }
  });
}

async function downloadBackup() {
  try {
    // 1. Fetch the backup file using the token header
    const res = await fetch('/api/admin/backup', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to generate backup");
    }

    // 2. Convert the response to a Blob (binary file)
    const blob = await res.blob();
    
    // 3. Create a temporary URL for the file
    const url = window.URL.createObjectURL(blob);
    
    // 4. Create a hidden link to trigger the download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `E-grammar_backup_${Date.now()}.sql`; // Filename
    document.body.appendChild(a);
    a.click();
    
    // 5. Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (err) {
    console.error("Backup Error:", err);
    alert("Backup failed: " + err.message);
  }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadProfile);