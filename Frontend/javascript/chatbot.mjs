import { CHATBOT_URL, getAuthHeaders } from './api_url.mjs';
const TIMEOUT_DURATION = 30000; // 30 seconds

let conversationHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');

document.addEventListener('DOMContentLoaded', initChatbot);

function scrollToBottom(element) {
    element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
    });
}

function initChatbot() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    
    // Removidas las referencias a elementos que no existen
    let waitingForConfirmation = false;
    let pendingQuery = null;

    // Event listeners
    if (sendButton && messageInput && chatMessages) {
        sendButton.addEventListener('click', handleSendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendMessage();
        });
    } else {
        console.error('Elementos necesarios no encontrados en el DOM');
        return;
    }

    async function handleSendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
        messageInput.value = '';
        messageInput.disabled = true;
        sendButton.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

        try {
            const response = await fetch(CHATBOT_URL, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message,
                    history: conversationHistory,
                    confirm: waitingForConfirmation
                }),
                signal: controller.signal // Añadimos el signal para abortar si es necesario
            });

            clearTimeout(timeoutId); // Limpiamos el timeout si la respuesta llega a tiempo

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP error:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            // Parse JSON with debug error handling
            const rawData = await response.json().catch(e => {
                console.error('Error fetching or parsing JSON:', e);
                appendMessage('assistant', createErrorMessage('Respuesta no válida del servidor'));
                return null;
            });
            if (rawData == null) return;
            let data;
            if (typeof rawData.body === 'string') {
                try {
                    data = JSON.parse(rawData.body);
                } catch (parseError) {
                    console.error('Error parsing rawData.body JSON:', parseError, rawData.body);
                    appendMessage('assistant', createErrorMessage('Error al parsear respuesta JSON'));
                    return;
                }
            } else {
                data = rawData;
            }

            // Manejar diferentes tipos de respuestas
            if (data.error) {
                appendMessage('assistant', createErrorMessage(data.error));
            } else if (data.query) {
                handleSQLResponse(data);
            } else if (data.result) {
                handleDataResult(data);
            } else if (data.response || data.message) {
                // Actualizar el historial de la conversación
                conversationHistory.push({ role: 'assistant', content: data.response });
                localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
                appendMessage('assistant', formatResponse(data.response || data.message));
            } else {
                throw new Error('Formato de respuesta no válido');
            }

        } catch (error) {
            console.error('Error:', error);
            let errorMessage;
            
            if (error.name === 'AbortError') {
                errorMessage = 'La solicitud tomó demasiado tiempo. Por favor, intenta una consulta más simple o inténtalo de nuevo más tarde.';
            } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                errorMessage = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.';
            } else {
                errorMessage = error.message || 'Ha ocurrido un error al procesar tu mensaje.';
            }
            
            appendMessage('assistant', createErrorMessage(errorMessage));
        } finally {
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    function handleSQLResponse(data) {
        const content = createSQLConfirmationMessage(data);
        appendMessage('assistant', content);
        conversationHistory.push({ role: 'assistant', content: data.query });
        localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
        waitingForConfirmation = true;
        pendingQuery = data.query;
    }

    function handleDataResult(data) {
        const content = Array.isArray(data.result) 
            ? createTableView(data.result)
            : createJSONView(data.result);
        appendMessage('assistant', content);
        conversationHistory.push({ role: 'assistant', content: JSON.stringify(data.result || data) });
        localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
    }

    function createSQLConfirmationMessage(data) {
        return `
            <div class="space-y-4">
                <div class="font-medium text-gray-700 dark:text-gray-300">Query propuesta:</div>
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
    }

    function createTableView(data) {
        if (!data.length) return '<p class="text-gray-500">No hay resultados para mostrar.</p>';

        const headers = Object.keys(data[0]);
        return `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                        <tr>
                            ${headers.map(h => `
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    ${h}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        ${data.map(row => `
                            <tr>
                                ${headers.map(h => `
                                    <td class="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                                        ${row[h] ?? '-'}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function createJSONView(data) {
        return `
            <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-sm text-gray-700 dark:text-gray-300">
                ${JSON.stringify(data, null, 2)}
            </pre>
        `;
    }

    function createErrorMessage(error = 'Ha ocurrido un error al procesar tu mensaje.') {
        return `
            <div class="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 p-4 rounded">
                <div class="flex items-center">
                    <div class="flex-shrink-0 text-red-500">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700 dark:text-red-300">${error}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function formatResponse(response) {
        const md = response || '';
        // Use marked.parse for Markdown-to-HTML, or fallback to raw text
        const html = (typeof marked === 'object' && typeof marked.parse === 'function')
            ? marked.parse(md)
            : (typeof marked === 'function' ? marked(md) : md);
        return `<div class="text-gray-700 dark:text-gray-300 markdown-content">${html}</div>`;
    }

    function appendMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-lg ${
            sender === 'user' 
                ? 'bg-blue-600 text-white ml-auto' 
                : 'bg-gray-100 dark:bg-gray-700/50'
        } max-w-[80%] mb-4`;
        messageDiv.innerHTML = content;
        
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(messageDiv);
        
        // Smooth scroll to bottom after adding message
        scrollToBottom(chatMessages);

        if (sender === 'user') {
            // Agregar mensaje de loading después del mensaje del usuario
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'loading-message';
            loadingDiv.className = 'p-4 rounded-lg bg-gray-100 dark:bg-gray-700/50 dark:text-white max-w-[80%]';
            loadingDiv.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="animate-pulse">Thinking</div>
                    <div class="animate-bounce">.</div>
                    <div class="animate-bounce delay-100">.</div>
                    <div class="animate-bounce delay-200">.</div>
                </div>
            `;
            chatMessages.appendChild(loadingDiv);
            // Scroll again after adding loading message
            scrollToBottom(chatMessages);
        } else {
            // Remover mensaje de loading si existe
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
                // Scroll one final time after removing loading message
                scrollToBottom(chatMessages);
            }
        }
    }

    function getMessageClassName(sender) {
        return `p-4 rounded-lg ${
            sender === 'user' 
                ? 'bg-blue-600 text-white ml-auto max-w-[80%]' 
                : 'bg-gray-100 dark:bg-gray-700/50 dark:text-white max-w-[90%]'
        }`;
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

        try {
            const response = await fetch(CHATBOT_URL, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message: pendingQuery,
                    modo: 'sql',
                    confirm: true,
                    history: conversationHistory
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                appendMessage('assistant', createErrorMessage(data.error));
            } else {
                // Actualizar el historial de la conversación con la consulta SQL y respuesta del asistente
                conversationHistory.push({ role: 'user', content: pendingQuery });
                conversationHistory.push({ role: 'assistant', content: data.explanation || data.message || '' });
                localStorage.setItem('chat_history', JSON.stringify(conversationHistory));
                appendMessage('assistant', formatResponse(data.message));
            }

        } catch (error) {
            console.error('Error:', error);
            let errorMessage;
            
            if (error.name === 'AbortError') {
                errorMessage = 'La consulta SQL tomó demasiado tiempo. Por favor, simplifica la consulta o inténtalo de nuevo.';
            } else {
                errorMessage = error.message || 'Error al ejecutar la consulta SQL.';
            }
            
            appendMessage('assistant', createErrorMessage(errorMessage));
        } finally {
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
            waitingForConfirmation = false;
            pendingQuery = null;
        }
    };
}