// Starting point of the app: runs once the page has loaded.

// Show the app name (from config.js) in the browser tab and the heading.
document.title = APP_NAME;
document.getElementById("app-title").textContent = APP_NAME;

// Draw the empty board.
drawBoard(document.getElementById("board"));
