import API_URL from './api_url.mjs';

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotPasswordForm');
    const messageContainer = document.getElementById('message-container');

    forgotForm.addEventListener('submit', handleForgotPassword);

    async function handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al procesar la solicitud');
            }

            // Mostrar mensaje de éxito
            showMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña', 'success');
            
            // Redirigir después de 3 segundos
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);

        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    function showMessage(message, type) {
        const className = type === 'success' 
            ? 'p-4 mb-4 text-sm text-green-800 bg-green-100 rounded-lg'
            : 'p-4 mb-4 text-sm text-red-800 bg-red-100 rounded-lg';

        messageContainer.innerHTML = `
            <div class="${className}">
                ${message}
            </div>
        `;
    }
});