// Drawing the chessboard.

// Column letters, left to right (from White's side).
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Draws an empty 8x8 board inside the given element.
// White is at the bottom, so row 8 is drawn first (top) and row 1 last (bottom).
function drawBoard(boardElement) {
  boardElement.innerHTML = ""; // clear anything already there

  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const square = document.createElement("div");

      // a1 is a dark square. A square is light when (column + row) is odd.
      const isLight = (fileIndex + rank) % 2 === 1;
      square.className = isLight ? "square-light" : "square-dark";

      // Remember the square's name (e.g. "e4") for later steps.
      square.dataset.square = FILES[fileIndex] + rank;

      boardElement.appendChild(square);
    }
  }
}
