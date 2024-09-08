const twitchClientId = '<your-client-id>';
const twitchToken = '<your-oauth-token>';
const twitchUsername = '<your-twitch-username>';
const twitchChannel = '<channel-name>';

const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

ws.onopen = () => {
  ws.send('PASS oauth:' + twitchToken);
  ws.send('NICK ' + twitchUsername);
  ws.send('JOIN #' + twitchChannel);
};

ws.onmessage = (message) => {
  console.log('Message from Twitch:', message.data);

  // Process and display the message on your website
  if (message.data.includes('PRIVMSG')) {
    const chatMessage = message.data.split('PRIVMSG')[1].split(':')[1];
    document.getElementById('chat').innerHTML += `<p>${chatMessage}</p>`;
  }
};
