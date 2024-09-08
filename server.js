const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const tmi = require('tmi.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Configure Twitch chat client
const twitchClient = new tmi.Client({
    channels: ['your_channel'] // Replace 'your_channel' with the Twitch channel you want to monitor
});

twitchClient.connect().catch(console.error);

// Listen for chat messages
twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return; // Ignore messages from the bot itself

    // Emit the chat message to all connected clients
    io.emit('chatMessage', { user: tags.username, message });
});

// Handle client connection
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
