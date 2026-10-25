// Drawing the chessboard and handling taps on it.

// Column letters, left to right (from White's side).
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Full piece names, used as the images' alt text (for screen readers).
const PIECE_NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

// What the board currently knows about.
const boardState = {
  element: null,  // the #board element on the page
  game: null,     // the chess.js game (knows the position and the rules)
  selected: null  // the square of the piece the user has tapped, e.g. "e2", or null
};

// Draws an empty 8x8 board inside the given element.
// White is at the bottom, so row 8 is drawn first (top) and row 1 last (bottom).
function drawBoard(boardElement) {
  boardElement.innerHTML = ""; // clear anything already there

  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const square = document.createElement("div");

      // a1 is a dark square. With columns counted from 0 (a = 0, b = 1 ...),
      // a square is light when (column + row) is even. E.g. a1: 0 + 1 = 1, odd, so dark.
      const isLight = (fileIndex + rank) % 2 === 0;
      square.className = isLight ? "square-light" : "square-dark";

      // Remember the square's name (e.g. "e4") so taps know which square they hit.
      square.dataset.square = FILES[fileIndex] + rank;

      boardElement.appendChild(square);
    }
  }
}

// Sets up the board for a chess.js game: draws it, shows the pieces,
// and starts listening for taps.
function setupBoard(boardElement, game) {
  boardState.element = boardElement;
  boardState.game = game;
  boardState.selected = null;

  drawBoard(boardElement);
  boardElement.addEventListener("click", handleBoardTap);
  updateBoard();
}

// Redraws the pieces, the selected-square highlight and the legal-move dots,
// to match the game's current position.
function updateBoard() {
  const game = boardState.game;

  // Legal moves of the selected piece (empty list if nothing is selected).
  const legalMoves = boardState.selected
    ? game.moves({ square: boardState.selected, verbose: true })
    : [];

  const squares = boardState.element.querySelectorAll("[data-square]");
  squares.forEach(function (square) {
    const name = square.dataset.square;

    // Remove the old piece image and markers.
    square.innerHTML = "";
    square.classList.remove("selected", "move-target", "capture-target");

    // Add the piece image, if there is a piece on this square.
    const piece = game.get(name); // e.g. { type: "n", color: "w" } or null
    if (piece) {
      const img = document.createElement("img");
      img.src = "assets/pieces/" + piece.color + piece.type.toUpperCase() + ".svg";
      img.alt = (piece.color === "w" ? "white " : "black ") + PIECE_NAMES[piece.type];
      img.className = "piece";
      img.draggable = false;
      square.appendChild(img);
    }

    // Highlight the selected piece's square.
    if (name === boardState.selected) {
      square.classList.add("selected");
    }

    // Show a dot (or a ring, for a capture) where the selected piece can move.
    const move = legalMoves.find(function (m) { return m.to === name; });
    if (move) {
      // Flags "c" (capture) and "e" (en passant capture) mean a piece is taken.
      const isCapture = move.flags.includes("c") || move.flags.includes("e");
      square.classList.add(isCapture ? "capture-target" : "move-target");
    }
  });
}

// Runs whenever the user taps (or clicks) anywhere on the board.
function handleBoardTap(event) {
  // Find which square was tapped (the tap may land on the piece image inside it).
  const square = event.target.closest("[data-square]");
  if (!square) return;
  const tapped = square.dataset.square;

  const game = boardState.game;
  const selected = boardState.selected;

  // 1. A piece is selected and the tapped square is one of its legal moves: move it.
  if (selected) {
    // Promotion always picks a queen for now (the proper choice comes in a later step).
    const move = game.move({ from: selected, to: tapped, promotion: "q" });
    if (move) {
      boardState.selected = null;
      updateBoard();
      return;
    }
  }

  // 2. The tapped square has a piece of the side whose turn it is.
  const piece = game.get(tapped);
  if (piece && piece.color === game.turn()) {
    // Tapping the selected piece again deselects it; otherwise select the new piece.
    boardState.selected = (tapped === selected) ? null : tapped;
  } else {
    // 3. Anything else (an empty square or an illegal move): just clear the selection.
    boardState.selected = null;
  }
  updateBoard();
}
