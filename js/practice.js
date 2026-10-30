// Practice mode: the user plays their colour's moves, and the app plays
// the prepared replies for the other colour.

// How long a wrong move stays on the board before going back, in milliseconds.
const WRONG_MOVE_SHOW_TIME = 1000;

// What practice mode currently knows about.
const practiceState = {
  course: null,     // the course being practiced
  game: null,       // the chess.js game for this practice run
  userColour: "w",  // "w" or "b": the colour the user plays
  nextMoves: [],    // the possible next moves in the course's move tree
  played: [],       // the moves played so far (e.g. ["e4", "e5"]), for the move list
  path: [],         // the same moves, written as in the course (used to name moves in the stats)
  timer: null,      // the waiting timer (app's move, or wrong move going back), if any
  helpedThisMove: false, // true once the user has made a mistake or had help on the current move
  hintThisMove: false    // true once a hint has been counted for the current move
};

// Starts practicing a course from the beginning.
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
  practiceState.path = [];

  // Count this as one more practice. (Filling in any missing stats with zeros first.)
  course.stats = Object.assign(makeEmptyStats(), course.stats);
  course.stats.timesPractised++;
  course.stats.lastPractised = new Date().toISOString();
  savePracticeStats();

  document.getElementById("practice-title").textContent = course.name;
  document.getElementById("practice-end").hidden = true;
  document.getElementById("practice-controls").hidden = false;
  showComment("practice-comment", "");
  renderMoveList("practice-move-list", practiceState.played);

  // Show the board with the user's colour at the bottom.
  placeBoard(document.getElementById("practice-board-area"));
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
  // Checkmate ends the game, even if the course somehow had more moves after it.
  if (practiceState.nextMoves.length === 0 || practiceState.game.in_checkmate()) {
    finishPractice();
    return;
  }

  const game = practiceState.game;
  if (game.turn() === practiceState.userColour) {
    // A new move for the user: no mistakes or help on it yet.
    practiceState.helpedThisMove = false;
    practiceState.hintThisMove = false;
    setBoardLocked(false);
    setHelpButtonsEnabled(true);
    setPracticeStatus("Your move.");
  } else {
    setBoardLocked(true);
    setHelpButtonsEnabled(false);
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

  const stats = practiceState.course.stats;
  if (node) {
    // Correct. It only counts towards accuracy if there was no mistake or help on this move.
    stats.userMoves++;
    if (!practiceState.helpedThisMove) stats.correctFirstTry++;
    savePracticeStats();
    acceptMove(node, move);
    return;
  }

  // Wrong: count the mistake, overall and for this particular move (its position's stats, see storage.js).
  stats.mistakes++;
  getNodeStats(stats, currentMoveKey()).mistakes++;
  practiceState.helpedThisMove = true;
  savePracticeStats();

  // Wrong move: the piece slides there, the red X pops up and the "incorrect" sound plays.
  // After a moment, the piece slides back so the user can try again.
  showMove(move);
  showWrongMark(move.to);
  playIncorrectSound();
  setBoardLocked(true);
  setHelpButtonsEnabled(false);
  setPracticeStatus("That's not the move in this course. Try again.");
  practiceState.timer = setTimeout(function () {
    practiceState.timer = null;
    game.undo();
    clearWrongMarks();
    showMove(move, true); // slide back
    setBoardLocked(false);
    setHelpButtonsEnabled(true);
  }, WRONG_MOVE_SHOW_TIME);
}

// Keeps a correct move (the user's or the app's) and moves on through the course.
function acceptMove(node, move) {
  practiceState.played.push(move.san);
  practiceState.path.push(node.move);
  practiceState.nextMoves = node.children;
  clearHint();
  showMove(move);
  playSoundForMove(move);
  showComment("practice-comment", node.comment); // or hides the box if the move has no comment
  renderMoveList("practice-move-list", practiceState.played);
  continuePractice();
}

// The end of the line has been reached: the green tick pops up.
// If the line ended in checkmate, the skull beside the king (see board.js) shows instead.
function finishPractice() {
  practiceState.course.stats.timesCompleted++;
  savePracticeStats();
  setBoardLocked(true);
  if (!practiceState.game.in_checkmate()) showSuccessTick();
  setPracticeStatus("End of the line. Well done!");
  document.getElementById("practice-controls").hidden = true;
  document.getElementById("practice-end").hidden = false;
}

// ===== Hint and Show move =====

// Finds the move the user should play next, as a chess.js move (with "from" and "to" squares).
// Returns null if there's no such move.
function getExpectedMove() {
  // Version 1 has only one prepared move at each point, so take the first.
  const node = practiceState.nextMoves[0];
  if (!node) return null;
  const legalMoves = practiceState.game.moves({ verbose: true });
  return legalMoves.find(function (m) { return sameMove(node.move, m.san); }) || null;
}

// "Hint": highlights the piece the user should move.
// Counts as one hint used per move, however many times it's pressed.
function giveHint() {
  const move = getExpectedMove();
  if (!move) return;
  showHint(move.from);

  if (!practiceState.hintThisMove) {
    practiceState.hintThisMove = true;
    practiceState.helpedThisMove = true;
    practiceState.course.stats.hintsUsed++;
    savePracticeStats();
  }
}

// "Show move": plays the correct move for the user.
// Counts as a move shown, and as one of the user's moves (but not a correct one).
function showCorrectMove() {
  const node = practiceState.nextMoves[0];
  if (!node) return;
  setBoardLocked(true); // drops any piece the user had selected
  const move = practiceState.game.move(node.move);
  if (!move) {
    setPracticeStatus("This course has a move that isn't legal here: " + node.move);
    return;
  }

  const stats = practiceState.course.stats;
  stats.movesShown++;
  stats.userMoves++;
  savePracticeStats();
  acceptMove(node, move);
}

// ===== Stats =====

// Saves the course's stats (see storage.js).
function savePracticeStats() {
  saveCourseStats(practiceState.course.id, practiceState.course.stats);
}

// Names the move the user is on, by the course moves leading up to and including it,
// e.g. "e4 e5 Nf3". Used to label each move's stats.
function currentMoveKey() {
  // Version 1 has only one prepared move at each point, so take the first.
  return practiceState.path.concat(practiceState.nextMoves[0].move).join(" ");
}

// Makes the Hint and Show move buttons usable (true) or greyed out (false).
function setHelpButtonsEnabled(enabled) {
  document.getElementById("practice-hint").disabled = !enabled;
  document.getElementById("practice-show").disabled = !enabled;
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

// ===== Buttons on the practice screen =====

// "← Back": return to the course page.
document.getElementById("practice-back").addEventListener("click", function () {
  stopPractice();
  showCoursePage(practiceState.course.id);
});

// "Hint" and "Show move"
document.getElementById("practice-hint").addEventListener("click", giveHint);
document.getElementById("practice-show").addEventListener("click", showCorrectMove);

// "Restart": practice the same course again from the beginning.
document.getElementById("practice-restart").addEventListener("click", function () {
  startPractice(practiceState.course.id);
});

// "Main menu"
document.getElementById("practice-menu").addEventListener("click", function () {
  stopPractice();
  showMainMenu();
});
