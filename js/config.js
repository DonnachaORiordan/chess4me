// App-wide settings, kept in one place so they're easy to change.

// The app's name. Change it here and it changes everywhere.
const APP_NAME = "Chess4Me";

// How long the app waits before playing its move in practice, in milliseconds (1500 = 1.5 seconds).
// Also used when the app plays first.
const MOVE_DELAY = 1500;

// How long watch mode waits before each move, including the first one after pressing Play, in milliseconds.
const WATCH_DELAY = 1500;

// Colour-coding of the user's moves in the move list, by first-try accuracy (in %).
// Below RED_BELOW: red. Below ORANGE_BELOW: orange. Below YELLOW_BELOW: yellow. Otherwise: green.
// Moves never practiced have no colour.
const TINT_RED_BELOW = 50;
const TINT_ORANGE_BELOW = 70;
const TINT_YELLOW_BELOW = 90;

// "Practice weak spots": a user move counts as weak if it has been practiced at least once
// and its first-try accuracy is below this (in %).
const WEAK_SPOT_BELOW = 80;
