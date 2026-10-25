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
// laid out as "1. e4 e5  2. Nf3". Used by practice and watch mode.
function renderMoveList(listId, moves) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  for (let i = 0; i < moves.length; i += 2) {
    addMoveListCell(list, (i / 2 + 1) + ".", "move-number"); // move number
    addMoveListCell(list, moves[i], "move");                 // White's move
    addMoveListCell(list, moves[i + 1] || "", "move");       // Black's move (if played yet)
  }
}

// Adds one piece of text to a move list grid.
function addMoveListCell(list, text, className) {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text;
  list.appendChild(cell);
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

// Makes one course card: colour box on the left, then the course name.
// Tapping the card opens the course page.
function makeCourseCard(course) {
  const card = document.createElement("button");
  card.className = "course-card";

  card.appendChild(makeColourBox(course.colour));

  const name = document.createElement("span");
  name.className = "course-card-name";
  name.textContent = course.name;
  card.appendChild(name);

  card.addEventListener("click", function () {
    showCoursePage(course.id);
  });
  return card;
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
