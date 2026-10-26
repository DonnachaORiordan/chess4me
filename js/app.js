// Starting point of the app: menus and moving between screens.

// ===== Screens =====

// Shows one screen (by its id, e.g. "menu-screen") and hides all the others.
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(function (screen) {
    screen.hidden = (screen.id !== screenId);
  });
  window.scrollTo(0, 0); // start each screen at the top
}

// Makes the small square showing which colour the user plays.
function makeColourBox(colour) {
  const box = document.createElement("span");
  box.className = "colour-box colour-box-" + colour; // "colour-box-white" or "colour-box-black"
  return box;
}

// "white" -> "White", "black" -> "Black"
function colourName(colour) {
  return colour === "white" ? "White" : "Black";
}

// Shows a list of moves (e.g. ["e4", "e5", "Nf3"]) in the move list with the given id,
// laid out as "1. e4 e5  2. Nf3". Used by practice, watch mode and the editor.
// "options" is only used by the editor, to make the moves tappable:
//   options.onMoveTap(index)  - called when a move is tapped (0 = first move)
//   options.selectedIndex     - the move to highlight
//   options.hasComment(index) - true if the move should show a comment dot
function renderMoveList(listId, moves, options) {
  options = options || {};
  const list = document.getElementById(listId);
  list.innerHTML = "";

  for (let i = 0; i < moves.length; i += 2) {
    addMoveListCell(list, (i / 2 + 1) + ".", "move-number"); // move number
    addMoveListMove(list, moves, i, options);                // White's move
    if (i + 1 < moves.length) {
      addMoveListMove(list, moves, i + 1, options);          // Black's move
    } else {
      addMoveListCell(list, "", "move");                     // Black hasn't moved yet
    }
  }
}

// Adds one piece of text to a move list grid.
function addMoveListCell(list, text, className) {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text;
  list.appendChild(cell);
}

// Adds one move to a move list grid: plain text, or a button if moves can be tapped.
function addMoveListMove(list, moves, index, options) {
  if (!options.onMoveTap) {
    addMoveListCell(list, moves[index], "move");
    return;
  }

  const button = document.createElement("button");
  button.className = "move-button";
  button.textContent = moves[index];
  if (index === options.selectedIndex) button.classList.add("selected");
  if (options.hasComment && options.hasComment(index)) button.classList.add("has-comment");
  button.addEventListener("click", function () {
    options.onMoveTap(index);
  });
  list.appendChild(button);
}

// ===== Pop-up messages and questions =====

// Shows a pop-up with a message, a button for each choice, and a last button
// that just closes it (labelled "Cancel" unless closeLabel says otherwise).
// Each choice is { label: "Add", style: "button-danger" (optional), action: function }.
function askChoice(message, choices, closeLabel) {
  const dialog = document.getElementById("confirm-dialog");
  document.getElementById("confirm-message").textContent = message;

  const buttons = document.getElementById("confirm-buttons");
  buttons.innerHTML = "";
  choices.forEach(function (choice) {
    addDialogButton(buttons, choice.label, "button " + (choice.style || ""), choice.action);
  });
  addDialogButton(buttons, closeLabel || "Cancel", "button button-secondary", null);

  dialog.showModal();
}

// Adds one button to the pop-up. Tapping it closes the pop-up, then runs the action (if any).
function addDialogButton(container, label, className, action) {
  const button = document.createElement("button");
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", function () {
    document.getElementById("confirm-dialog").close();
    if (action) action();
  });
  container.appendChild(button);
}

// Asks "Are you sure?": a red button (e.g. "Delete") and "Cancel". Runs onYes only if confirmed.
function askConfirm(message, yesLabel, onYes) {
  askChoice(message, [{ label: yesLabel, style: "button-danger", action: onYes }]);
}

// Shows a message with just an "OK" button.
function showMessage(message) {
  askChoice(message, [], "OK");
}

// Shows a move's comment in the comment box with the given id,
// or hides the box if there's no comment. Used by practice and watch mode.
function showComment(boxId, text) {
  const box = document.getElementById(boxId);
  box.textContent = text || "";
  box.hidden = !text;
}

// ===== Main menu =====

