// Sounds, generated in code with the browser's built-in synthesiser (the Web Audio API),
// so no sound files are needed. Also the sound on/off setting.

// The browser's sound "engine". Created on the user's first tap, because browsers
// (especially on iPhone) don't allow sound until the user has tapped the page.
let audioContext = null;

// A short burst of random noise, used for the "click" of the move sound (made once, then reused).
let noiseBuffer = null;

// Runs on every tap/click/key press: creates the sound engine on the first one,
// and wakes it up if the browser has paused it (e.g. after the iPhone was locked).
function unlockAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // very old browser: no sound
    audioContext = new AudioContextClass();
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

// ===== The two sounds =====

// "Move": a short wooden knock, like a piece being put down on a board.
// It mixes a filtered click (the hard "tock") with a quick low tone (the hollow body of the wood).
function playMoveSound() {
  if (!canPlaySound()) return;
  const now = audioContext.currentTime;

  // Make the noise burst the first time it's needed.
  if (!noiseBuffer) {
    const length = Math.floor(audioContext.sampleRate * 0.06); // 0.06 seconds
    noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = Math.random() * 2 - 1;
    }
  }

  // The click: noise, filtered so only a woody middle range is left, fading out very fast.
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1100;
  filter.Q.value = 3;
  const clickVolume = audioContext.createGain();
  clickVolume.gain.setValueAtTime(0.9, now);
  clickVolume.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(filter).connect(clickVolume).connect(audioContext.destination);

  // The body: a low tone dropping slightly in pitch, also fading out fast.
  const tone = audioContext.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(220, now);
  tone.frequency.exponentialRampToValueAtTime(140, now + 0.08);
  const toneVolume = audioContext.createGain();
  toneVolume.gain.setValueAtTime(0.5, now);
  toneVolume.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  tone.connect(toneVolume).connect(audioContext.destination);

  noise.start(now);
  tone.start(now);
  tone.stop(now + 0.12);
}

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

// Updates the text of every sound button (main menu and practice) to match the setting.
function updateSoundButtons() {
  const text = isSoundOn() ? "Sound: on" : "Sound: off";
  document.querySelectorAll(".sound-toggle").forEach(function (button) {
    button.textContent = text;
  });
}

document.querySelectorAll(".sound-toggle").forEach(function (button) {
  button.addEventListener("click", toggleSound);
});
