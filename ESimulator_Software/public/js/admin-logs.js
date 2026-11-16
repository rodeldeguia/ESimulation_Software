// public/js/admin-logs.js
const token = localStorage.getItem('token');
if (!token) window.location.href = '/auth/teacher-login.html';

let allLogs = [];
let teachersDict = {}; 
let lessonsDict = {};  
let studentsDict = {}; 

async function loadLogs() {
  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">Loading system logs...</td></tr>';

  try {
    const [logsRes, teachersRes, studentsRes, lessonsRes] = await Promise.all([
      fetch('/api/admin/logs?limit=200', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/teachers', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/lessons', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    if (!logsRes.ok) throw new Error('Failed to load logs');
    
    const logsData = await logsRes.json();
    allLogs = logsData.logs || [];

    // --- TEACHERS ---
    if (teachersRes.ok) {
      const teachersData = await teachersRes.json();
      const tArray = Array.isArray(teachersData) ? teachersData : (teachersData.teachers || []);
      tArray.forEach(t => { teachersDict[t.teacher_id] = t.full_name; });
    }

    // --- STUDENTS ---
    if (studentsRes.ok) {
      const studentsData = await studentsRes.json();
      const sArray = Array.isArray(studentsData) ? studentsData : (studentsData.students || []);
      sArray.forEach(s => { studentsDict[s.student_id] = s.full_name; });
    }

    // --- LESSONS (HANDLES BOTH SINGLE OBJECT AND ARRAY) ---
    if (lessonsRes.ok) {
      const lessonsData = await lessonsRes.json();
      console.log("Lessons API Response:", lessonsData);
      
      // Check if it's a single object or an array
      let lessonsArray = [];
      if (Array.isArray(lessonsData)) {
        lessonsArray = lessonsData;
      } else if (lessonsData.lessons && Array.isArray(lessonsData.lessons)) {
        lessonsArray = lessonsData.lessons;
      } else if (lessonsData.lesson_id) {
        // If it's a single lesson object, put it in an array
        lessonsArray = [lessonsData];
      }

      lessonsArray.forEach(l => { 
        const id = l.lesson_id || l.id; 
        lessonsDict[id] = l.title; 
      });
      
      console.log("Lessons Dictionary:", lessonsDict);
    }

    renderLogs();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#dc2626;">Error: ${err.message}</td></tr>`;
  }
}

function formatAction(action) {
  const actions = {
    'login': 'Logged In',
    'lesson.create': 'Created Lesson',
    'lesson.approve': 'Approved Lesson',
    'lesson.reject': 'Rejected Lesson',
    'user.toggle_active': 'Changed User Status',
    'user.change_role': 'Changed User Role'
  };
  return actions[action] || action.replace('.', ' ').replace(/_/g, ' ').toUpperCase();
}

function renderLogs() {
  const tbody = document.getElementById('logTableBody');
  const filter = document.getElementById('actionFilter').value;

  const filtered = filter === 'all' 
    ? allLogs 
    : allLogs.filter(log => log.action === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#94a3b8;">No logs found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(log => {
    const time = log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown';
    
    let badgeClass = 'badge-other';
    if (log.action.includes('login')) badgeClass = 'badge-login';
    else if (log.action.includes('lesson')) badgeClass = 'badge-lesson';
    else if (log.action.includes('quiz')) badgeClass = 'badge-quiz';
    else if (log.action.includes('user')) badgeClass = 'badge-user';

    let actorName = '';
    if (log.actor_type === 'teacher') {
      actorName = teachersDict[log.actor_id] || `Teacher #${log.actor_id}`;
    } else if (log.actor_type === 'student') {
      actorName = studentsDict[log.actor_id] || `Student #${log.actor_id}`;
    } else {
      actorName = `Admin #${log.actor_id}`;
    }

    let entityName = 'System';
    if (log.entity_id) {
      if (log.entity_type === 'lesson') {
        entityName = lessonsDict[log.entity_id] || `Lesson #${log.entity_id}`;
      } else if (log.entity_type === 'student') {
        entityName = studentsDict[log.entity_id] || `Student #${log.entity_id}`;
      } else if (log.entity_type === 'teacher') {
        entityName = teachersDict[log.entity_id] || `Teacher #${log.entity_id}`;
      } else {
        entityName = `${log.entity_type} #${log.entity_id}`;
      }
    }

    return `
      <tr>
        <td style="color:var(--text-muted); font-size:13px; white-space:nowrap;">${time}</td>
        <td>
          <strong style="color:var(--navy);">${actorName}</strong><br>
          <span style="font-size:12px; color:var(--text-muted); text-transform:capitalize;">${log.actor_type}</span>
        </td>
        <td>
          <span class="badge ${badgeClass}">${formatAction(log.action)}</span>
        </td>
        <td style="font-weight: 500; color: var(--navy);">
           <span style="font-size: 12px; color: var(--text-muted); margin-right: 5px; text-transform: capitalize;">${log.entity_type}:</span>
           ${entityName}
        </td>
        <td style="color:var(--text-muted); font-size:12px;">${log.ip_address || '—'}</td>
      </tr>
    `;
  }).join('');
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    localStorage.clear(); 
    window.location.href = '/auth/teacher-login.html';
  });
}

document.addEventListener('DOMContentLoaded', loadLogs);