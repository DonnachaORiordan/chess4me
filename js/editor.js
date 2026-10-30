// The course editor: creating a new course, or editing an existing one.
// The user enters the moves for both colours on the board. The course is a tree of moves
// (see storage.js): the opponent can have several prepared replies (side lines).

// What the editor currently knows about.
const editorState = {
  courseId: null,      // the id of the course being edited, or null for a new course
  tree: [],            // the course's move tree being edited: a list of possible first moves
  path: [],            // the moves (tree nodes) from the start to the current move; [] = start position
  game: null,          // the chess.js game showing the position after "path"
  commentNode: null,   // the move whose comment is being edited, or null
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
  editorState.changed = false;

  document.getElementById("editor-title").textContent = course ? "Edit course" : "New course";
  document.getElementById("editor-name").value = course ? course.name : "";
  setEditorColour(course ? course.colour : "white");
  setEditorMessage("");

  // Work on a copy of the course's moves, so nothing changes unless "Save" is pressed.
  editorState.tree = course ? JSON.parse(JSON.stringify(course.moves)) : [];
  const removed = removeIllegalMoves(editorState.tree, new Chess());
  if (removed.length > 0) {
    setEditorMessage("Some moves couldn't be loaded, because they aren't legal: " + removed.join(", "));
  }

  // When editing, start at the end of the main line, with its moves played on the board.
  editorState.path = getMainLine(editorState.tree);
  editorState.game = gameAfter(editorState.path);

  closeCommentEditor();
  placeBoard(document.getElementById("editor-board-area"));
  showEditorBoard();
  updateEditorView();
  showScreen("editor-screen");
}

// Checks every move in a tree is legal, starting from the game's position.
// Takes out any that aren't (with everything after them), and returns their names.
// Also writes each move in chess.js's standard form (e.g. "Nf3"), so moves can be compared.
function removeIllegalMoves(choices, game) {
  let removed = [];
  for (let i = choices.length - 1; i >= 0; i--) {
    const node = choices[i];
    const move = game.move(node.move);
    if (!move) {
      removed.push(node.move);
      choices.splice(i, 1);
      continue;
    }
    node.move = move.san;
    removed = removed.concat(removeIllegalMoves(node.children, game));
    game.undo();
  }
  return removed;
}

// Returns a new chess.js game with the given moves (tree nodes) played from the start.
function gameAfter(path) {
  const game = new Chess();
  path.forEach(function (node) { game.move(node.move); });
  return game;
}

// The current move (tree node), or null at the start position.
function currentEditorNode() {
  const path = editorState.path;
  return path.length > 0 ? path[path.length - 1] : null;
}