// Shows the main menu, with an up-to-date list of courses.
function showMainMenu() {
  renderCourseList();
  showScreen("menu-screen");
}

// Fills the course list with one card per saved course.
function renderCourseList() {
  const list = document.getElementById("course-list");
  list.innerHTML = ""; // remove the old cards

  const courses = getAllCourses();
  if (courses.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No courses yet.";
    list.appendChild(message);
    return;
  }

  courses.forEach(function (course) {
    list.appendChild(makeCourseCard(course));
  });
}

// Makes one course card: colour box on the left, then the course name
// with a short stats summary below it. Tapping the card opens the course page.
function makeCourseCard(course) {
  const card = document.createElement("button");
  card.className = "course-card";

  card.appendChild(makeColourBox(course.colour));

  const text = document.createElement("span");
  text.className = "course-card-text";

  const name = document.createElement("span");
  name.className = "course-card-name";
  name.textContent = course.name;
  text.appendChild(name);

  const summary = document.createElement("span");
  summary.className = "course-card-stats";
  summary.textContent = statsSummary(course.stats);
  text.appendChild(summary);

  card.appendChild(text);

  card.addEventListener("click", function () {
    showCoursePage(course.id);
  });
  return card;
}

// A short stats summary for a course card, e.g. "Accuracy 86% · Practised 12 times".
function statsSummary(stats) {
  if (!stats || !stats.timesPractised) return "Not practised yet";

  const parts = [];
  // Accuracy = moves right on the first try ÷ all the user's moves, as a %.
  if (stats.userMoves > 0) {
    parts.push("Accuracy " + Math.round(100 * stats.correctFirstTry / stats.userMoves) + "%");
  }
  const times = stats.timesPractised;
  parts.push("Practised " + times + (times === 1 ? " time" : " times"));
  return parts.join(" · ");
}

// ===== Course page =====

// The id of the course whose page is open.
let currentCourseId = null;

// Shows the page for one course.
function showCoursePage(courseId) {
  const course = getCourse(courseId);
  if (!course) {
    showMainMenu(); // the course no longer exists
    return;
  }
  currentCourseId = courseId;

  document.getElementById("course-name").textContent = course.name;

  // Colour line, e.g. [white box] "You play White"
  const colourLine = document.getElementById("course-colour");
  colourLine.innerHTML = "";
  colourLine.appendChild(makeColourBox(course.colour));
  colourLine.appendChild(document.createTextNode("You play " + colourName(course.colour)));

  showScreen("course-screen");
}

document.getElementById("course-back").addEventListener("click", showMainMenu);

// "Practice": start practising this course (see practice.js).
document.getElementById("course-practice").addEventListener("click", function () {
  startPractice(currentCourseId);
});

// "Watch": watch this course's line being played (see watch.js).
document.getElementById("course-watch").addEventListener("click", function () {
  startWatch(currentCourseId);
});

// "Edit": open this course in the editor (see editor.js).
document.getElementById("course-edit").addEventListener("click", function () {
  startEditor(currentCourseId);
});

// "Delete": asks first, then deletes the course and returns to the main menu.
document.getElementById("course-delete").addEventListener("click", function () {
  const course = getCourse(currentCourseId);
  if (!course) return;
  askConfirm("Delete " + course.name + "? This can't be undone.", "Delete", function () {
    deleteCourse(course.id);
    showMainMenu();
  });
});

// "New course" on the main menu: open an empty editor.
document.getElementById("menu-new").addEventListener("click", function () {
  startEditor(null);
});

// ===== Start the app =====

// Show the app name (from config.js) in the browser tab and the heading.
document.title = APP_NAME;
document.getElementById("app-title").textContent = APP_NAME;

// Prepare saved data (creates the example course on first launch).
initStorage();

// Show the saved sound setting on the sound buttons.
updateSoundButtons();

// Get the board ready to listen for taps (practice mode shows a game on it).
setupBoard(document.getElementById("board"));

// Open on the main menu.
showMainMenu();

// Switch on offline support (see sw.js). Browsers only allow this on a real
// website, so it's skipped when index.html is opened by double-clicking (file://).
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js");
}
