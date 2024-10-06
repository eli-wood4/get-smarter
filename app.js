document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('darkModeToggle');
  const mainHeading = document.querySelector('.sidebar h1'); 
  const lightModeVideo = document.querySelector('.light-mode-video');
  const darkModeVideo = document.querySelector('.dark-mode-video');

  // Dark Mode Toggle Functionality
  toggleButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');  
    if (document.body.classList.contains('dark-mode')) {
      toggleButton.textContent = '☀️'; 
      mainHeading.textContent = '🌭GET SMARTER SATURDAY🌭'; 
      lightModeVideo.style.display = 'none';
      darkModeVideo.style.display = 'block';
      darkModeVideo.play();
      lightModeVideo.pause();
    } else {
      toggleButton.textContent = '🌙'; 
      mainHeading.textContent = '🐝GET SMARTER SATURDAY🐝';
      darkModeVideo.style.display = 'none';
      lightModeVideo.style.display = 'block';
      lightModeVideo.play();
      darkModeVideo.pause();
    }
  });

  // Twitch and YouTube API Configuration
  const twitchUsername = 'elibeelii';
  const twitchChannel = 'atrioc';
  const twitchToken =   '7l74an6bprhw760p0u0b6lwpeglkgh'; // Replace with your actual Twitch OAuth token
  const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E';   // Replace with your actual YouTube API key

  const postedVideos = {};
  let videoIdQueue = [];
  let batchTimeout = null;

  // Connect to Twitch Chat via WebSocket
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

  ws.onopen = () => {
    console.log("Connected to Twitch chat");
    ws.send('PASS oauth:' + twitchToken);
    ws.send('NICK ' + twitchUsername);
    ws.send('JOIN #' + twitchChannel);

    setInterval(() => {
      ws.send('PING :tmi.twitch.tv');
      console.log('Sent PING to keep the connection alive');
    }, 5 * 60 * 1000); // Ping every 5 minutes
  };

  ws.onmessage = (message) => {
    console.log('Message from Twitch:', message.data);

    if (message.data.startsWith('PING')) {
      ws.send('PONG :tmi.twitch.tv');
      console.log('Responded with PONG');
      return;
    }

    // Parse Twitch chat messages
    const regex = /:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/;
    const match = message.data.match(regex);

    if (match) {
      const chatterName = match[1];
      const chatMessage = match[2];
      console.log('Chat message:', chatMessage);
      displayChatMessage(chatMessage, chatterName);
    } else {
      console.log('Could not parse message:', message.data);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
  };

  ws.onclose = () => {
    console.log('Connection closed.');
  };

  // Function to extract and process YouTube links from chat messages
  function displayChatMessage(message, chatterName) {
    const youtubeLinkRegex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|v\/|embed\/)|youtu\.be\/)([^\s&]+)/g;
    let match;
    while ((match = youtubeLinkRegex.exec(message)) !== null) {
      const videoId = match[1];
      console.log('YouTube video ID found in message:', videoId);
      if (videoId) {
        addVideoToQueue(videoId, chatterName);
      }
    }
  }

  // Function to queue video IDs for batch processing
  function addVideoToQueue(videoId, chatterName) {
    if (!postedVideos[videoId]) {
      postedVideos[videoId] = { count: 1, chatters: [chatterName] };
      videoIdQueue.push(videoId);
    } else if (!postedVideos[videoId].chatters.includes(chatterName)) {
      postedVideos[videoId].chatters.push(chatterName);
      postedVideos[videoId].count++;
    }

    if (videoIdQueue.length >= 50) {
      // YouTube API supports up to 50 IDs per request
      batchProcessVideos();
    } else {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
      batchTimeout = setTimeout(() => {
        batchProcessVideos();
        batchTimeout = null;
      }, 500); // Reduced delay for quicker processing
    }
  }

  // Function to batch process video IDs
  function batchProcessVideos() {
    if (videoIdQueue.length === 0) return;

    const videoIds = [...videoIdQueue];  
    videoIdQueue = [];

    fetchBatchVideoData(videoIds).then((videos) => {
      if (videos) {
        videos.forEach(videoData => {
          addVideoCard(videoData);
        });
      } else {
        console.log("No video data returned."); // Debugging log
      }
    }).catch(error => {
      console.error("Error in batch processing videos:", error);
      videoIdQueue = [...videoIds];  // Restore the queue if fetch fails
    });
  }

  // Function to fetch video data from YouTube API
  async function fetchBatchVideoData(videoIds) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${youtubeApiKey}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API error:', errorData);
        throw new Error(`YouTube API error: ${errorData.error.message}`);
      }
      const data = await response.json();
      console.log("Fetched video data:", data);
      return data.items && data.items.length > 0 ? data.items : null;
    } catch (error) {
      console.error('Error fetching video data:', error);
      return null;
    }
  }

  // Function to add video card to the webpage
  function addVideoCard(videoData) {
    const videoId = videoData.id;
    const title = videoData.snippet.title;
    const thumbnailUrl = videoData.snippet.thumbnails.medium.url;
    const creator = videoData.snippet.channelTitle;
    const duration = formatDuration(videoData.contentDetails.duration);
    const viewCount = videoData.statistics.viewCount;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const videoCard = document.createElement('div');
    videoCard.classList.add('video-card');
    videoCard.setAttribute('data-video-id', videoId);

    const chatters = postedVideos[videoId].chatters.join(', ');
    const count = postedVideos[videoId].count;
    const chatNameBubble = `<div class="chatter-box">${chatters} (${count})</div>`;

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
      console.log("Adding video to grid:", videoData);
      videoGrid.appendChild(videoCard);
    } else {
      console.error('Video grid element not found');
    }
  }

  // Function to format YouTube video duration
  function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    let formattedTime = '';

    if (hours) {
      formattedTime += `${hours} hrs `;
    }

    if (minutes) {
      formattedTime += `${minutes} mins `;
    }

    if (seconds) {
      formattedTime += `${seconds} secs`;
    }

    return formattedTime.trim();
  }
});
