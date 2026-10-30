// The course explorer: browsing a course (not being tested). Opened by tapping a course card.
// Shows the board, the whole move tree, comments and stats, and the buttons to practice, edit etc.

// What the explorer currently knows about.
const explorerState = {
  course: null,  // the course being explored
  path: [],      // the moves (tree nodes) from the start to the current move; [] = start position
  game: null     // the chess.js game showing the position after "path"
};

// Opens the explorer for a course, at the start position.
function showExplorer(courseId) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }
  explorerState.course = course;
  explorerState.path = [];
  explorerState.game = new Chess();

  // Title: course name, then its colour box.
  const title = document.getElementById("explorer-title");
  title.textContent = course.name + " ";
  title.appendChild(makeColourBox(course.colour));

  placeBoard(document.getElementById("explorer-board-area"));
  showExplorerBoard();
  updateExplorerView();
  showScreen("explorer-screen");
}

// Shows the current position on the board, with the user's colour at the bottom.
// The board is only for looking: taps on it do nothing.
function showExplorerBoard() {
  showGame(explorerState.game, { orientation: explorerState.course.colour });
  setBoardLocked(true);
}

// The current move (tree node), or null at the start position.
function currentExplorerNode() {
  const path = explorerState.path;
  return path.length > 0 ? path[path.length - 1] : null;
}

// The moves that can come next from the current position.
function currentExplorerChoices() {
  const node = currentExplorerNode();
  return node ? node.children : explorerState.course.moves;
}

// A position's name in the stats, e.g. "e4 e5 Nf3" (the moves leading to it, see storage.js).
function explorerKey(path) {
  return path.map(function (node) { return node.move; }).join(" ");
}

// ===== Moving around =====

// Tapping a move in the move list: jump to the position after it.
function jumpToExplorerMove(path) {
  explorerState.path = path.slice();
  explorerState.game = gameAfter(explorerState.path);
  showExplorerBoard();
  updateExplorerView();
}

// "«": back to the start position.
function explorerToStart() {
  jumpToExplorerMove([]);
}

// "‹": one move back.
function explorerBack() {
  if (explorerState.path.length === 0) return;
  explorerState.path.pop();
  const move = explorerState.game.undo();
  showMove(move, true); // the piece slides back
  playMoveSound();
  updateExplorerView();
}

// "›": one move forward. Where the line splits, it follows the main line.
function explorerForward() {
  const next = currentExplorerChoices()[0];
  if (!next) return;
  const move = explorerState.game.move(next.move);
  if (!move) return; // (a move that isn't legal here: shouldn't happen)
  explorerState.path.push(next);
  showMove(move);
  playSoundForMove(move);
  updateExplorerView();
}

// ===== Stats box =====

// Adds up the user's moves after a position (in all lines from there):
// how many were played, and how many of those were right first time.
// "choices" = the moves that can come next; "path" = the moves leading to them.
function countUserMovesAfter(choices, path, totals) {
  const stats = explorerState.course.stats;
  choices.forEach(function (node) {
    const nodePath = path.concat(node);
    const ply = nodePath.length - 1;
    const isUsersMove = (ply % 2 === 0) === (explorerState.course.colour === "white");
    const nodeStats = stats.nodes && stats.nodes[explorerKey(nodePath)];
    if (isUsersMove && nodeStats) {
      totals.played += nodeStats.reached;
      totals.correct += nodeStats.correctFirstTry;
    }
    countUserMovesAfter(node.children, nodePath, totals);
  });
  return totals;
}

