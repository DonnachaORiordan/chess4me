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
  pathNodes: [],    // the same moves, as tree nodes
  plan: [],         // the complete line chosen for this run (tree nodes), see chooseLine
  mode: "all",      // "all", "fromHere" or "lineOnly" (see startPractice)
  route: [],        // for "fromHere" and "lineOnly": the moves chosen in the explorer, e.g. ["e4", "e5"]
  timer: null,     // the waiting timer (app's move, or wrong move going back), if any
  helpedThisMove: false, // true once the user has made a mistake or had help on the current move
  hintThisMove: false    // true once a hint has been counted for the current move
};

// The last line practiced in each course (by course id), so the same line
// isn't practiced twice in a row. Remembered until the app is closed.
const lastLineByCourse = {};

// "Cover every line" (section 18.4 of SPEC.md): every complete line once, in random order.
const coverState = {
  lines: [],    // the lines still to do and done, in order, each as a list of moves, e.g. ["e4", "e5"]
  index: 0,     // which line is being practiced now (0 = the first)
  before: null  // the course's stats when covering started, to work out the summary at the end
};

// Starts practicing a course from the beginning (always from move 1).
// "mode" (optional) says which line the app plays:
//   "all" (or nothing)  - Practice all: a random line (section 18.2 of SPEC.md)
//   "fromHere"          - along "route", then random at any further splits (18.3)
//   "lineOnly"          - along "route", then the main line at every split (18.3)
//   "cover"             - one complete line ("route") of Cover every line (18.4; see startCover)
// "route" = the moves chosen in the explorer, e.g. ["e4", "e5", "Nf3"].
function startPractice(courseId, mode, route) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }

  stopPractice(); // cancel anything left over from a previous run
  practiceState.course = course;
  practiceState.mode = mode || "all";
  practiceState.route = route || [];
  practiceState.game = new Chess();
  practiceState.userColour = (course.colour === "white") ? "w" : "b";
  practiceState.nextMoves = course.moves;
  practiceState.played = [];
  practiceState.path = [];
  practiceState.pathNodes = [];

  // The line for this run. (If the route isn't in the course any more, start from the beginning.)
  const routeNodes = findRoute(course.moves, practiceState.route) || [];
  if (practiceState.mode === "lineOnly" || practiceState.mode === "cover") {
    practiceState.plan = routeThenMainLine(course.moves, routeNodes);
  } else {
    practiceState.plan = chooseLine(practiceState.mode === "fromHere" ? routeNodes : []);
  }

  // Count this as one more practice. (Filling in any missing stats with zeros first.)
  course.stats = Object.assign(makeEmptyStats(), course.stats);
  course.stats.timesPractised++;
  course.stats.lastPractised = new Date().toISOString();
  savePracticeStats();

  document.getElementById("practice-title").textContent = course.name;
  const progress = document.getElementById("practice-progress");
  progress.hidden = (practiceState.mode !== "cover");
  progress.textContent = "Line " + (coverState.index + 1) + " of " + coverState.lines.length;
  document.getElementById("practice-end").hidden = true;
  document.getElementById("practice-controls").hidden = false;
  showComment("practice-comment", "");
  renderPracticeMoveList();

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

// ===== Cover every line =====

// "Cover every line": shuffles all the course's complete lines into a random order,
// then practices them one after another (each one from move 1).
function startCover(courseId) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }

  const lines = getAllLines(course.moves).map(function (line) {
    return line.map(function (node) { return node.move; });
  });
  // Shuffle (the "Fisher-Yates" way: every order is equally likely).
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = lines[i];
    lines[i] = lines[j];
    lines[j] = swap;
  }

  coverState.lines = lines;
  coverState.index = 0;
  coverState.before = Object.assign(makeEmptyStats(), course.stats);
  startPractice(courseId, "cover", coverState.lines[0]);
}

// "Next line": practices the next line of Cover every line.
function nextCoverLine() {
  coverState.index++;
  startPractice(practiceState.course.id, "cover", coverState.lines[coverState.index]);
}

// The summary at the end of Cover every line, e.g. "All 7 lines covered. Accuracy 86% · 3 mistakes".
// Only counts this run-through (the stats now, minus the stats when it started).
function coverSummary() {
  const now = practiceState.course.stats;
  const before = coverState.before;
  const userMoves = now.userMoves - before.userMoves;
  const correct = now.correctFirstTry - before.correctFirstTry;
  const mistakes = now.mistakes - before.mistakes;
  const count = coverState.lines.length;

  const parts = [];
  if (userMoves > 0) parts.push("Accuracy " + Math.round(100 * correct / userMoves) + "%");
  parts.push(mistakes + (mistakes === 1 ? " mistake" : " mistakes"));
  return (count === 1 ? "The only line" : "All " + count + " lines") + " covered. " + parts.join(" · ");
}

// ===== Choosing a line =====

// Picks the complete line to practice, at random, from the lines that begin with
// "start" (the moves played so far, as tree nodes). Every complete line has the SAME
// chance, so short side lines aren't favoured. If there's more than one line,
// the line practiced last time isn't picked again straight away.
function chooseLine(start) {
  const courseId = practiceState.course.id;
  const lines = getAllLines(practiceState.course.moves, start);
  let choices = lines.filter(function (line) { return lineKey(line) !== lastLineByCourse[courseId]; });
  if (choices.length === 0) choices = lines; // only one line: it has to be that one

  const line = choices[Math.floor(Math.random() * choices.length)] || [];
  lastLineByCourse[courseId] = lineKey(line);
  return line;
}

