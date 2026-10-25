// Saving and loading courses.
// ALL reading and writing of saved data happens in this file and nowhere else,
// so it can later be swapped for an online database by replacing just this file.

// ===== Settings =====

// The label the data is saved under in the browser's storage (localStorage).
// Never change this, even if the app is renamed, or saved courses would be lost.
const STORAGE_KEY = "chess4me-data";

// Version of the saved data format. Increase it if the format ever changes,
// so old data can be recognised and upgraded safely.
const DATA_VERSION = 1;

// Set to true if the saved data couldn't be read. Saving is then blocked,
// so broken (but maybe recoverable) data is never overwritten.
let storageBroken = false;

// ===== Course format =====

// Makes a unique id for a course, e.g. "course-1761418000000-k3x9qa".
function makeCourseId() {
  return "course-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

// Empty performance stats for a new course (counting starts in a later step).
function makeEmptyStats() {
  return {
    timesPractised: 0,   // practice sessions started
    timesCompleted: 0,   // practice sessions finished
    mistakes: 0,         // wrong (but legal) moves
    hintsUsed: 0,
    movesShown: 0,
    correctFirstTry: 0,  // user's moves played correctly on the first try
    userMoves: 0,        // all of the user's moves (accuracy = correctFirstTry / userMoves)
    lastPractised: null, // date, or null if never practised
    moveMistakes: {}     // times each move was got wrong, keyed by the moves leading
                         // to it, e.g. { "e4 e5 Nf3": 2 }
  };
}

// Makes one move for the move tree. "children" holds the possible next moves
// (in version 1 there is always zero or one).
function makeMoveNode(move, comment) {
  return { move: move, comment: comment || "", children: [] };
}

// Turns a simple list of moves into a move tree (one line, no branches).
// Example: lineToTree(["e4", "e5"], { 0: "A comment on e4" })
// "comments" links a move's position in the list (0 = first move) to its comment.
function lineToTree(moves, comments) {
  comments = comments || {};
  const firstMoves = [];
  let currentList = firstMoves;

  moves.forEach(function (move, index) {
    const node = makeMoveNode(move, comments[index]);
    currentList.push(node);
    currentList = node.children; // the next move goes inside this one
  });

  return firstMoves;
}

// Makes a complete new course.
function makeCourse(name, colour, moves) {
  const now = new Date().toISOString();
  return {
    id: makeCourseId(),
    name: name,
    colour: colour,     // "white" or "black"
    description: "",
    moves: moves || [], // the move tree: a list of possible first moves
    stats: makeEmptyStats(),
    created: now,
    updated: now
  };
}

// The example course created on first launch.
function makeExampleCourse() {
  const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4"];
  const comments = {
    4: "The bishop aims at f7, Black's weakest square.", // 3.Bc4
    6: "Preparing d4 to take over the centre."           // 4.c3
  };
  return makeCourse("Italian Game", "white", lineToTree(moves, comments));
}

// ===== Reading and writing =====

// Reads all saved data. Returns null if nothing has been saved yet.
function readData() {
  let text;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageBroken = true;
    console.error("Can't use the browser's storage:", error);
    return null;
  }

  if (text === null) return null; // nothing saved yet

  try {
    return JSON.parse(text);
  } catch (error) {
    storageBroken = true;
    console.error("Saved data is damaged and couldn't be read:", error);
    return null;
  }
}

// Writes all data to storage (unless the saved data was unreadable).
function writeData(data) {
  if (storageBroken) {
    console.error("Not saving: the saved data couldn't be read, so it is left untouched.");
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Couldn't save:", error);
    return false;
  }
}

// Returns the saved data, or a new empty set of data if nothing is saved yet.
function getData() {
  return readData() || { dataVersion: DATA_VERSION, courses: [] };
}

// ===== Functions the rest of the app uses =====

// Runs once when the app starts. On first launch (nothing saved yet),
// saves the example Italian Game course.
function initStorage() {
  const data = readData();
  if (data === null && !storageBroken) {
    writeData({ dataVersion: DATA_VERSION, courses: [makeExampleCourse()] });
  }
}

// Returns a list of all courses.
function getAllCourses() {
  return getData().courses;
}

// Returns one course by its id, or null if there's no such course.
function getCourse(id) {
  return getAllCourses().find(function (course) { return course.id === id; }) || null;
}

// Saves a course: replaces the old version if it already exists, otherwise adds it.
function saveCourse(course) {
  const data = getData();
  course.updated = new Date().toISOString();

  const index = data.courses.findIndex(function (c) { return c.id === course.id; });
  if (index >= 0) {
    data.courses[index] = course;
  } else {
    data.courses.push(course);
  }
  return writeData(data);
}

// Deletes a course by its id.
function deleteCourse(id) {
  const data = getData();
  data.courses = data.courses.filter(function (course) { return course.id !== id; });
  return writeData(data);
}
