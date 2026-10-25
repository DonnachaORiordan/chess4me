// The course editor: creating a new course, or editing an existing one.
// The user enters the moves for both colours on the board.

// What the editor currently knows about.
const editorState = {
  courseId: null,      // the id of the course being edited, or null for a new course
  game: null,          // the chess.js game showing the moves entered so far
  entries: [],         // the moves entered so far, e.g. [{ san: "e4", comment: "" }, ...]
  selectedIndex: null, // which move's comment is being edited (0 = first move), or null
  changed: false       // true if anything has changed since the editor was opened
};

// Opens the editor. Pass a course id to edit that course, or null for a new course.
function startEditor(courseId) {
  const course = courseId ? getCourse(courseId) : null;
  if (courseId && !course) {
    showMainMenu(); // the course no longer exists
    return;
  }

  editorState.courseId = courseId;
  editorState.game = new Chess();
  editorState.entries = [];
  editorState.changed = false;

  document.getElementById("editor-title").textContent = course ? "Edit course" : "New course";
  document.getElementById("editor-name").value = course ? course.name : "";
  setEditorColour(course ? course.colour : "white");
  setEditorMessage("");

  // When editing, play the course's moves onto the board.
  if (course) {
    const line = getMainLine(course.moves);
    for (let i = 0; i < line.length; i++) {
      const move = editorState.game.move(line[i].move);
      if (!move) {
        setEditorMessage("Some moves couldn't be loaded, because one isn't legal: " + line[i].move);
        break;
      }
      editorState.entries.push({ san: move.san, comment: line[i].comment || "" });
    }
  }

  closeCommentEditor();
  placeBoard(document.getElementById("editor-board-area"));
  showEditorBoard();
  updateEditorView();
  showScreen("editor-screen");
}

// Shows the game on the board, with the chosen colour at the bottom.
// Either side can move (whoever's turn it is), as the user enters moves for both.
function showEditorBoard() {
  showGame(editorState.game, {
    orientation: getEditorColour(),
    onMove: handleEditorMove
  });
}

// The colour chosen with the White/Black buttons: "white" or "black".
function getEditorColour() {
  return document.querySelector('input[name="editor-colour"]:checked').value;
}

// Ticks the White or Black button.
function setEditorColour(colour) {
  document.querySelector('input[name="editor-colour"][value="' + colour + '"]').checked = true;
}

// ===== Entering and undoing moves =====

// Runs when the user taps a legal move on the board: adds it to the course.
function handleEditorMove(move) {
  const played = editorState.game.move({ from: move.from, to: move.to, promotion: move.promotion });
  editorState.entries.push({ san: played.san, comment: "" });
  editorState.changed = true;
  showMove(played);
  playMoveSound();
  setEditorMessage("");
  updateEditorView();
}

// "Undo last move": takes the last move back off the board and out of the course.
function undoEditorMove() {
  if (editorState.entries.length === 0) return;

  const move = editorState.game.undo();
  editorState.entries.pop();
  editorState.changed = true;

  // If that move's comment was open, close it.
  if (editorState.selectedIndex !== null && editorState.selectedIndex >= editorState.entries.length) {
    closeCommentEditor();
  }

  showMove(move, true); // the piece slides back
  playMoveSound();
  updateEditorView();
}

// ===== Comments =====

// Opens the comment box for one move (when the user taps it in the move list).
function openCommentEditor(index) {
  editorState.selectedIndex = index;
  document.getElementById("editor-comment-label").textContent = "Comment on " + moveLabel(index);
  const textBox = document.getElementById("editor-comment");
  textBox.value = editorState.entries[index].comment;
  document.getElementById("editor-comment-panel").hidden = false;
  updateEditorView();
  textBox.focus();
}

// Closes the comment box.
function closeCommentEditor() {
  editorState.selectedIndex = null;
  document.getElementById("editor-comment-panel").hidden = true;
}

// A move's name for the comment box, e.g. "3. Bc4" (White) or "3... Bc5" (Black).
function moveLabel(index) {
  const moveNumber = Math.floor(index / 2) + 1;
  const isWhite = (index % 2 === 0);
  return moveNumber + (isWhite ? ". " : "... ") + editorState.entries[index].san;
}

