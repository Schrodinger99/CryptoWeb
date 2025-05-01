/* global fetch */
import API_URL from './api_url.mjs';

const deleteUserButton = document.getElementById('deleteUserButton');
const emailField = document.getElementById('emailToDelete');
const main = document.getElementById('main');
const endMessage = document.getElementById('endMessage');
const result = document.getElementById('result');

deleteUserButton.addEventListener('click', deleteUser);

async function deleteUser() {
  const email = emailField.value.trim();

  if (!email || !email.includes('@')) {
    result.innerText = 'Por favor ingresa un email válido';
    return;
  }

  try {
    deleteUserButton.disabled = true;
    deleteUserButton.textContent = 'Eliminando...';

    const response = await fetch(`${API_URL}/usuarios/admin/${email}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar usuario');
    }

    result.innerText = 'Usuario eliminado exitosamente';
    main.style.display = 'none';
    endMessage.style.display = 'block';
  } catch (err) {
    console.error('Error deleting user:', err);
    result.innerText = err.message;
  } finally {
    deleteUserButton.disabled = false;
    deleteUserButton.textContent = 'Eliminar Usuario';
  }
}