// Sounds, played with the browser's built-in sound engine (the Web Audio API).
// The move, capture, check and checkmate sounds are short recordings (see sound-data.js).
// The "incorrect" sound is generated in code. Also the sound on/off setting.

// The browser's sound "engine". Created on the user's first tap, because browsers
// (especially on iPhone) don't allow sound until the user has tapped the page.
let audioContext = null;

// The recorded clips, decoded and ready to play, e.g. clips.move. Filled in once the engine starts.
const clips = {};

// How long after the mating move the checkmate sound plays, in seconds.
// The skull icon (board.js) uses the same delay, so they appear together.
const CHECKMATE_SOUND_DELAY = 0.3;

// Runs on every tap/click/key press: creates the sound engine on the first one,
// and wakes it up if the browser has paused it (e.g. after the iPhone was locked).
function unlockAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // very old browser: no sound
    audioContext = new AudioContextClass();
    decodeClips();
  }
  if (audioContext.state !== "running") {
    audioContext.resume();
  }
}

["touchend", "click", "keydown"].forEach(function (eventName) {
  document.addEventListener(eventName, unlockAudio);
});

// True if sounds can be played right now (sound is on, and the engine has started).
function canPlaySound() {
  return isSoundOn() && audioContext !== null;
}

// ===== The recorded sounds =====

// Turns each clip in SOUND_DATA (text) into sound the engine can play. Runs once.
function decodeClips() {
  Object.keys(SOUND_DATA).forEach(function (name) {
    // Text (base64) -> raw bytes.
    const text = atob(SOUND_DATA[name]);
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i);
    }
    // Raw bytes -> playable sound. (The older "callback" style works on older iPhones too.)
    audioContext.decodeAudioData(bytes.buffer, function (buffer) {
      clips[name] = buffer;
    }, function () {
      console.warn("Couldn't decode the " + name + " sound");
    });
  });
}

// Plays one clip by name ("move", "capture", "check" or "checkmate"), after an optional delay in seconds.
function playClip(name, delay) {
  if (!canPlaySound() || !clips[name]) return;
  const source = audioContext.createBufferSource();
  source.buffer = clips[name];
  source.connect(audioContext.destination);
  source.start(audioContext.currentTime + (delay || 0));
}

// "Move": a wooden piece being put down on a board. Also used when a move is taken back.
function playMoveSound() {
  playClip("move");
}

// Plays the right sound for a move just made (a chess.js move):
// check if it gives check, otherwise capture if it takes a piece, otherwise the normal move sound.
// After a checkmating move, the checkmate sound (the king falling over) follows a moment later.
function playSoundForMove(move) {
  const givesCheck = move.san.indexOf("+") !== -1 || move.san.indexOf("#") !== -1;
  const isCapture = move.flags.indexOf("c") !== -1 || move.flags.indexOf("e") !== -1; // "e" = en passant

  if (givesCheck) {
    playClip("check");
  } else if (isCapture) {
    playClip("capture");
  } else {
    playClip("move");
  }

  if (move.san.indexOf("#") !== -1) {
    playClip("checkmate", CHECKMATE_SOUND_DELAY);
  }
}

// ===== The generated sound =====

// "Incorrect": two soft notes going down, gently fading in and out.
function playIncorrectSound() {
  if (!canPlaySound()) return;
  const now = audioContext.currentTime;

  playSoftNote(330, now);        // E
  playSoftNote(262, now + 0.14); // C, a little later
}

// Plays one soft note of the given pitch (frequency) at the given time.
function playSoftNote(frequency, startTime) {
  const note = audioContext.createOscillator();
  note.type = "sine";
  note.frequency.value = frequency;

  const volume = audioContext.createGain();
  volume.gain.setValueAtTime(0.001, startTime);
  volume.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02); // quick, soft fade in
  volume.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3); // gentle fade out

  note.connect(volume).connect(audioContext.destination);
  note.start(startTime);
  note.stop(startTime + 0.32);
}

// ===== Sound on/off =====

// True if the user has sound switched on (saved setting, see storage.js).
function isSoundOn() {
  return getSettings().soundOn;
}

// Switches sound on or off, saves the choice, and updates the buttons.
function toggleSound() {
  const settings = getSettings();
  settings.soundOn = !settings.soundOn;
  saveSettings(settings);
  updateSoundButtons();
}

// Icons drawn in code (SVG), in the button's own text colour ("currentColor"):
// a speaker with sound waves (sound on), and a speaker with a cross (sound off).
const SPEAKER =
  '<path d="M3.5 9.5 H7.5 L12.5 5 V19 L7.5 14.5 H3.5 Z" fill="currentColor" ' +
  'stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>';
const SOUND_ON_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' + SPEAKER +
  '<path d="M15.5 9 A4 4 0 0 1 15.5 15 M18 6.5 A7.5 7.5 0 0 1 18 17.5" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SOUND_OFF_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' + SPEAKER +
  '<path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// Updates the icon of every sound button (main menu, practice and watch) to match the setting.
function updateSoundButtons() {
  const on = isSoundOn();
  const label = on ? "Sound on (tap to mute)" : "Sound off (tap to turn on)";
  document.querySelectorAll(".sound-toggle").forEach(function (button) {
    button.innerHTML = on ? SOUND_ON_ICON : SOUND_OFF_ICON;
    button.setAttribute("aria-label", label); // read out by screen readers
    button.title = label;                     // shown when hovering with a mouse
  });
}

document.querySelectorAll(".sound-toggle").forEach(function (button) {
  button.addEventListener("click", toggleSound);
});
