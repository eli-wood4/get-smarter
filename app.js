document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('darkModeToggle');
  const mainHeading = document.querySelector('.sidebar h1'); 

  toggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');  
    if (document.body.classList.contains('dark-mode')) {
      toggleButton.textContent = '☀️'; 
      mainHeading.textContent = '🌭GET SMARTER SATURDAYS🌭'; 
    } else {
      toggleButton.textContent = '🌙'; 
      mainHeading.textContent = '🐝GET SMARTER SATURDAYS🐝';
    }
  });
  

  const twitchUsername = 'elibeelii';
  const twitchChannel = 'elibeelii';
  const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh';
  const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E';

  const postedVideos = {};

  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

  ws.onopen = () => {
    console.log("Connected to Twitch chat");
    ws.send('PASS oauth:' + twitchToken);
    ws.send('NICK ' + twitchUsername);
    ws.send('JOIN #' + twitchChannel);

    setInterval(() => {
      ws.send('PING :tmi.twitch.tv');
      console.log('Sent PING to keep the connection alive');
    }, 5 * 60 * 1000);
  };

  ws.onmessage = (message) => {
    console.log('Message from Twitch:', message.data);

    if (message.data.startsWith('PING')) {
      ws.send('PONG :tmi.twitch.tv');
      console.log('Responded with PONG');
    }

    if (message.data.includes('PRIVMSG')) {
      const splitMessage = message.data.split(' :');
      if (splitMessage.length >= 2) {
        const chatMessage = splitMessage[1].trim();
        const chatterName = message.data.split('!')[0].substring(1); 
        console.log('Chat message:', chatMessage);
        displayChatMessage(chatMessage, chatterName); 
      }
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };

  ws.onclose = () => {
    console.log('Connection closed.');
  };

  function getVideoId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        return urlObj.searchParams.get('v'); 
      }
    } catch (error) {
      console.error('Error extracting video ID:', error);
    }
    return null;
  }

async function addVideoFromLink(link, chatterName) {
  const videoId = getVideoId(link);
  
  if (!videoId) {
    console.error('Invalid YouTube link:', link);
    return;
  }

  // Check if the video is already posted.
  if (postedVideos[videoId]) {
    // Check if this chatter has already posted this video.
    if (!postedVideos[videoId].chatters.includes(chatterName)) {
      postedVideos[videoId].count++; // Increment only for new chatters.
      postedVideos[videoId].chatters.push(chatterName); // Add the new chatter.

      // Update the counter in the existing card without changing the chatter's name.
      const existingCard = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
      if (existingCard) {
        const chatterBox = existingCard.querySelector('.chatter-box');
        chatterBox.innerHTML = chatterBox.innerHTML.replace(/\(x\d+\)/, `(+${postedVideos[videoId].count})`);
      }
    }
    return; // Don't append new chatter's name, only count unique chatters.
  }

  const videoData = await fetchVideoData(videoId);
  
  if (!videoData) {
    console.error('Failed to fetch video data:', link);
    return;
  }

  // Initialize video entry with the first chatter and count.
  postedVideos[videoId] = { count: 1, chatters: [chatterName] };

  const title = videoData.snippet.title;
  const thumbnailUrl = videoData.snippet.thumbnails.medium.url;
  const creator = videoData.snippet.channelTitle;
  const duration = formatDuration(videoData.contentDetails.duration);
  const viewCount = videoData.statistics.viewCount;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Create video card
  const videoCard = document.createElement('div');
  videoCard.classList.add('video-card');
  videoCard.setAttribute('data-video-id', videoId);

  const chatNameBubble = `<div class="chatter-box">${chatterName} (+${postedVideos[videoId].count})</div>`;

  videoCard.innerHTML = `
    <div class="thumbnail-container">
      ${chatNameBubble}
      <a href="${videoUrl}" target="_blank">
        <img src="${thumbnailUrl}" alt="${title}">
      </a>
    </div>
    <div class="video-info">
      <h3>${title}</h3>
      <p class="creator"><b>${creator}</b></p>
      <p class="length">${duration}</p>
      <p class="views">${Number(viewCount).toLocaleString()} views</p>
    </div>
  `;

  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.appendChild(videoCard);
  } else {
    console.error('Video grid element not found');
  }
}
});
