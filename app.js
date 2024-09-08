const twitchClientId = 'gp762nuuoqcoxypju8c569th9wz7q5'; // Replace with your Twitch Client ID
const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh';  // Replace with your OAuth token
const twitchUsername = 'elibeelii'; // Replace with your Twitch username
const twitchChannel = 'atrioc'
// Function to update the status message
function updateStatus(message, isError = false) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  if (isError) {
    statusElement.classList.add('error');
  } else {
    statusElement.classList.remove('error');
  }
}

// Connect to Twitch chat using WebSocket
const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

ws.onopen = () => {
  updateStatus("Connected to Twitch chat!");

  // Send necessary commands to authenticate and join the channel
  ws.send('PASS oauth:' + twitchToken);
  ws.send('NICK ' + twitchUsername);
  ws.send('JOIN #' + twitchChannel);
};

ws.onerror = (error) => {
  updateStatus("Failed to connect. Please try again.", true);
  console.error('WebSocket Error:', error);
};

ws.onmessage = (message) => {
  console.log('Message from Twitch:', message.data);

  // Process and display the chat messages
  if (message.data.includes('PRIVMSG')) {
    const chatMessage = message.data.split('PRIVMSG')[1].split(':')[1];
    displayChatMessage(chatMessage);
  }
};

// Display chat message in the chat box
function displayChatMessage(message) {
  const chatBox = document.getElementById('chat');
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);

  // Auto-scroll to the bottom when a new message is added
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Show connection error if the WebSocket closes unexpectedly
ws.onclose = () => {
  updateStatus("Connection closed. Reconnect and try again.", true);
};
