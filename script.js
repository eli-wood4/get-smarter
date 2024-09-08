const socket = io();

socket.on('newThumbnail', (url) => {
    fetch(`https://www.googleapis.com/youtube/v3/videos?id=${getVideoId(url)}&key=YOUR_API_KEY&part=snippet`)
        .then(response => response.json())
        .then(data => {
            const thumbnailUrl = data.items[0].snippet.thumbnails.medium.url;
            displayThumbnail(url, thumbnailUrl);
        });
});

function getVideoId(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v');
}

function displayThumbnail(videoUrl, thumbnailUrl) {
    const grid = document.getElementById('thumbnails-grid');
    const div = document.createElement('div');
    div.className = 'thumbnail';
    div.innerHTML = `<a href="${videoUrl}" target="_blank"><img src="${thumbnailUrl}" alt="Video Thumbnail"></a>`;
    grid.appendChild(div);
}
