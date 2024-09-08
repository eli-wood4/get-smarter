const twitchClientId = 'YOUR_CLIENT_ID'; // Replace with your Twitch Client ID
const twitchToken = 'YOUR_OAUTH_TOKEN';  // Replace with your OAuth token
const twitchUsername = 'YOUR_TWITCH_USERNAME'; // Replace with your Twitch username
const twitchChannel = 'CHANNEL_NAME'; // Replace with the channel you want to join

// Connect to Twitch chat using WebSocket
const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

ws.onopen = () => {
  console.log("Connected to Twitch chat");
  
  // Send necessary commands to authenticate and join the channel
  ws.send('PASS oauth:' + twitchToken);
  ws.send('NICK ' + twitchUsername);
  ws.send('JOIN #' + twitchChannel);
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
