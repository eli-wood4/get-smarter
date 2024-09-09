/* Reset some default styles */
body {
  margin: 0;
  font-family: Arial, sans-serif;
  display: flex;
  min-height: 100vh;
  overflow: hidden; /* Prevent scrolling on the body */
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 350px; /* Increased width for the sidebar */
  height: 100vh; /* Full viewport height */
  background: #77DD77; /* Background color for the sidebar */
  padding: 16px;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  z-index: 1000; /* Ensure the sidebar is on top of other content */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Prevent scrolling in the sidebar */
}

.sidebar h1 {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 52px; /* Increased font size */
  color: #1b331b;
  text-align: center;
  margin: 0;
  line-height: 1.2; /* Adjust line height for better vertical spacing */
}
.sidebar h2 {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 52px; /* Increased font size */
  color: #60b360;
  text-align: center;
  margin: 0;
  line-height: 1.2; /* Adjust line height for better vertical spacing */
  opacity: 0.8; /* Adjust this value for the desired transparency */
}
.sidebar h3 {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 52px; /* Increased font size */
  color: #60b360;
  text-align: center;
  margin: 0;
  line-height: 1.2; /* Adjust line height for better vertical spacing */
  opacity: 0.3; /* Adjust this value for the desired transparency */
}

#videoGrid {
  margin-left: 350px; /* Offset to make space for the wider fixed sidebar */
  width: calc(100vw - 350px); /* Adjust width to fit the remaining viewport */
  display: grid;
  grid-template-columns: repeat(4, minmax(300px, 1fr)); /* Adjust column size */
  gap: 16px; /* Space between grid items */
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto; /* Enable vertical scrolling if needed */
  height: 100vh; /* Ensure the grid takes up the full viewport height */
  position: relative; /* Allow scrolling within the grid */
}

.video-card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column; /* Stack image and info vertically */
  height: 400px; /* Adjust height as necessary */
}

.video-card img {
  width: 100%;    /* Image fills the width of its container */
  height: 250px;  /* Adjust the height for the image */
  object-fit: cover; /* Ensure the image covers the area without distortion */
}

.video-card .video-info {
  padding: 12px;
  flex-grow: 1; /* Allow content to grow and fill the available space */
}

.video-card h3 {
  font-size: 16px;  /* Increased font size for video title */
  margin: 0;
  white-space: nowrap; /* Prevent title from wrapping */
  overflow: hidden; /* Hide overflow text */
  text-overflow: ellipsis; /* Add ellipsis if title is too long */
}

.video-card .creator,
.video-card .length {
  font-size: 14px;  /* Font size for creator and length */
  color: #555;
}

.video-card:hover {
  transform: scale(1.06);
}
