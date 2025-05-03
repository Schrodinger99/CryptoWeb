import { API_BASE, getAuthHeaders } from './api_url.mjs';

document.addEventListener('DOMContentLoaded', initUserDetails);

async function initUserDetails() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/user-info`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error loading user info');
        const data = await res.json();
        
        // Populate profile fields
        document.getElementById('detail-name').textContent = data.username;
        document.getElementById('detail-email').textContent = data.email;
        if (data.avatar_url) document.getElementById('detail-avatar').src = data.avatar_url;
        document.getElementById('detail-registered').textContent = data.fecha_registro || 'N/A';
        document.getElementById('detail-role').textContent = data.rol || 'N/A';
        document.getElementById('detail-last-login').textContent = data.last_login || 'N/A';

        // Social media info
        document.getElementById('twitter').value = data.twitter || '';
        document.getElementById('linkedin').value = data.linkedin || '';
        document.getElementById('github').value = data.github || '';
    } catch (err) {
        console.error(err);
    }
}

// Avatar upload
const avatarInput = document.getElementById('avatar-input');
document.getElementById('change-photo').addEventListener('click', () => avatarInput.click());
avatarInput.addEventListener('change', async function () {
    const file = this.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/update-avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        // Update profile image
        document.getElementById('detail-avatar').src = URL.createObjectURL(file);
    }
});

// Update user info
document.getElementById('edit-name').addEventListener('click', async () => {
    const newName = prompt('Ingrese su nuevo nombre de usuario:', document.getElementById('detail-name').textContent);
    if (newName) {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/update-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username: newName })
        });
        document.getElementById('detail-name').textContent = newName;
    }
});

// Save social links
document.getElementById('save-social').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    const body = {
        twitter: document.getElementById('twitter').value.trim(),
        linkedin: document.getElementById('linkedin').value.trim(),
        github: document.getElementById('github').value.trim()
    };
    await fetch(`${API_BASE}/update-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    alert('Datos de perfil actualizados');
});