// A line written as text, e.g. "e4 e5 Nf3", to tell lines apart.
function lineKey(line) {
  return line.map(function (node) { return node.move; }).join(" ");
}

// The move the chosen line plays next (a tree node).
function expectedNode() {
  return practiceState.plan[practiceState.pathNodes.length] || practiceState.nextMoves[0];
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

// The app plays the prepared move for the other colour, along the chosen line.
function playAppMove() {
  practiceState.timer = null;

  const node = expectedNode();
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
    if (!practiceState.helpedThisMove) {
      stats.correctFirstTry++;
      getNodeStats(stats, practiceState.path.concat(node.move).join(" ")).correctFirstTry++;
    }
    // If the course has more than one move for the user here (not normally the case),
    // pick a new line that goes through the move they chose.
    if (node !== expectedNode()) {
      practiceState.plan = chooseLine(practiceState.pathNodes.concat(node));
    }
    acceptMove(node, move); // (saves the stats)
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
// Counts the move's position as reached once more, and saves the stats.
function acceptMove(node, move) {
  practiceState.played.push(move.san);
  practiceState.path.push(node.move);
  practiceState.pathNodes.push(node);
  practiceState.nextMoves = node.children;
  getNodeStats(practiceState.course.stats, practiceState.path.join(" ")).reached++;
  savePracticeStats();
  clearHint();
  showMove(move);
  playSoundForMove(move);
  showComment("practice-comment", node.comment); // or hides the box if the move has no comment
  renderPracticeMoveList();
  continuePractice();
}

// The end of the line has been reached: the green tick pops up.
// If the line ended in checkmate, the skull beside the king (see board.js) shows instead.
// When covering every line: "Next line" continues, and after the last line a summary shows.
function finishPractice() {
  practiceState.course.stats.timesCompleted++;
  savePracticeStats();
  setBoardLocked(true);
  if (!practiceState.game.in_checkmate()) showSuccessTick();

  const covering = (practiceState.mode === "cover");
  const moreLines = covering && coverState.index < coverState.lines.length - 1;
  if (moreLines) {
    setPracticeStatus("End of line " + (coverState.index + 1) + " of " + coverState.lines.length + ". Well done!");
  } else if (covering) {
    setPracticeStatus(coverSummary());
  } else {
    setPracticeStatus("End of the line. Well done!");
  }
  document.getElementById("practice-next").hidden = !moreLines;
  document.getElementById("practice-restart").hidden = moreLines;
  document.getElementById("practice-controls").hidden = true;
  document.getElementById("practice-end").hidden = false;
}

// ===== Hint and Show move =====

// Finds the move the user should play next, as a chess.js move (with "from" and "to" squares).
// Returns null if there's no such move.
function getExpectedMove() {
  const node = expectedNode();
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
    getNodeStats(practiceState.course.stats, currentMoveKey()).hintsUsed++;
    savePracticeStats();
  }
}

// "Show move": plays the correct move for the user.
// Counts as a move shown, and as one of the user's moves (but not a correct one).
function showCorrectMove() {
  const node = expectedNode();
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
  getNodeStats(stats, currentMoveKey()).movesShown++;
  acceptMove(node, move); // (saves the stats)
}

// ===== Move list =====

// Shows the moves played so far. The user's moves are colour-coded by how well they're known
// (red to green, from the stats; see moveTintClass in app.js).
function renderPracticeMoveList() {
  const course = practiceState.course;
  renderMoveTree("practice-move-list", lineToTree(practiceState.played), {
    moveClass: function (path) {
      const ply = path.length - 1;
      const key = practiceState.path.slice(0, ply + 1).join(" ");
      return moveTintClass(course.stats, key, ply, course.colour);
    }
  });
}

// ===== Stats =====

// Saves the course's stats (see storage.js).
function savePracticeStats() {
  saveCourseStats(practiceState.course.id, practiceState.course.stats);
}

// Names the move the user is on, by the course moves leading up to and including it,
// e.g. "e4 e5 Nf3". Used to label each move's stats.
function currentMoveKey() {
  return practiceState.path.concat(expectedNode().move).join(" ");
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

// "← Back": return to the course explorer.
document.getElementById("practice-back").addEventListener("click", function () {
  stopPractice();
  showExplorer(practiceState.course.id);
});

// "Hint" and "Show move"
document.getElementById("practice-hint").addEventListener("click", giveHint);
document.getElementById("practice-show").addEventListener("click", showCorrectMove);

// "Restart": practice the same course again from the beginning, the same way (same mode and route).
// After covering every line, it covers every line again (in a new random order).
document.getElementById("practice-restart").addEventListener("click", function () {
  if (practiceState.mode === "cover") {
    startCover(practiceState.course.id);
  } else {
    startPractice(practiceState.course.id, practiceState.mode, practiceState.route);
  }
});

// "Next line" (Cover every line)
document.getElementById("practice-next").addEventListener("click", nextCoverLine);

// "Main menu"
document.getElementById("practice-menu").addEventListener("click", function () {
  stopPractice();
  showMainMenu();
});
