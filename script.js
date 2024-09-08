const socket = io();

socket.on('chatMessage', (data) => {
    displayMessage(data.user, data.message);
});

function displayMessage(user, message) {
    const chatContainer = document.getElementById('chat-container');
    
    if (!chatContainer) {
        // Create chat container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'chat-container';
        container.style.position = 'absolute';
        container.style.bottom = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.maxHeight = '50%';
        container.style.overflowY = 'scroll';
        container.style.backgroundColor = '#000';
        container.style.color = '#fff';
        container.style.padding = '10px';
        document.body.appendChild(container);
    }
    
    const chatMessage = document.createElement('div');
    chatMessage.innerHTML = `<strong>${user}:</strong> ${message}`;
    chatContainer.appendChild(chatMessage);

    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
