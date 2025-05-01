/* global fetch */
import API_URL from './api_url.mjs';

const main = document.getElementById('main');
const usernameField = document.getElementById('usernameField');
const emailField = document.getElementById('emailField');
const roleField = document.getElementById('roleField');
const passwordField = document.getElementById('passwordField');
const saveUserButton = document.getElementById('saveUserButton');
const endMessage = document.getElementById('endMessage');
const result = document.getElementById('result');

saveUserButton.addEventListener('click', saveUser);

async function saveUser() {
  const payload = JSON.stringify({
    username: usernameField.value.trim(),
    email: emailField.value.trim(),
    role: roleField.value,
    password: passwordField.value.trim()
  });

  try {
    saveUserButton.disabled = true;
    saveUserButton.textContent = 'Creando...';

    const response = await fetch(`${API_URL}/usuarios/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al crear usuario');
    }

    result.innerText = 'Usuario creado exitosamente';
    main.style.display = 'none';
    endMessage.style.display = 'block';
  } catch (err) {
    console.error('Error creating user:', err);
    result.innerText = err.message;
  } finally {
    saveUserButton.disabled = false;
    saveUserButton.textContent = 'Crear Usuario';
  }
}