// ===== Screen =====

// Updates everything around the board: whose turn it is, buttons and the move list.
function updateEditorView() {
  const game = editorState.game;
  const entries = editorState.entries;

  let status = (game.turn() === "w") ? "White to move" : "Black to move";
  if (game.in_checkmate()) status = "Checkmate";
  document.getElementById("editor-status").textContent = status;

  document.getElementById("editor-undo").disabled = (entries.length === 0);

  // Moves in the list can be tapped to add a comment. Moves with a comment get a dot.
  renderMoveList("editor-move-list", entries.map(function (e) { return e.san; }), {
    selectedIndex: editorState.selectedIndex,
    hasComment: function (index) { return entries[index].comment.trim() !== ""; },
    onMoveTap: openCommentEditor
  });
  document.getElementById("editor-help").hidden = (entries.length === 0);
}

// Shows a message under the Save button (e.g. what's missing), or clears it.
function setEditorMessage(text) {
  document.getElementById("editor-message").textContent = text;
}

// ===== Save and Cancel =====

// "Save": checks the course is complete, saves it, and opens its course page.
function saveEditor() {
  const name = document.getElementById("editor-name").value.trim();
  if (name === "") {
    setEditorMessage("Please enter a course name.");
    document.getElementById("editor-name").focus();
    return;
  }
  if (editorState.entries.length === 0) {
    setEditorMessage("Please enter at least one move on the board.");
    return;
  }

  // Turn the entered moves and comments into the course's move tree.
  const moves = editorState.entries.map(function (e) { return e.san; });
  const comments = {};
  editorState.entries.forEach(function (e, index) {
    if (e.comment.trim() !== "") comments[index] = e.comment.trim();
  });
  const tree = lineToTree(moves, comments);

  // Update the existing course (keeping its id, stats and dates), or make a new one.
  let course = editorState.courseId ? getCourse(editorState.courseId) : null;
  if (course) {
    course.name = name;
    course.colour = getEditorColour();
    course.moves = tree;
  } else {
    course = makeCourse(name, getEditorColour(), tree);
  }

  if (!saveCourse(course)) {
    setEditorMessage("Sorry, the course couldn't be saved.");
    return;
  }
  showCoursePage(course.id);
}

// "Cancel": leaves without saving (asks first if anything has changed).
function cancelEditor() {
  if (editorState.changed) {
    askConfirm("Discard your changes?", "Discard", leaveEditor);
  } else {
    leaveEditor();
  }
}

// Goes back to where the editor was opened from.
function leaveEditor() {
  if (editorState.courseId) {
    showCoursePage(editorState.courseId);
  } else {
    showMainMenu();
  }
}

// ===== Buttons and fields on the editor screen =====

document.getElementById("editor-name").addEventListener("input", function () {
  editorState.changed = true;
});

// Changing the colour flips the board.
document.querySelectorAll('input[name="editor-colour"]').forEach(function (radio) {
  radio.addEventListener("change", function () {
    editorState.changed = true;
    showEditorBoard();
  });
});

document.getElementById("editor-undo").addEventListener("click", undoEditorMove);

// Typing in the comment box saves the text into the move straight away
// (it is saved to storage with the rest of the course when "Save" is pressed).
document.getElementById("editor-comment").addEventListener("input", function (event) {
  editorState.entries[editorState.selectedIndex].comment = event.target.value;
  editorState.changed = true;
  updateEditorView();
});

document.getElementById("editor-comment-delete").addEventListener("click", function () {
  editorState.entries[editorState.selectedIndex].comment = "";
  document.getElementById("editor-comment").value = "";
  editorState.changed = true;
  updateEditorView();
});

document.getElementById("editor-comment-done").addEventListener("click", function () {
  closeCommentEditor();
  updateEditorView();
});

document.getElementById("editor-save").addEventListener("click", saveEditor);
document.getElementById("editor-cancel").addEventListener("click", cancelEditor);
