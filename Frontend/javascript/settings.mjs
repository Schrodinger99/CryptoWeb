import { API_BASE, DATA_URL, getAuthHeaders } from './api_url.mjs';

// Ensure user is authenticated
(async () => {
  const res = await fetch(`${API_BASE}/check-auth`, { headers: getAuthHeaders() });
  if (res.status !== 200) {
    window.location.href = 'login.html';
  }
})();

async function fetchWithCheck(url, options = {}) {
  const response = await fetch(url, { 
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
    method: options.method || 'GET',
    body: options.body || null
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

document.addEventListener('DOMContentLoaded', initSettings);

function initSettings() {
  const createUserForm = document.getElementById('createUserForm');
  const deleteUserForm = document.getElementById('deleteUserForm');
  const createButton = createUserForm.querySelector('button[type="submit"]');
  const deleteButton = deleteUserForm.querySelector('button[type="submit"]');

  // Crear Usuario
  createUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(createUserForm);
    const payload = {
      username: formData.get('username').trim(),
      email: formData.get('email').trim(),
      role: formData.get('role'),
      password: formData.get('password').trim()
    };

    // Validación básica
    if (!payload.email || !payload.email.includes('@')) {
      showStatus('Por favor ingresa un email válido', 'error');
      return;
    }

    try {
      createButton.disabled = true;
      createButton.innerHTML = 'Creando...';

      // Remover verificaciones de token
      const data = await fetchWithCheck(`${DATA_URL}/usuarios/admin`, {
          method: 'POST',
          body: JSON.stringify(payload)
      });

      showStatus('Usuario creado exitosamente', 'success');
      createUserForm.reset();

    } catch (err) {
      console.error('Error:', err);
      showStatus(err.message || 'Error al crear usuario', 'error');
    } finally {
      createButton.disabled = false;
      createButton.innerHTML = 'Crear Usuario';
    }
  });

  // Eliminar Usuario
  deleteUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(deleteUserForm).get('email').trim();

    // Validación básica del email
    if (!email || !email.includes('@')) {
      showStatus('Por favor ingresa un email válido', 'error');
      return;
    }

    try {
      deleteButton.disabled = true;
      deleteButton.innerHTML = 'Eliminando...';

      const data = await fetchWithCheck(`${DATA_URL}/usuarios/admin/${email}`, {
        method: 'DELETE'
      });

      showStatus('Usuario eliminado exitosamente', 'success');
      deleteUserForm.reset();

    } catch (err) {
      console.error('Error:', err);
      showStatus(err.message || 'Error al eliminar usuario', 'error');
    } finally {
      deleteButton.disabled = false;
      deleteButton.innerHTML = 'Eliminar Usuario';
    }
  });
}

function showStatus(message, type = 'success') {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = `alert alert-${type} mb-4`;
    statusMessage.style.display = 'block';

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  } else {
    alert(message);
  }
}