// The moves that can come next from the current position (its children in the tree).
function currentEditorChoices() {
  const node = currentEditorNode();
  return node ? node.children : editorState.tree;
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

// ===== Entering moves =====

// Runs when the user taps a legal move on the board.
// - If that move is already in the course here, the editor simply follows it.
// - A new opponent move is added (as a side line if there are already other replies here).
// - A new user move, where the user already has a different move here, replaces it,
//   but only after asking (the user has exactly one planned move in each position).
function handleEditorMove(move) {
  const game = editorState.game;
  const choices = currentEditorChoices();
  const played = game.move({ from: move.from, to: move.to, promotion: move.promotion });

  const existing = choices.find(function (node) { return node.move === played.san; });
  if (existing) {
    enterEditorMove(existing, played);
    return;
  }

  const userColour = (getEditorColour() === "white") ? "w" : "b";
  if (played.color === userColour && choices.length > 0) {
    game.undo(); // not yet: ask first
    askToReplaceMove(choices, move, played.san);
    return;
  }

  const node = makeMoveNode(played.san);
  choices.push(node);
  editorState.changed = true;
  enterEditorMove(node, played);
}

// Asks "Replace 4. c3 with 4. d3? This deletes the 5 moves after it."
// If the user agrees, the old move (and everything after it) is replaced by the new move.
function askToReplaceMove(choices, move, newSan) {
  const oldNode = choices[0];
  const ply = editorState.path.length;
  const after = countMovesAfter(oldNode);
  let message = "Replace " + moveName(ply, oldNode.move) + " with " + moveName(ply, newSan) + "?";
  if (after > 0) {
    message += " This deletes the " + (after === 1 ? "move" : after + " moves") + " after it.";
  }

  askConfirm(message, "Replace", function () {
    const played = editorState.game.move({ from: move.from, to: move.to, promotion: move.promotion });
    const node = makeMoveNode(played.san);
    choices[choices.indexOf(oldNode)] = node;
    editorState.changed = true;
    enterEditorMove(node, played);
  });
  updateBoard(); // shows the position as it was while the question is showing
}

// Moves on to a move that has just been played on the board.
function enterEditorMove(node, played) {
  editorState.path.push(node);
  closeCommentEditor();
  showMove(played);
  playSoundForMove(played);
  setEditorMessage("");
  updateEditorView();
}

// How many moves come after this move in the tree (in all its lines).
function countMovesAfter(node) {
  return node.children.reduce(function (total, child) {
    return total + 1 + countMovesAfter(child);
  }, 0);
}

// A move's name, e.g. "3. Bc4" (White) or "3... Bc5" (Black).
// "ply" says whose move it is: 0 = White's first move, 1 = Black's first move, and so on.
function moveName(ply, san) {
  const moveNumber = Math.floor(ply / 2) + 1;
  return moveNumber + (ply % 2 === 0 ? ". " : "... ") + san;
}

// ===== Moving around the tree =====

// Tapping a move in the move list: jump to the position after it, and open its comment box.
function jumpToEditorMove(path) {
  editorState.path = path.slice();
  editorState.game = gameAfter(editorState.path);
  showEditorBoard();
  openCommentEditor(currentEditorNode());
}

// Back arrow: one move back.
function editorBack() {
  if (editorState.path.length === 0) return;
  editorState.path.pop();
  const move = editorState.game.undo();
  closeCommentEditor();
  showMove(move, true); // the piece slides back
  playMoveSound();
  updateEditorView();
}

// Forward arrow: one move forward. Where the line splits, it follows the main line.
function editorForward() {
  const next = currentEditorChoices()[0];
  if (!next) return;
  enterEditorMove(next, editorState.game.move(next.move));
}

// "Undo last move": removes the current move, but only if it's the end of a line
// (otherwise the button is greyed out).
function undoEditorMove() {
  const node = currentEditorNode();
  if (!node || node.children.length > 0) return;

  const path = editorState.path;
  const parentChoices = (path.length > 1) ? path[path.length - 2].children : editorState.tree;
  parentChoices.splice(parentChoices.indexOf(node), 1);
  path.pop();
  editorState.changed = true;

  const move = editorState.game.undo();
  closeCommentEditor();
  showMove(move, true); // the piece slides back
  playMoveSound();
  updateEditorView();
}

// ===== Comments =====

// Opens the comment box for a move. (It isn't focused, so the iPhone keyboard
// doesn't pop up every time a move is tapped: tap the box to type.)
function openCommentEditor(node) {
  editorState.commentNode = node;
  document.getElementById("editor-comment-label").textContent =
    "Comment on " + moveName(editorState.path.indexOf(node), node.move);
  document.getElementById("editor-comment").value = node.comment || "";
  document.getElementById("editor-comment-panel").hidden = false;
  updateEditorView();
}

// Closes the comment box.
function closeCommentEditor() {
  editorState.commentNode = null;
  document.getElementById("editor-comment-panel").hidden = true;
}

// ===== Screen =====

// Updates everything around the board: whose turn it is, buttons and the move list.
function updateEditorView() {
  const game = editorState.game;
  const node = currentEditorNode();

  let status = (game.turn() === "w") ? "White to move" : "Black to move";
  if (game.in_checkmate()) status = "Checkmate";
  document.getElementById("editor-status").textContent = status;

  document.getElementById("editor-back").disabled = (editorState.path.length === 0);
  document.getElementById("editor-forward").disabled = (currentEditorChoices().length === 0);
  document.getElementById("editor-undo").disabled = (!node || node.children.length > 0);

  // The whole tree. Tapping a move jumps to it. The current move is highlighted.
  renderMoveTree("editor-move-list", editorState.tree, {
    currentNode: node,
    onMoveTap: jumpToEditorMove
  });
  document.getElementById("editor-help").hidden = (editorState.tree.length === 0);
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
  if (editorState.tree.length === 0) {
    setEditorMessage("Please enter at least one move on the board.");
    return;
  }

  const tree = tidyMoveTree(editorState.tree);

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

// A clean copy of a move tree for saving: just the move, its comment (trimmed) and the moves after it.
function tidyMoveTree(choices) {
  return choices.map(function (node) {
    const tidy = makeMoveNode(node.move, (node.comment || "").trim());
    tidy.children = tidyMoveTree(node.children);
    return tidy;
  });
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

document.getElementById("editor-back").addEventListener("click", editorBack);
document.getElementById("editor-forward").addEventListener("click", editorForward);
document.getElementById("editor-undo").addEventListener("click", undoEditorMove);

// Typing in the comment box saves the text into the move straight away
// (it is saved to storage with the rest of the course when "Save" is pressed).
document.getElementById("editor-comment").addEventListener("input", function (event) {
  editorState.commentNode.comment = event.target.value;
  editorState.changed = true;
  updateEditorView();
});

document.getElementById("editor-comment-delete").addEventListener("click", function () {
  editorState.commentNode.comment = "";
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
