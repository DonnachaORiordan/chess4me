// Saving and loading courses.
// ALL reading and writing of saved data happens in this file and nowhere else,
// so it can later be swapped for an online database by replacing just this file.

// ===== Settings =====

// The label the data is saved under in the browser's storage (localStorage).
// Never change this, even if the app is renamed, or saved courses would be lost.
const STORAGE_KEY = "chess4me-data";

// A label written into backup files, so Import can recognise them.
// Never change this, or older backups would no longer be accepted.
const BACKUP_FORMAT = "chess4me-backup";

// Version of the saved data format. Increase it if the format ever changes,
// so old data can be recognised and upgraded safely.
// Version 2 added per-position stats (stats.nodes) and dropped stats.moveMistakes.
const DATA_VERSION = 2;

// Before upgrading old data, an untouched copy of it is kept under this label, just in case.
// e.g. "chess4me-data-v1-copy". Never change this.
const OLD_DATA_COPY_KEY_START = STORAGE_KEY + "-v";

// Settings used until the user changes them.
const DEFAULT_SETTINGS = {
  soundOn: true
};

// Set to true if the saved data couldn't be read. Saving is then blocked,
// so broken (but maybe recoverable) data is never overwritten.
let storageBroken = false;

// ===== Course format =====

// Makes a unique id for a course, e.g. "course-1761418000000-k3x9qa".
function makeCourseId() {
  return "course-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

// Empty performance stats for a new course.
// (The names "timesPractised" and "lastPractised" keep their old spelling so saved data still matches.)
function makeEmptyStats() {
  return {
    timesPractised: 0,   // practice sessions started
    timesCompleted: 0,   // practice sessions finished
    mistakes: 0,         // wrong (but legal) moves
    hintsUsed: 0,
    movesShown: 0,
    correctFirstTry: 0,  // user's moves played correctly on the first try
    userMoves: 0,        // all of the user's moves (accuracy = correctFirstTry / userMoves)
    lastPractised: null, // date, or null if never practiced
    nodes: {}            // stats for each position in the move tree, labelled by the moves
                         // leading to it, including its own move, e.g. "e4 e5 Nf3".
                         // A position with no entry yet has all-zero stats (see getNodeStats).
  };
}

// Empty stats for one position (one move node) in the tree.
function makeEmptyNodeStats() {
  return {
    reached: 0,          // times this move came up in practice
    correctFirstTry: 0,  // user's move: played correctly with no mistakes or help
    mistakes: 0,         // user's move: wrong moves tried here
    hintsUsed: 0,        // user's move: hints used here
    movesShown: 0        // user's move: times "Show move" was used here
  };
}

// Returns the stats of one position, e.g. getNodeStats(course.stats, "e4 e5 Nf3"),
// creating empty ones the first time, so they can be counted up straight away.
function getNodeStats(stats, key) {
  if (!stats.nodes[key]) stats.nodes[key] = makeEmptyNodeStats();
  return stats.nodes[key];
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

// Turns a move tree back into a simple list of moves, following the first choice at each step.
// (In version 1 there is only one choice at each step anyway.)
function getMainLine(moves) {
  const line = [];
  let nextMoves = moves;
  while (nextMoves.length > 0) {
    line.push(nextMoves[0]);
    nextMoves = nextMoves[0].children;
  }
  return line;
}

// Finds a route in a move tree from its moves, e.g. findRoute(course.moves, ["e4", "e5"]).
// Returns the list of tree nodes, or null if the tree doesn't have that route.
function findRoute(moves, sans) {
  const route = [];
  let choices = moves;
  for (let i = 0; i < sans.length; i++) {
    const node = choices.find(function (n) { return n.move === sans[i]; });
    if (!node) return null;
    route.push(node);
    choices = node.children;
  }
  return route;
}

// A route followed by the main line from its end to the end of the course,
// e.g. the moves to 3... Nf6, then the first choice at every split after it.
function routeThenMainLine(moves, route) {
  const after = route.length > 0 ? route[route.length - 1].children : moves;
  return route.concat(getMainLine(after));
}

// Lists every complete line in a move tree: one list of moves (tree nodes) from the
// first move to the end, for each end of a line. A tree with no side lines has one line.
// "start" (optional) = moves already played: only lines that begin with them are listed.
function getAllLines(moves, start) {
  start = start || [];
  const lines = [];
  function walk(choices, line) {
    if (choices.length === 0) {
      if (line.length > 0) lines.push(line);
      return;
    }
    // While following "start", only its move is allowed at each step.
    const depth = line.length;
    choices.forEach(function (node) {
      if (depth < start.length && node !== start[depth]) return;
      walk(node.children, line.concat(node));
    });
  }
  walk(moves, []);
  return lines;
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
// saves the example Italian Game course. If the saved data is from an older
// version of the app, upgrades it.
function initStorage() {
  const data = readData();
  if (storageBroken) return;

  if (data === null) {
    writeData({ dataVersion: DATA_VERSION, courses: [makeExampleCourse()] });
  } else if (typeof data.dataVersion === "number" && data.dataVersion < DATA_VERSION) {
    upgradeSavedData(data);
  }
}

// ===== Upgrading old data =====

// Upgrades the saved data to the current format, keeping a copy of the old data first.
function upgradeSavedData(data) {
  // 1. Keep an untouched copy of the old data (only the first time, so the original is never overwritten).
  const copyKey = OLD_DATA_COPY_KEY_START + data.dataVersion + "-copy";
  try {
    if (localStorage.getItem(copyKey) === null) {
      localStorage.setItem(copyKey, localStorage.getItem(STORAGE_KEY));
    }
  } catch (error) {
    console.error("Couldn't keep a copy of the old data (upgrading anyway, courses are kept):", error);
  }

  // 2. Upgrade, check nothing was lost, and save.
  const upgraded = upgradeData(data);
  if (upgraded.courses.length !== data.courses.length) {
    console.error("Upgrade stopped: the number of courses changed. The old data is left as it was.");
    return;
  }
  writeData(upgraded);
}

// Returns an upgraded copy of saved data (or of a backup file's data).
// Version 1 -> 2: every course keeps its id, name, colour, moves, comments and dates exactly.
// Its stats are reset to zero, in the new format with per-position stats (the user chose this).
function upgradeData(data) {
  const upgraded = Object.assign({}, data); // keeps anything else, e.g. settings
  if (data.dataVersion < 2) {
    upgraded.courses = data.courses.map(function (course) {
      return Object.assign({}, course, { stats: makeEmptyStats() });
    });
  }
  upgraded.dataVersion = DATA_VERSION;
  return upgraded;
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

// Saves just a course's performance stats (without changing its "updated" date,
// which is for changes to the course itself).
function saveCourseStats(courseId, stats) {
  const data = getData();
  const course = data.courses.find(function (c) { return c.id === courseId; });
  if (!course) return false;
  course.stats = stats;
  return writeData(data);
}

// Deletes a course by its id.
function deleteCourse(id) {
  const data = getData();
  data.courses = data.courses.filter(function (course) { return course.id !== id; });
  return writeData(data);
}

// ===== Backups (Export and Import) =====

// Returns everything that goes into a backup file: all courses, with their stats.
function getBackupData() {
  return {
    format: BACKUP_FORMAT,
    dataVersion: DATA_VERSION,
    exported: new Date().toISOString(),
    courses: getAllCourses()
  };
}

// Reads the text of a backup file and checks it carefully.
// Returns the list of courses if it's a valid backup, or null if it isn't.
function readBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch (error) {
    return null; // not even readable data
  }

  const isBackup = backup !== null && typeof backup === "object" &&
    backup.format === BACKUP_FORMAT &&
    typeof backup.dataVersion === "number" &&
    backup.dataVersion <= DATA_VERSION && // made by a newer version of the app: can't be sure we understand it
    Array.isArray(backup.courses);
  if (!isBackup) return null;

  if (!backup.courses.every(isValidCourse)) return null;

  // A backup from an older version is upgraded the same way as saved data (stats reset).
  return upgradeData(backup).courses.map(tidyImportedCourse);
}

// True if something looks like a proper course (name, colour and a valid move tree).
function isValidCourse(course) {
  return course !== null && typeof course === "object" &&
    typeof course.name === "string" && course.name.trim() !== "" &&
    (course.colour === "white" || course.colour === "black") &&
    Array.isArray(course.moves) &&
    course.moves.every(isValidMoveNode);
}

// True if something looks like a proper move-tree node (and so do all the moves after it).
function isValidMoveNode(node) {
  return node !== null && typeof node === "object" &&
    typeof node.move === "string" &&
    (node.comment === undefined || typeof node.comment === "string") &&
    (node.name === undefined || typeof node.name === "string") && // optional side line name
    Array.isArray(node.children) &&
    node.children.every(isValidMoveNode);
}

// Fills in anything missing from an imported course (e.g. stats), so the rest of the app can rely on it.
function tidyImportedCourse(course) {
  const now = new Date().toISOString();
  const stats = Object.assign(makeEmptyStats(), (course.stats && typeof course.stats === "object") ? course.stats : {});
  if (!stats.nodes || typeof stats.nodes !== "object") stats.nodes = {};

  return {
    id: (typeof course.id === "string" && course.id) ? course.id : makeCourseId(),
    name: course.name.trim(),
    colour: course.colour,
    description: (typeof course.description === "string") ? course.description : "",
    moves: course.moves,
    stats: stats,
    created: (typeof course.created === "string") ? course.created : now,
    updated: (typeof course.updated === "string") ? course.updated : now
  };
}

// Saves imported courses.
// replace = true:  the imported courses replace ALL existing courses.
// replace = false: they are added. A course whose id is already used gets a new id,
//                  so it is added as a copy and never overwrites an existing course.
function importCourses(courses, replace) {
  const data = getData();
  if (replace) {
    data.courses = courses;
  } else {
    courses.forEach(function (course) {
      const idTaken = data.courses.some(function (c) { return c.id === course.id; });
      if (idTaken) course.id = makeCourseId();
      data.courses.push(course);
    });
  }
  return writeData(data);
}

// ===== User settings (e.g. sound on/off) =====

// Returns the user's settings, e.g. { soundOn: true }.
// Anything not saved yet uses the value from DEFAULT_SETTINGS.
function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, getData().settings);
}

// Saves the user's settings.
function saveSettings(settings) {
  const data = getData();
  data.settings = settings;
  return writeData(data);
}