// Fills in the small stats box for the current position (section 20.2 of SPEC.md).
function updateExplorerStats() {
  const course = explorerState.course;
  const stats = course.stats;
  const node = currentExplorerNode();
  const lines = [];

  // How often this position came up.
  if (!node) {
    const times = stats.timesPractised || 0;
    lines.push(times === 0 ? "Not practiced yet" : "Practiced " + times + (times === 1 ? " time" : " times"));
  } else {
    const nodeStats = (stats.nodes && stats.nodes[explorerKey(explorerState.path)]) || makeEmptyNodeStats();
    const reached = nodeStats.reached;
    lines.push(reached === 0 ? "Not reached in practice yet" : "Reached " + reached + (reached === 1 ? " time" : " times"));

    // The user's own move: mistakes, hints and moves shown on it.
    const ply = explorerState.path.length - 1;
    const isUsersMove = (ply % 2 === 0) === (course.colour === "white");
    if (isUsersMove && reached > 0) {
      lines.push("This move: " + pluralText(nodeStats.mistakes, "mistake") + " · " +
        pluralText(nodeStats.hintsUsed, "hint") + " · " + nodeStats.movesShown + " shown");
    }
  }

  // Accuracy of all the user's moves from here onwards.
  const totals = countUserMovesAfter(currentExplorerChoices(), explorerState.path, { played: 0, correct: 0 });
  if (totals.played > 0) {
    lines.push("Accuracy from here: " + Math.round(100 * totals.correct / totals.played) + "%");
  }

  const box = document.getElementById("explorer-stats");
  box.innerHTML = "";
  lines.forEach(function (text) {
    const line = document.createElement("div");
    line.textContent = text;
    box.appendChild(line);
  });
}

// e.g. pluralText(2, "mistake") = "2 mistakes", pluralText(1, "hint") = "1 hint"
function pluralText(number, word) {
  return number + " " + word + (number === 1 ? "" : "s");
}

// ===== Screen =====

// Updates everything around the board: arrows, comment, stats and the move list.
function updateExplorerView() {
  const course = explorerState.course;
  const node = currentExplorerNode();

  document.getElementById("explorer-start").disabled = (explorerState.path.length === 0);
  document.getElementById("explorer-prev").disabled = (explorerState.path.length === 0);
  document.getElementById("explorer-next").disabled = (currentExplorerChoices().length === 0);

  showComment("explorer-comment", node ? node.comment : "");
  updateExplorerStats();

  // The whole tree. Tapping a move jumps to it. The user's moves are colour-coded by accuracy.
  renderMoveTree("explorer-move-list", course.moves, {
    currentNode: node,
    onMoveTap: jumpToExplorerMove,
    moveClass: function (path) {
      return moveTintClass(course.stats, explorerKey(path), path.length - 1, course.colour);
    }
  });
}

// ===== Buttons on the explorer screen =====

// (Wrapped in a function, because showMainMenu is in app.js, which loads after this file.)
document.getElementById("explorer-back").addEventListener("click", function () {
  showMainMenu();
});
document.getElementById("explorer-start").addEventListener("click", explorerToStart);
document.getElementById("explorer-prev").addEventListener("click", explorerBack);
document.getElementById("explorer-next").addEventListener("click", explorerForward);

// The "chosen route": the moves from the start to the current move, e.g. ["e4", "e5", "Nf3"].
function explorerRoute() {
  return explorerState.path.map(function (node) { return node.move; });
}

// "Practice lines through here": from move 1, along the chosen route, then random at any further splits.
document.getElementById("explorer-from-here").addEventListener("click", function () {
  startPractice(explorerState.course.id, "fromHere", explorerRoute());
});

// "Practice this line only": from move 1, along the chosen route, then the main line to the end.
document.getElementById("explorer-line-only").addEventListener("click", function () {
  startPractice(explorerState.course.id, "lineOnly", explorerRoute());
});

// "Watch this line": watch mode along the chosen route, then the main line to the end.
document.getElementById("explorer-watch").addEventListener("click", function () {
  startWatch(explorerState.course.id, explorerRoute());
});

// "Practice all": practice the whole course, with random lines (see practice.js).
document.getElementById("explorer-practice").addEventListener("click", function () {
  startPractice(explorerState.course.id, "all");
});

// "Cover every line": every complete line once, in random order (see practice.js).
document.getElementById("explorer-cover").addEventListener("click", function () {
  startCover(explorerState.course.id);
});

// "Edit": open this course in the editor (see editor.js).
document.getElementById("explorer-edit").addEventListener("click", function () {
  startEditor(explorerState.course.id);
});

// "Delete": asks first, then deletes the course and returns to the main menu.
document.getElementById("explorer-delete").addEventListener("click", function () {
  const course = explorerState.course;
  askConfirm("Delete " + course.name + "? This can't be undone.", "Delete", function () {
    deleteCourse(course.id);
    showMainMenu();
  });
});
