const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const tmi = require('tmi.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const twitchClient = new tmi.Client({
    channels: ['your_channel']
});

twitchClient.connect().catch(console.error);

twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;

    const youtubeRegex = /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g;
    const matches = message.match(youtubeRegex);

    if (matches) {
        matches.forEach(url => {
            io.emit('newThumbnail', url);
        });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
