// Watch mode: plays through a course's line (both colours), automatically
// or one move at a time with the forward and back buttons.

// What watch mode currently knows about.
const watchState = {
  course: null,   // the course being watched
  game: null,     // the chess.js game showing the current position
  line: [],       // the course's moves in order, as move-tree nodes
  index: 0,       // how many moves of the line have been played so far
  playing: false, // true while playing automatically
  timer: null     // the timer for the next automatic move, if any
};

// Starts watching a course from the beginning.
function startWatch(courseId) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }

  pauseWatch(); // cancel anything left over from before
  watchState.course = course;
  watchState.line = getMainLine(course.moves);
  document.getElementById("watch-title").textContent = course.name;

  placeBoard(document.getElementById("watch-board-area"));
  resetWatchPosition();
  showScreen("watch-screen");
}

// Goes back to the starting position (without changing whether it's playing).
function resetWatchPosition() {
  watchState.game = new Chess();
  watchState.index = 0;
  showGame(watchState.game, { orientation: watchState.course.colour });
  setBoardLocked(true); // the board is only for watching: taps do nothing
  updateWatchView();
}

// Plays the next move of the line, if there is one.
function watchForward() {
  if (watchState.index >= watchState.line.length) return;

  const node = watchState.line[watchState.index];
  const move = watchState.game.move(node.move);
  if (!move) {
    pauseWatch();
    document.getElementById("watch-status").textContent =
      "This course has a move that isn't legal here: " + node.move;
    return;
  }
  watchState.index++;
  showMove(move);
  playMoveSound();
  updateWatchView();
}

// Takes back the last move played, if there is one.
function watchBack() {
  if (watchState.index === 0) return;

  const move = watchState.game.undo();
  watchState.index--;
  showMove(move, true); // the piece slides back
  playMoveSound();
  updateWatchView();
}

// ===== Automatic play =====

// Starts playing automatically. At the end of the line, starts again from the beginning.
function playWatch() {
  if (watchState.index >= watchState.line.length) {
    resetWatchPosition();
  }
  watchState.playing = true;
  autoPlayStep();
}

// Plays one move now, then waits and plays the next, until the end of the line.
function autoPlayStep() {
  watchState.timer = null;
  watchForward();
  if (watchState.playing && watchState.index < watchState.line.length) {
    watchState.timer = setTimeout(autoPlayStep, MOVE_DELAY);
  } else {
    pauseWatch(); // end of the line
  }
}

// Stops playing automatically.
function pauseWatch() {
  watchState.playing = false;
  if (watchState.timer) {
    clearTimeout(watchState.timer);
    watchState.timer = null;
  }
  if (watchState.course) updateWatchView();
}

// ===== Screen =====

// Updates everything around the board: status, move list, comment and buttons.
function updateWatchView() {
  const index = watchState.index;
  const atEnd = (index >= watchState.line.length);

  let status = "";
  if (index === 0) status = "Start position";
  else if (atEnd) status = "End of the line";
  document.getElementById("watch-status").textContent = status;

  renderMoveList("watch-move-list", watchState.game.history());

  // The comment of the last move played (if it has one).
  const lastNode = (index > 0) ? watchState.line[index - 1] : null;
  showComment("watch-comment", lastNode ? lastNode.comment : "");

  document.getElementById("watch-play").textContent = watchState.playing ? "Pause" : "Play";
  document.getElementById("watch-back").disabled = (index === 0);
  document.getElementById("watch-forward").disabled = atEnd;
}

// ===== Buttons on the watch screen =====

// "Play" / "Pause"
document.getElementById("watch-play").addEventListener("click", function () {
  if (watchState.playing) {
    pauseWatch();
  } else {
    playWatch();
  }
});

// Back one move / Forward one move (these pause automatic play)
document.getElementById("watch-back").addEventListener("click", function () {
  pauseWatch();
  watchBack();
});

document.getElementById("watch-forward").addEventListener("click", function () {
  pauseWatch();
  watchForward();
});

// "Restart": back to the starting position, paused.
document.getElementById("watch-restart").addEventListener("click", function () {
  pauseWatch();
  resetWatchPosition();
});

// "← Back": return to the course page.
document.getElementById("watch-exit").addEventListener("click", function () {
  pauseWatch();
  showCoursePage(watchState.course.id);
});
