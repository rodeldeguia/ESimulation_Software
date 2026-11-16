
const form = document.getElementById('signupForm');
const message =  document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

function showmessage(text,type){
    message.textContent =  text;
    message.className = `message ${type}`;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        username : document.getElementById('username').value.trim(),
        password : document.getElementById('password').value,
        full_name : document.getElementById('full_name').value.trim(),
        department : document.getElementById('department').value.trim() || null,
        specialization : document.getElementById('specialization').value.trim() || null,
        contact_number : document.getElementById('contact_number').value.trim() || null

    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    showmessage('', 'error');

    try {
        const res = await fetch('/api/auth/signup/teacher', { method : 'POST',headers : {'Content-Type' : 'application/json'}, body : JSON.stringify(payload)});
        const data = await res.json();

        if(!res.ok){
            showmessage(data.error || 'Signup failed', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
            return;
        }

        showmessage('Account created! Redirecting to login...', 'success');

        setTimeout(() => {
            window.location.href = '/auth/teacher-login.html';
        }, 1500);
        
    } catch (error) {
        console.error('Network error:', err);
        showMessage('Could not reach the server', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
    }


});
