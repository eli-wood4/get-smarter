document.addEventListener('DOMContentLoaded', () => {
  const twitchUsername = 'elibeelii'; // Replace with your Twitch username
  const twitchChannel = 'elibeelii'; // Replace with your Twitch channel
  const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh';
  const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E';
  
  // Set up WebSocket connection to Twitch
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

  ws.onopen = () => {
    console.log("Connected to Twitch chat");
    ws.send('PASS oauth:' + twitchToken);
    ws.send('NICK ' + twitchUsername);
    ws.send('JOIN #' + twitchChannel);

    // Send PING to keep the connection alive every 5 minutes
    setInterval(() => {
      ws.send('PING :tmi.twitch.tv');
      console.log('Sent PING to keep the connection alive');
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
  };

  ws.onmessage = (message) => {
    console.log('Message from Twitch:', message.data);

    // Respond to PING with PONG to keep the connection alive
    if (message.data.startsWith('PING')) {
      ws.send('PONG :tmi.twitch.tv');
      console.log('Responded with PONG');
    }

    if (message.data.includes('PRIVMSG')) {
      const splitMessage = message.data.split(' :');
      if (splitMessage.length >= 2) {
        const chatMessage = splitMessage[1].trim();
        const chatterName = message.data.split('!')[0].substring(1); // Extract chatter's name
        console.log('Chat message:', chatMessage);
        displayChatMessage(chatMessage, chatterName); // Pass chatter name
      }
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };

  ws.onclose = () => {
    console.log('Connection closed.');
  };

  // Extract video ID from YouTube URL (including youtu.be links)
  function getVideoId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1); // youtu.be/<id>
      } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        return urlObj.searchParams.get('v'); // youtube.com/watch?v=<id>
      }
    } catch (error) {
      console.error('Error extracting video ID:', error);
    }
    return null;
  }

  // Fetch video data from YouTube API, including snippet, contentDetails, and statistics (for view count)
  async function fetchVideoData(videoId) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${youtubeApiKey}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      return data.items && data.items.length > 0 ? data.items[0] : null;
    } catch (error) {
      console.error('Error fetching video data:', error);
      return null;
    }
  }

  // Format video duration from ISO 8601 to hh:mm:ss
  function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    return [hours || '00', minutes || '00', seconds || '00'].join(':');
  }

  // Display chat message and process YouTube links
  function displayChatMessage(message, chatterName) {
    const youtubeLinkRegex = /(https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/;
    const youtubeLinkMatch = message.match(youtubeLinkRegex);
    
    if (youtubeLinkMatch) {
      const youtubeLink = youtubeLinkMatch[0];
      console.log('YouTube link found in message:', youtubeLink);
      addVideoFromLink(youtubeLink, chatterName); // Pass chatter name
    } else {
      console.log('No YouTube link found in message:', message);
    }
  }

// Add video to the grid using a YouTube link
async function addVideoFromLink(link, chatterName) {
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
  const viewCount = videoData.statistics.viewCount;  // Get view count from statistics
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Create video card
  const videoCard = document.createElement('div');
  videoCard.classList.add('video-card');
  videoCard.setAttribute('data-chatter', chatterName); // Set the chatter's name in a data attribute

  // Add chat name bubble
  const chatNameBubble = `<div class="chatter-box">${chatterName}</div>`;

  videoCard.innerHTML = `
    ${chatNameBubble}
    <a href="${videoUrl}" target="_blank">
      <img src="${thumbnailUrl}" alt="${title}">
    </a>
    <div class="video-info">
      <h3>${title}</h3>
      <p class="creator"><b> ${creator}</p>
      <p class="length"> ${duration}</p>
      <p class="views"> ${viewCount.toLocaleString()} views</b></p>
    </div>
  `;

  console.log('Adding video card to the grid:', title);

  // Add to grid
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.appendChild(videoCard);
  } else {
    console.error('Video grid element not found');
  }
}
});
