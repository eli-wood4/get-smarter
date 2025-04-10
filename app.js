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
  const twitchChannel = 'elibeelii';
  const twitchToken = '7l74an6bprhw760p0u0b6lwpeglkgh'; // Replace with your actual Twitch OAuth token
  const youtubeApiKey = 'AIzaSyC7iRz1c8WIPB5gUagvXf0ro-HxAXsGa7E'; // Replace with your actual YouTube API key

  // ===== IMPROVED VIDEO PROCESSING SYSTEM =====
  const postedVideos = {}; // Track posted videos
  let videoIdQueue = []; // Queue of video IDs to process
  let isProcessingBatch = false; // Flag to prevent concurrent batch processing
  let batchTimeout = null; // Timeout for batch processing
  
  // Maximum videos to store in memory (prevent indefinite growth)
  const MAX_STORED_VIDEOS = 2000; // Increased from 1000
  
  // Configurable batch processing parameters
  const MAX_BATCH_SIZE = 50; // YouTube API limit
  const BATCH_DELAY = 300; // Reduced from 500ms to process faster
  const MAX_RETRIES = 5; // Increased from 3 for more resilience
  const API_RATE_LIMIT = 500; // Minimum ms between API requests
  let lastAPIRequest = 0;

  // Initialize IndexedDB for persistent storage
  let db;
  const DB_NAME = 'twitchYoutubeDB';
  const STORE_NAME = 'postedVideos';

  function initDB() {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
      }
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB initialized');
      // Load existing videos from DB
      loadVideosFromDB();
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
    };
  }

  function saveVideoToDB(videoId, videoData) {
    if (!db) return;
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.put({
      videoId,
      data: videoData,
      timestamp: Date.now()
    });
  }

  function loadVideosFromDB() {
    if (!db) return;
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const videos = event.target.result;
      console.log(`Loaded ${videos.length} videos from DB`);
      
      // Process videos in batches to prevent UI blocking
      const processBatch = (index) => {
        const batch = videos.slice(index, index + 20);
        if (batch.length === 0) return;
        
        batch.forEach(video => {
          if (!postedVideos[video.videoId]) {
            postedVideos[video.videoId] = video.data;
            // Only display videos less than 24 hours old
            if (Date.now() - video.timestamp < 24 * 60 * 60 * 1000) {
              addVideoCard(video.data);
            }
          }
        });
        
        // Process next batch on next tick
        setTimeout(() => processBatch(index + 20), 0);
      };
      
      processBatch(0);
    };
  }

  // Initialize IndexedDB
  initDB();

  // URL cache for efficient duplicate detection
  const urlCache = new Set();
  const MAX_CACHE_SIZE = 20000;

  // Message queue for high volume processing
  const messageQueue = [];
  let isProcessingMessages = false;
  const MESSAGE_BATCH_SIZE = 100;

  // For reconnection logic
  let reconnectAttempts = 0;
  let ws;
  let lastMessagestamp = Date.now();
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const CONNECTION_OUT = 90000; // 90 seconds

  // Initialize WebSocket connection
  function initializeWebSocket() {
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv/');

    ws.onopen = () => {
      console.log("Connected to Twitch chat");
      reconnectAttempts = 0; // Reset reconnect counter on successful connection
      lastMessageTimestamp = Date.now(); // Reset heartbeat timer
      
      ws.send('PASS oauth:' + twitchToken);
      ws.send('NICK ' + twitchUsername);
      ws.send('JOIN #' + twitchChannel);

      // Regular ping to keep connection alive
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('PING :tmi.twitch.tv');
        }
      }, 5 * 60 * 1000); // Ping every 5 minutes
    };

    ws.onmessage = (message) => {
      lastMessageTimestamp = Date.now();
      
      if (message.data.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        return;
      }

      // Parse Twitch chat messages
      const regex = /:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/;
      const match = message.data.match(regex);

      if (match) {
        const chatterName = match[1];
        const chatMessage = match[2];
        queueMessage(chatMessage, chatterName);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('Connection closed.');
      // Implement exponential backoff reconnection
      const maxDelay = 30000; // Max 30 seconds
      const reconnectDelay = Math.min(maxDelay, 1000 * Math.pow(2, reconnectAttempts));
      reconnectAttempts++;
      
      console.log(`Attempting to reconnect in ${reconnectDelay}ms (attempt #${reconnectAttempts})...`);
      setTimeout(initializeWebSocket, reconnectDelay);
    };
  }

  // Start heartbeat monitoring
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    
    // Check if we've received any messages recently
    if (now - lastMessageTimestamp > CONNECTION_TIMEOUT) {
      console.warn(`No messages received for ${CONNECTION_TIMEOUT/1000} seconds, reconnecting...`);
      
      // Force reconnection
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else {
        // WebSocket already closed or closing, initialize directly
        initializeWebSocket();
      }
    } else {
      // Send ping if connected
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('PING :tmi.twitch.tv');
      }
    }
  }, HEARTBEAT_INTERVAL);

  // Initialize WebSocket connection
  initializeWebSocket();

  // Queue chat messages for processing
  function queueMessage(message, chatterName) {
    messageQueue.push({message, chatterName});
    if (!isProcessingMessages) {
      processMessageQueue();
    }
  }

  // Process queued messages in batches
  function processMessageQueue() {
    if (messageQueue.length === 0) {
      isProcessingMessages = false;
      return;
    }
    
    isProcessingMessages = true;
    const messagesToProcess = messageQueue.splice(0, MESSAGE_BATCH_SIZE);
    
    messagesToProcess.forEach(({message, chatterName}) => {
      processMessageForVideos(message, chatterName);
    });
    
    // Process next batch on next tick to prevent blocking UI
    setTimeout(processMessageQueue, 0);
  }

  // Extract and process YouTube links from chat messages
  function processMessageForVideos(message, chatterName) {
    // More efficient regex that specifically matches YouTube video IDs (11 chars)
    const youtubeLinkRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    
    // Extract all YouTube URLs from the message first
    const urls = [];
    let match;
    
    while ((match = youtubeLinkRegex.exec(message)) !== null) {
      const videoId = match[1];
      
      if (videoId && videoId.length === 11) { // Valid YouTube IDs are 11 chars
        // Check URL cache first before more expensive operations
        const cacheKey = `${videoId}-${chatterName}`;
        if (!urlCache.has(cacheKey)) {
          urlCache.add(cacheKey);
          urls.push({ videoId, chatterName });
        }
      }
    }
    
    // Process all valid URLs
    urls.forEach(({ videoId, chatterName }) => {
      addVideoToQueue(videoId, chatterName);
    });
    
    // Limit cache size
    if (urlCache.size > MAX_CACHE_SIZE) {
      // Clear oldest entries (simplified approach)
      const entriesToRemove = Array.from(urlCache).slice(0, MAX_CACHE_SIZE / 2);
      entriesToRemove.forEach(entry => urlCache.delete(entry));
    }
  }

  // Add video to processing queue
  function addVideoToQueue(videoId, chatterName) {
    // Check if we need to clean up old videos
    if (Object.keys(postedVideos).length >= MAX_STORED_VIDEOS) {
      cleanupOldVideos();
    }

    // Add or update video in tracking object
    if (!postedVideos[videoId]) {
      postedVideos[videoId] = { 
        count: 1, 
        chatters: [chatterName],
        timestamp: Date.now() // Track when video was first seen
      };
      videoIdQueue.push(videoId);
    } else if (!postedVideos[videoId].chatters.includes(chatterName)) {
      postedVideos[videoId].chatters.push(chatterName);
      postedVideos[videoId].count++;
    }

    // Schedule batch processing if not already scheduled
    if (!batchTimeout && !isProcessingBatch) {
      scheduleNextBatch();
    }
    
    // Process immediately if queue reaches maximum batch size
    if (videoIdQueue.length >= MAX_BATCH_SIZE && !isProcessingBatch) {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      processBatch();
    }
  }

  // Schedule the next batch processing
  function scheduleNextBatch() {
    if (!batchTimeout && videoIdQueue.length > 0 && !isProcessingBatch) {
      batchTimeout = setTimeout(() => {
        batchTimeout = null;
        processBatch();
      }, BATCH_DELAY);
    }
  }

  // Process a batch of videos
  function processBatch(retryIds = [], retryCount = 0) {
    // If already processing or queue is empty, exit
    if (isProcessingBatch || (videoIdQueue.length === 0 && retryIds.length === 0)) {
      return;
    }

    isProcessingBatch = true;
    
    // Determine which videos to process
    let videoIds;
    if (retryIds.length > 0) {
      // We're processing retry videos
      videoIds = retryIds;
    } else {
      // Take videos from the queue, up to the maximum batch size
      videoIds = videoIdQueue.splice(0, MAX_BATCH_SIZE);
    }

    // Fetch video data from YouTube API
    fetchVideoData(videoIds)
      .then(videos => {
        if (videos && videos.length > 0) {
          // Process successful videos
          videos.forEach(videoData => {
            addVideoCard(videoData);
            saveVideoToDB(videoData.id, videoData);
          });
          
          // Check for any missing videos (API didn't return them)
          const returnedIds = videos.map(v => v.id);
          const missingIds = videoIds.filter(id => !returnedIds.includes(id));
          
          if (missingIds.length > 0 && retryCount < MAX_RETRIES) {
            // Retry missing videos
            setTimeout(() => {
              isProcessingBatch = false;
              processBatch(missingIds, retryCount + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff
          } else {
            // All processed or giving up after max retries
            isProcessingBatch = false;
            scheduleNextBatch(); // Check if more videos need processing
          }
        } else {
          // No videos returned by API
          if (retryCount < MAX_RETRIES) {
            // Retry the entire batch
            setTimeout(() => {
              isProcessingBatch = false;
              processBatch(videoIds, retryCount + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff
          } else {
            // Give up after max retries
            isProcessingBatch = false;
            scheduleNextBatch(); // Check if more videos need processing
          }
        }
      })
      .catch(error => {
        console.error("Error in batch processing:", error);
        
        if (retryCount < MAX_RETRIES) {
          // Retry after a delay with exponential backoff
          const delay = 1000 * Math.pow(2, retryCount);
          
          setTimeout(() => {
            isProcessingBatch = false;
            processBatch(videoIds, retryCount + 1);
          }, delay);
        } else {
          // Give up after max retries
          isProcessingBatch = false;
          
          // Put videos back in queue if it was a system/network error
          if (error.name === 'NetworkError' || error.name === 'TypeError') {
            videoIdQueue.unshift(...videoIds);
          }
          
          scheduleNextBatch(); // Check if more videos need processing
        }
      });
  }

  // Fetch video data from YouTube API with rate limiting
  async function fetchVideoData(videoIds) {
    if (!videoIds || videoIds.length === 0) return [];
    
    // Split into smaller batches to avoid hitting YouTube API limits
    const MAX_IDS_PER_REQUEST = 50;
    const batches = [];
    
    for (let i = 0; i < videoIds.length; i += MAX_IDS_PER_REQUEST) {
      batches.push(videoIds.slice(i, i + MAX_IDS_PER_REQUEST));
    }
    
    // Process all batches with rate limiting
    let allItems = [];
    
    for (const batch of batches) {
      // Ensure we don't exceed rate limit
      const now = Date.now();
      const timeToWait = Math.max(0, API_RATE_LIMIT - (now - lastAPIRequest));
      
      if (timeToWait > 0) {
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
      
      lastAPIRequest = Date.now();
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${batch.join(',')}&key=${youtubeApiKey}`;
      
      try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // Handle quota exceeded errors with longer backoff
          if (response.status === 403 && errorData.error?.errors?.some(e => e.reason === 'quotaExceeded')) {
            console.error('YouTube API quota exceeded, waiting longer before retry');
            lastAPIRequest = Date.now() + 60000; // Add a minute to enforce longer wait
            throw new Error('YouTube API quota exceeded');
          }
          
          throw new Error(`YouTube API error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          allItems = allItems.concat(data.items);
        }
      } catch (error) {
        console.error('Error fetching batch:', error);
        throw error;
      }
    }
    
    return allItems;
  }

  // Clean up old videos to prevent memory issues
  function cleanupOldVideos() {
    // Get all video IDs sorted by timestamp (oldest first)
    const videoEntries = Object.entries(postedVideos)
      .map(([id, data]) => ({ id, timestamp: data.timestamp || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove the oldest 20% of videos
    const removeCount = Math.floor(videoEntries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      delete postedVideos[videoEntries[i].id];
    }
  }

  // Setup intersection observer for lazy loading
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const videoCard = entry.target;
        const imgElement = videoCard.querySelector('img[data-src]');
        
        if (imgElement) {
          imgElement.src = imgElement.dataset.src;
          imgElement.removeAttribute('data-src');
        }
        
        // Stop observing once loaded
        videoObserver.unobserve(videoCard);
      }
    });
  }, {
    rootMargin: '200px 0px', // Load images 200px before they come into view
    threshold: 0.01
  });

  // Add video card to the webpage with lazy loading
  function addVideoCard(videoData) {
    const videoId = videoData.id;
    
    // Skip if video doesn't exist in our tracking or element already exists
    if (!postedVideos[videoId] || document.querySelector(`.video-card[data-video-id="${videoId}"]`)) {
      return;
    }
    
    const title = videoData.snippet.title;
    const thumbnailUrl = videoData.snippet.thumbnails.medium?.url || 
                        videoData.snippet.thumbnails.default?.url;
    const creator = videoData.snippet.channelTitle;
    const duration = formatDuration(videoData.contentDetails.duration);
    const viewCount = videoData.statistics.viewCount || '0';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const videoCard = document.createElement('div');
    videoCard.classList.add('video-card');
    videoCard.setAttribute('data-video-id', videoId);

    // Join chatters with commas, limit to first 3 if there are many
    let chatters = postedVideos[videoId].chatters;
    let chatterDisplay = chatters.length <= 3 
      ? chatters.join(', ') 
      : `${chatters.slice(0, 3).join(', ')} +${chatters.length - 3} more`;
    
    const count = postedVideos[videoId].count;
    const chatNameBubble = `<div class="chatter-box">${chatterDisplay} (${count})</div>`;

    videoCard.innerHTML = `
      <div class="thumbnail-container">
        ${chatNameBubble}
        <a href="${videoUrl}" target="_blank">
          <img data-src="${thumbnailUrl}" alt="${title}" loading="lazy">
          <span class="duration-badge">${duration}</span>
        </a>
      </div>
      <div class="video-info">
        <h3>${truncateText(title, 60)}</h3>
        <p class="creator"><b>${creator}</b></p>
        <p class="views">${Number(viewCount).toLocaleString()} views</p>
      </div>
    `;

    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
      // Add to the beginning for newest videos on top
      if (videoGrid.firstChild) {
        videoGrid.insertBefore(videoCard, videoGrid.firstChild);
      } else {
        videoGrid.appendChild(videoCard);
      }
      
      // Add a subtle animation
      setTimeout(() => {
        videoCard.classList.add('visible');
      }, 10);
      
      // Start observing the new card for lazy loading
      videoObserver.observe(videoCard);
      
      // Limit total visible videos to improve performance
      const MAX_VISIBLE_VIDEOS = 150;
      const currentCards = document.querySelectorAll('.video-card');
      
      if (currentCards.length > MAX_VISIBLE_VIDEOS) {
        // Remove excess videos from DOM but keep them in memory/DB
        for (let i = MAX_VISIBLE_VIDEOS; i < currentCards.length; i++) {
          currentCards[i].remove();
        }
      }
    }
}
  // Helper function to truncate text
  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  // Function to format YouTube video duration
  function formatDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '';
    
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    if (hours) {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    } else if (minutes) {
      return `${minutes}:${seconds.padStart(2, '0')}`;
    } else if (seconds) {
      return `0:${seconds.padStart(2, '0')}`;
    }
    
    return '';
  }
});
