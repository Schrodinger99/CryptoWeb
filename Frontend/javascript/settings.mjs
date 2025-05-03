import { API_BASE, getAuthHeaders } from './api_url.mjs';

document.addEventListener('DOMContentLoaded', initSettings);

async function initSettings() {
  try {
    // Verifica si el token es válido antes de mostrar el contenido
    const res = await fetch(`${API_BASE}/check-auth`, {
      headers: getAuthHeaders()
    });

    const data = await res.json();
    
    if (res.status !== 200 || data.rol !== 'Admin') {
      // Si no es Admin, redirigir a login
      window.location.href = 'login.html';
      return;
    }

    // Aquí sigue el código para manejar los formularios de creación y eliminación de usuarios
    const createUserForm = document.getElementById('createUserForm');
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(createUserForm);
      const userData = {
        email: formData.get('email'),
        password: formData.get('password'),
        username: formData.get('username'),
        rol: formData.get('role')
      };
      
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData)
      });

      const data = await res.json();
      if (res.status === 201) {
        alert('Usuario creado correctamente');
      } else {
        alert('Error al crear el usuario');
      }
    });

    // Eliminar Usuario
    const deleteUserForm = document.getElementById('deleteUserForm');
    deleteUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(deleteUserForm);
      const emailToDelete = formData.get('email');

      const res = await fetch(`${API_BASE}/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ email: emailToDelete })
      });

      const data = await res.json();
      if (res.status === 200) {
        alert('Usuario eliminado correctamente');
      } else {
        alert('Error al eliminar el usuario');
      }
    });

  } catch (err) {
    console.error('Error al cargar los datos:', err);
    window.location.href = 'login.html';
  }
}