// Export and Import: saving all courses to a backup file, and loading them back.
// (The checking and saving of the data itself happens in storage.js.)

// ===== Export =====

// "Export": makes a backup file of all courses (with their stats).
// On a phone or tablet, opens the share menu (Save to Files, AirDrop...).
// On a laptop, downloads the file.
function exportBackup() {
  const text = JSON.stringify(getBackupData(), null, 2); // the data as readable text
  const fileName = APP_NAME.toLowerCase().replace(/\s+/g, "-") + "-backup-" + todayString() + ".json";
  const file = new File([text], fileName, { type: "application/json" });

  // A touch screen (pointer: coarse) that can share files: use the share menu.
  const isTouchScreen = window.matchMedia("(pointer: coarse)").matches;
  if (isTouchScreen && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: fileName }).catch(function (error) {
      // "AbortError" means the user closed the share menu: that's fine.
      // For any other problem, download the file instead.
      if (error.name !== "AbortError") downloadFile(file);
    });
  } else {
    downloadFile(file);
  }
}

// Downloads a file (the browser saves it, usually to the Downloads folder).
function downloadFile(file) {
  const url = URL.createObjectURL(file); // a temporary web address for the file
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000); // tidy up afterwards
}

// Today's date as text, e.g. "2026-10-25".
function todayString() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return today.getFullYear() + "-" + month + "-" + day;
}

// ===== Import =====

// "Import": opens the browser's file chooser (a hidden file input on the page).
function chooseImportFile() {
  document.getElementById("import-file").click();
}

// Runs when the user has chosen a file: reads it, checks it, then asks what to do.
function handleImportFile(event) {
  const input = event.target;
  const file = input.files[0];
  input.value = ""; // so the same file can be chosen again later
  if (!file) return;

  file.text().then(function (text) {
    const courses = readBackup(text); // see storage.js
    if (!courses) {
      showMessage("This file isn't a valid " + APP_NAME + " backup, so nothing was imported.");
      return;
    }
    askImportChoice(courses);
  }).catch(function () {
    showMessage("Sorry, that file couldn't be read.");
  });
}

// Asks whether to add the backup's courses or replace everything.
function askImportChoice(courses) {
  const existing = getAllCourses().length;
  const message =
    "This backup has " + countText(courses.length) + ". " +
    "Add them to your existing ones, or replace everything? " +
    "Replace everything deletes your current " + countText(existing) + ".";

  askChoice(message, [
    { label: "Add", action: function () { finishImport(courses, false); } },
    { label: "Replace everything", style: "button-danger", action: function () { finishImport(courses, true); } }
  ]);
}

// Saves the imported courses, then shows the main menu and a short message.
function finishImport(courses, replace) {
  if (!importCourses(courses, replace)) { // see storage.js
    showMessage("Sorry, the courses couldn't be saved.");
    return;
  }
  showMainMenu();
  showMessage((replace ? "Replaced everything with " : "Added ") + countText(courses.length) + ".");
}

// "1 course", "3 courses"
function countText(number) {
  return number + (number === 1 ? " course" : " courses");
}

// ===== Buttons =====

document.getElementById("menu-export").addEventListener("click", exportBackup);
document.getElementById("menu-import").addEventListener("click", chooseImportFile);
document.getElementById("import-file").addEventListener("change", handleImportFile);
