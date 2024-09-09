const twitchClientId = 'gp762nuuoqcoxypju8c569th9wz7q5'; // Replace with your Twitch Client ID
const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh';  // Replace with your OAuth token
const twitchUsername = 'elibeelii'; // Replace with your Twitch username
const twitchChannel = 'hasanabi'
const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E'; // Replace with your YouTube API key

// Extract video ID from YouTube URL
function getVideoId(url) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get('v');
}

// Fetch video data from YouTube API
async function fetchVideoData(videoId) {
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`;
  const response = await fetch(apiUrl);
  const data = await response.json();
  return data.items[0];
}

// Format video duration from ISO 8601 to hh:mm:ss
function formatDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  return [hours || '00', minutes || '00', seconds || '00'].join(':');
}

// Display chat message in the chat box
function displayChatMessage(message) {
  const chatBox = document.getElementById('chat');
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);

  // Auto-scroll to the bottom when a new message is added
  chatBox.scrollTop = chatBox.scrollHeight;

  // Check for YouTube links in the message
  const youtubeLinkRegex = /(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+)/;
  const youtubeLinkMatch = message.match(youtubeLinkRegex);
  
  if (youtubeLinkMatch) {
    const youtubeLink = youtubeLinkMatch[0];
    addVideoFromLink(youtubeLink);
  }
}

// Add video to the grid using a YouTube link
async function addVideoFromLink(link) {
  const videoId = getVideoId(link);
  
  if (!videoId) {
    console.error('Invalid YouTube link:', link);
    return;
  }

  const videoData = await fetchVideoData(videoId);
  
  if (!videoData) {
    console.error('Failed to fetch video data:', link);
    return;
  }

  const title = videoData.snippet.title;
  const thumbnailUrl = videoData.snippet.thumbnails.medium.url;
  const creator = videoData.snippet.channelTitle;
  const duration = formatDuration(videoData.contentDetails.duration);

  // Create video card
  const videoCard = document.createElement('div');
  videoCard.classList.add('video-card');

  videoCard.innerHTML = `
    <img src="${thumbnailUrl}" alt="${title}">
    <div class="video-info">
      <h3>${title}</h3>
      <p class="creator">Creator: ${creator}</p>
      <p class="length">Length: ${duration}</p>
    </div>
  `;

  // Add to grid
  const videoGrid = document.getElementById('videoGrid');
  videoGrid.appendChild(videoCard);
}

// Connect to Twitch chat using WebSocket
const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

ws.onopen = () => {
  console.log("Connected to Twitch chat");
  ws.send('PASS oauth:' + twitchToken);
  ws.send('NICK ' + twitchUsername);
  ws.send('JOIN #' + twitchChannel);
};

ws.onmessage = (message) => {
  console.log('Message from Twitch:', message.data);

  // Process chat message
  if (message.data.includes('PRIVMSG')) {
    const chatMessage = message.data.split('PRIVMSG')[1].split(':')[1];
    displayChatMessage(chatMessage);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket Error:', error);
  updateStatus("Failed to connect. Please try again.", true);
};

ws.onclose = () => {
  updateStatus("Connection closed. Reconnect and try again.", true);
};
