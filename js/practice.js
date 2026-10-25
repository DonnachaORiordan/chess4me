// Practice mode: the user plays their colour's moves, and the app plays
// the prepared replies for the other colour.

// How long a wrong move stays on the board before going back, in milliseconds.
const WRONG_MOVE_SHOW_TIME = 800;

// What practice mode currently knows about.
const practiceState = {
  course: null,     // the course being practised
  game: null,       // the chess.js game for this practice run
  userColour: "w",  // "w" or "b": the colour the user plays
  nextMoves: [],    // the possible next moves in the course's move tree
  played: [],       // the moves played so far (e.g. ["e4", "e5"]), for the move list
  timer: null       // the waiting timer (app's move, or wrong move going back), if any
};

// Starts practising a course from the beginning.
function startPractice(courseId) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }

  stopPractice(); // cancel anything left over from a previous run
  practiceState.course = course;
  practiceState.game = new Chess();
  practiceState.userColour = (course.colour === "white") ? "w" : "b";
  practiceState.nextMoves = course.moves;
  practiceState.played = [];

  document.getElementById("practice-title").textContent = course.name;
  document.getElementById("practice-end").hidden = true;
  renderMoveList();

  // Show the board with the user's colour at the bottom.
  showGame(practiceState.game, {
    orientation: course.colour,
    playerColour: practiceState.userColour,
    onMove: handlePracticeMove
  });
  showScreen("practice-screen");

  continuePractice();
}

// Stops any waiting timer (e.g. when leaving practice mode).
function stopPractice() {
  if (practiceState.timer) {
    clearTimeout(practiceState.timer);
    practiceState.timer = null;
  }
}

// Decides what happens next: end of the line, the app's move, or the user's move.
function continuePractice() {
  if (practiceState.nextMoves.length === 0) {
    finishPractice();
    return;
  }

  const game = practiceState.game;
  if (game.turn() === practiceState.userColour) {
    setBoardLocked(false);
    setPracticeStatus("Your move.");
  } else {
    setBoardLocked(true);
    const appColour = (game.turn() === "w") ? "White" : "Black";
    setPracticeStatus("Waiting for " + appColour + "'s move…");
    practiceState.timer = setTimeout(playAppMove, MOVE_DELAY);
  }
}

// The app plays the prepared move for the other colour.
function playAppMove() {
  practiceState.timer = null;

  // Version 1 has only one prepared reply, so take the first.
  const node = practiceState.nextMoves[0];
  const move = practiceState.game.move(node.move);
  if (!move) {
    setPracticeStatus("This course has a move that isn't legal here: " + node.move);
    return;
  }
  acceptMove(node, move);
}

// Runs when the user taps a legal move on the board.
function handlePracticeMove(move) {
  const game = practiceState.game;

  // Is it one of the prepared moves?
  const node = practiceState.nextMoves.find(function (n) {
    return sameMove(n.move, move.san);
  });

  // Either way, the piece first goes to the square it was sent to.
  game.move({ from: move.from, to: move.to, promotion: move.promotion });

  if (node) {
    acceptMove(node, move);
    return;
  }

  // Wrong move: show it briefly, then take it back so the user can try again.
  setBoardLocked(true);
  setPracticeStatus("That's not the move in this course. Try again.");
  practiceState.timer = setTimeout(function () {
    practiceState.timer = null;
    game.undo();
    setBoardLocked(false);
  }, WRONG_MOVE_SHOW_TIME);
}

// Keeps a correct move (the user's or the app's) and moves on through the course.
function acceptMove(node, move) {
  practiceState.played.push(move.san);
  practiceState.nextMoves = node.children;
  updateBoard();
  renderMoveList();
  continuePractice();
}

// The end of the line has been reached.
function finishPractice() {
  setBoardLocked(true);
  setPracticeStatus("End of the line. Well done!");
  document.getElementById("practice-end").hidden = false;
}

// True if two moves are the same, ignoring check (+) and mate (#) signs.
// E.g. "Bb5+" and "Bb5" are treated as the same move.
function sameMove(a, b) {
  return a.replace(/[+#]/g, "") === b.replace(/[+#]/g, "");
}

// Shows a short message above the move list.
function setPracticeStatus(text) {
  document.getElementById("practice-status").textContent = text;
}

// Shows the moves played so far, e.g. "1. e4 e5  2. Nf3 Nc6".
function renderMoveList() {
  const list = document.getElementById("move-list");
  list.innerHTML = "";

  const played = practiceState.played;
  for (let i = 0; i < played.length; i += 2) {
    addMoveListCell(list, (i / 2 + 1) + ".", "move-number"); // move number
    addMoveListCell(list, played[i], "move");                // White's move
    addMoveListCell(list, played[i + 1] || "", "move");      // Black's move (if played yet)
  }
}

// Adds one piece of text to the move list grid.
function addMoveListCell(list, text, className) {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text;
  list.appendChild(cell);
}

// ===== Buttons on the practice screen =====

// "← Back": return to the course page.
document.getElementById("practice-back").addEventListener("click", function () {
  stopPractice();
  showCoursePage(practiceState.course.id);
});

// "Restart": practise the same course again from the beginning.
document.getElementById("practice-restart").addEventListener("click", function () {
  startPractice(practiceState.course.id);
});

// "Main menu"
document.getElementById("practice-menu").addEventListener("click", function () {
  stopPractice();
  showMainMenu();
});
