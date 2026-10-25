// Drawing the chessboard and handling taps on it.

// Column letters, left to right (from White's side).
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Full piece names, used as the images' alt text (for screen readers).
const PIECE_NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

// How long a piece takes to slide from one square to another, in milliseconds.
const SLIDE_TIME = 200;

// Pictures drawn in code (SVG): a red circle with a white X, and a green circle with a white tick.
const WRONG_ICON =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#d64545"/>' +
  '<path d="M8 8 L16 16 M16 8 L8 16" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>';
const TICK_ICON =
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#3f9d4f"/>' +
  '<path d="M6.5 12.5 L10.5 16.5 L17.5 8.5" stroke="white" stroke-width="3" fill="none" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

// What the board currently knows about.
const boardState = {
  element: null,       // the #board element on the page
  game: null,          // the chess.js game (knows the position and the rules)
  selected: null,      // the square of the piece the user has tapped, e.g. "e2", or null
  orientation: "white", // which colour is shown at the bottom
  playerColour: null,  // "w" or "b": only this side's pieces can be tapped (null = either side)
  locked: false,       // true = taps are ignored (e.g. while the app is about to move)
  onMove: null         // function called when the user taps a legal move
};

// Draws an empty 8x8 board inside the given element, with the given
// colour ("white" or "black") at the bottom.
function drawBoard(boardElement, orientation) {
  boardElement.innerHTML = ""; // clear anything already there

  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      // With White at the bottom, the top row is rank 8 and the left column is "a".
      // With Black at the bottom, it's the other way round.
      const rank = (orientation === "white") ? 8 - row : row + 1;
      const fileIndex = (orientation === "white") ? column : 7 - column;

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

// Runs once when the app starts: remembers the board element and listens for taps.
function setupBoard(boardElement) {
  boardState.element = boardElement;
  boardElement.addEventListener("click", handleBoardTap);
}

// Moves the board onto a different screen: puts it at the top of the given element.
// (There is only one board; practice and watch mode each move it into their own screen.)
function placeBoard(container) {
  container.prepend(boardState.element);
}

// Shows a chess.js game on the board.
// options.orientation:  "white" or "black" (the colour at the bottom)
// options.playerColour: "w" or "b" (the only side the user may move), or null
// options.onMove:       function(move) called when the user taps a legal move.
//                       The board doesn't make the move itself: onMove decides.
function showGame(game, options) {
  boardState.game = game;
  boardState.orientation = options.orientation || "white";
  boardState.playerColour = options.playerColour || null;
  boardState.onMove = options.onMove || null;
  boardState.selected = null;
  boardState.locked = false;

  drawBoard(boardState.element, boardState.orientation);
  updateBoard();
}

// Locks the board (taps ignored) or unlocks it.
function setBoardLocked(locked) {
  boardState.locked = locked;
  if (locked) boardState.selected = null; // drop any half-made selection
  updateBoard();
}

// Redraws the pieces, the selected-square highlight and the legal-move dots,
// to match the game's current position.
function updateBoard() {
  const game = boardState.game;
  if (!game) return;

  // Legal moves of the selected piece (empty list if nothing is selected).
  const legalMoves = boardState.selected
    ? game.moves({ square: boardState.selected, verbose: true })
    : [];

  const squares = boardState.element.querySelectorAll("[data-square]");
  squares.forEach(function (square) {
    const name = square.dataset.square;

    // Remove the old markers.
    square.classList.remove("selected", "move-target", "capture-target");

    // Update the piece image, but only if the piece on this square has changed.
    // (Leaving unchanged pieces alone means a piece that is sliding keeps sliding.)
    const piece = game.get(name); // e.g. { type: "n", color: "w" } or null
    const wanted = piece ? piece.color + piece.type.toUpperCase() : ""; // e.g. "wN"
    const oldImg = square.querySelector(".piece");
    const current = oldImg ? oldImg.dataset.piece : "";
    if (wanted !== current) {
      if (oldImg) oldImg.remove();
      if (piece) {
        const img = document.createElement("img");
        img.src = "assets/pieces/" + wanted + ".svg";
        img.alt = (piece.color === "w" ? "white " : "black ") + PIECE_NAMES[piece.type];
        img.className = "piece";
        img.dataset.piece = wanted;
        img.draggable = false;
        square.appendChild(img);
      }
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

// ===== Animations and pop-ups =====

// Finds a square's element on the page by its name, e.g. "e4".
function getSquareElement(name) {
  return boardState.element.querySelector('[data-square="' + name + '"]');
}

// Shows a move that has just been made in the game, with the piece sliding into place.
// If "backwards" is true, shows a move that has just been taken back (undone),
// with the piece sliding back to where it came from.
function showMove(move, backwards) {
  updateBoard(); // first put every piece in its new place

  // Then make the moved piece look as if it starts from its old square and slides over.
  const start = backwards ? move.to : move.from;
  const end = backwards ? move.from : move.to;
  slidePiece(start, end);

  // Castling also moves a rook. Flags: "k" = kingside castling, "q" = queenside castling.
  const rank = (move.color === "w") ? "1" : "8";
  if (move.flags.includes("k")) {
    slidePiece(backwards ? "f" + rank : "h" + rank, backwards ? "h" + rank : "f" + rank);
  } else if (move.flags.includes("q")) {
    slidePiece(backwards ? "d" + rank : "a" + rank, backwards ? "a" + rank : "d" + rank);
  }
}

// Slides the piece that is now on square "to", so it appears to travel from square "from".
function slidePiece(from, to) {
  const img = getSquareElement(to).querySelector(".piece");
  if (!img) return;

  // How far apart the two squares are on screen, in pixels.
  const fromBox = getSquareElement(from).getBoundingClientRect();
  const toBox = getSquareElement(to).getBoundingClientRect();
  const dx = fromBox.left - toBox.left;
  const dy = fromBox.top - toBox.top;

  // Jump the piece (with no animation) back to the start square...
  img.classList.add("sliding"); // keeps it above other pieces while it moves
  img.style.transition = "none";
  img.style.transform = "translate(" + dx + "px, " + dy + "px)";
  img.getBoundingClientRect(); // makes the browser draw it there before continuing

  // ...then let it slide smoothly to its real place.
  img.style.transition = "transform " + SLIDE_TIME + "ms ease-out";
  img.style.transform = "";
  setTimeout(function () { img.classList.remove("sliding"); }, SLIDE_TIME);
}

// Pops up the red X on a square (for a wrong move).
function showWrongMark(squareName) {
  const mark = document.createElement("div");
  mark.className = "wrong-mark";
  mark.innerHTML = WRONG_ICON;
  getSquareElement(squareName).appendChild(mark);
}

// Removes any red X from the board.
function clearWrongMarks() {
  boardState.element.querySelectorAll(".wrong-mark").forEach(function (mark) {
    mark.remove();
  });
}

// Highlights the square of the piece the user should move (the Hint button).
// The highlight stays until clearHint() is called (or the board is next drawn).
function showHint(squareName) {
  clearHint();
  getSquareElement(squareName).classList.add("hint");
}

// Removes the hint highlight.
function clearHint() {
  boardState.element.querySelectorAll(".hint").forEach(function (square) {
    square.classList.remove("hint");
  });
}

// Pops up the green tick in the middle of the board (end of the line).
// It disappears when the board is next drawn (e.g. on Restart).
function showSuccessTick() {
  const tick = document.createElement("div");
  tick.className = "success-tick";
  tick.innerHTML = TICK_ICON;
  boardState.element.appendChild(tick);
}

// ===== Taps =====

// Runs whenever the user taps (or clicks) anywhere on the board.
function handleBoardTap(event) {
  if (boardState.locked || !boardState.game) return;

  // Find which square was tapped (the tap may land on the piece image inside it).
  const square = event.target.closest("[data-square]");
  if (!square) return;
  const tapped = square.dataset.square;

  const game = boardState.game;
  const selected = boardState.selected;

  // 1. A piece is selected and the tapped square is one of its legal moves:
  //    hand the move to onMove, which decides what happens.
  if (selected) {
    const move = game.moves({ square: selected, verbose: true }).find(function (m) {
      // Promotion always picks a queen for now (the proper choice comes in a later step).
      return m.to === tapped && (!m.promotion || m.promotion === "q");
    });
    if (move) {
      boardState.selected = null;
      updateBoard();
      if (boardState.onMove) boardState.onMove(move);
      return;
    }
  }

  // 2. The tapped square has one of the user's pieces, and it's their turn.
  const piece = game.get(tapped);
  const isUsersPiece = piece && piece.color === game.turn() &&
    (!boardState.playerColour || piece.color === boardState.playerColour);
  if (isUsersPiece) {
    // Tapping the selected piece again deselects it; otherwise select the new piece.
    boardState.selected = (tapped === selected) ? null : tapped;
  } else {
    // 3. Anything else (an empty square or an illegal move): just clear the selection.
    boardState.selected = null;
  }
  updateBoard();
}
