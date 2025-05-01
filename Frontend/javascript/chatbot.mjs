import { CHATBOT_URL, getAuthHeaders } from './api_url.mjs';

document.addEventListener('DOMContentLoaded', initChatbot);

function initChatbot() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const modeSelector = document.getElementById('mode-selector');
    const currentModeSpan = document.getElementById('current-mode');
    
    let waitingForConfirmation = false;
    let pendingQuery = null;

    // Actualizamos el modo actual cuando cambie el selector
    modeSelector.addEventListener('change', () => {
        currentModeSpan.textContent = modeSelector.value.charAt(0).toUpperCase() + modeSelector.value.slice(1);
    });

    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    async function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        const mode = modeSelector.value;
        appendMessage('user', message);
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;

        try {
            const response = await fetch(CHATBOT_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message,
                    confirm: waitingForConfirmation
                })
            });

            const data = await response.json();

            if (!waitingForConfirmation && data.query) {
                handleSQLConfirmation(data, message);
            } else {
                handleRegularResponse(data);
            }

        } catch (error) {
            console.error('Error específico:', error.message);
            console.error('Stack trace:', error.stack);
            appendMessage('assistant', `
                <div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg">
                    Ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.
                </div>
            `);
        } finally {
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    function handleSQLConfirmation(data, originalMessage) {
        waitingForConfirmation = true;
        pendingQuery = originalMessage;
        
        const content = `
            <div class="space-y-4">
                <div class="font-medium">Query propuesta:</div>
                <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm">${data.query}</pre>
                ${data.disclaimer ? 
                    `<div class="text-amber-600 dark:text-amber-400 text-sm">${data.disclaimer}</div>` 
                    : ''
                }
                <div class="flex gap-2 justify-end">
                    <button onclick="window.confirmSQL(false)" 
                            class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                    <button onclick="window.confirmSQL(true)" 
                            class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Ejecutar
                    </button>
                </div>
            </div>
        `;
        
        appendMessage('assistant', content);
    }

    function handleRegularResponse(data) {
        waitingForConfirmation = false;
        pendingQuery = null;
        
        if (data.error) {
            appendMessage('assistant', `<div class="text-red-500">${data.error}</div>`);
        } else if (data.result) {
            const resultHtml = `
                <div class="space-y-2">
                    <div class="text-green-600 dark:text-green-400">Query ejecutada con éxito.</div>
                    <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm">
                        ${JSON.stringify(data.result, null, 2)}
                    </pre>
                </div>
            `;
            appendMessage('assistant', resultHtml);
        } else {
            appendMessage('assistant', data.response || data.message);
        }
    }

    function appendMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-lg ${
            sender === 'user' 
                ? 'bg-blue-600 text-white ml-auto' 
                : 'bg-gray-100 dark:bg-gray-700/50 dark:text-white'
        } max-w-[80%]`;
        messageDiv.innerHTML = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (sender === 'user') {
            // Agregar mensaje de loading después del mensaje del usuario
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loading-message';
            loadingDiv.className = 'p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 dark:text-white max-w-[80%]';
            loadingDiv.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="animate-pulse">Pensando</div>
                    <div class="animate-bounce">.</div>
                    <div class="animate-bounce delay-100">.</div>
                    <div class="animate-bounce delay-200">.</div>
                </div>
            `;
            chatMessages.appendChild(loadingDiv);
        } else {
            // Remover mensaje de loading si existe
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
        }
    }

    // Exponer la función de confirmación SQL globalmente
    window.confirmSQL = async (confirmed) => {
        if (!confirmed || !pendingQuery) {
            waitingForConfirmation = false;
            pendingQuery = null;
            return;
        }

        messageInput.disabled = true;
        sendButton.disabled = true;

        try {
            const response = await fetch(CHATBOT_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message: pendingQuery,
                    modo: 'sql',
                    confirm: true
                })
            });

            const data = await response.json();
            handleRegularResponse(data);

        } catch (error) {
            appendMessage('assistant', 'Error al ejecutar la query.');
            console.error('Error:', error);
        } finally {
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
            waitingForConfirmation = false;
            pendingQuery = null;
        }
    };
}