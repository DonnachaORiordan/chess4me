// Starting point of the app: runs once the page has loaded.

// Show the app name (from config.js) in the browser tab and the heading.
document.title = APP_NAME;
document.getElementById("app-title").textContent = APP_NAME;

// Start a new chess game (chess.js) in the starting position, and show it on the board.
const game = new Chess();
setupBoard(document.getElementById("board"), game);
