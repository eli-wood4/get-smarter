import React, { useEffect, useState } from 'react';

function TwitchChat() {
  const [chat, setChat] = useState([]);

  useEffect(() => {
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
      if (message.data.includes('PRIVMSG')) {
        const chatMessage = message.data.split('PRIVMSG')[1].split(':')[1];
        setChat(prevChat => [...prevChat, chatMessage]);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h1>Twitch Chat</h1>
      <div id="chat">
        {chat.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
    </div>
  );
}

export default TwitchChat;
