document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('darkModeToggle');
  const mainHeading = document.querySelector('.sidebar h1'); 
  const lightModeVideo = document.querySelector('.light-mode-video');
  const darkModeVideo = document.querySelector('.dark-mode-video');

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

  const twitchUsername = 'elibeelii';
  const twitchChannel = 'atrioc';
  const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh';
  const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E';
  const postedVideos = {};
  let videoIdQueue = [];
  let batchTimeout = null;

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

  async function fetchBatchVideoData(videoIds) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${youtubeApiKey}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("Fetched video data:", data);  // Debug log
      return data.items && data.items.length > 0 ? data.items : null;
    } catch (error) {
      console.error('Error fetching video data:', error);
      return null;
    }
  }

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

  function addVideoToQueue(videoId, chatterName) {
    if (!postedVideos[videoId]) {
      postedVideos[videoId] = { count: 1, chatters: [chatterName] };
      videoIdQueue.push(videoId);
    } else if (!postedVideos[videoId].chatters.includes(chatterName)) {
      postedVideos[videoId].chatters.push(chatterName);
      postedVideos[videoId].count++;
    }

    if (!batchTimeout) {
      batchTimeout = setTimeout(() => {
        batchProcessVideos();
        batchTimeout = null;
      }, 1000); 
    }
  }

  function displayChatMessage(message, chatterName) {
    const youtubeLinkRegex = /(https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/;
    const youtubeLinkMatch = message.match(youtubeLinkRegex);
    
    if (youtubeLinkMatch) {
      const youtubeLink = youtubeLinkMatch[0];
      console.log('YouTube link found in message:', youtubeLink);
      const videoId = getVideoId(youtubeLink);
      if (videoId) {
        addVideoToQueue(videoId, chatterName);
      }
    } else {
      console.log('No YouTube link found in message:', message);
    }
  }

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

    const chatNameBubble = `<div class="chatter-box">${postedVideos[videoId].chatters[0]} (+${postedVideos[videoId].count})</div>`;

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
      console.log("Adding video to grid:", videoData);  // Debugging log
      videoGrid.appendChild(videoCard);
    } else {
      console.error('Video grid element not found');
    }
  }

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
