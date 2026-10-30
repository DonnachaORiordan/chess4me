# Chess4Me – Specification

This file describes exactly what Chess4Me should do and look like.
Claude Code: read this whole file before starting any work.
If something here is unclear or seems wrong, ASK the user before guessing.

NOTE: Version 1 is complete (sections 1–14). Version 2 is described in
sections 15–23. Where a version 2 section differs from an earlier section,
the version 2 section wins. When a version 2 build step changes behaviour
described in an earlier section, update that earlier section too, so this
file always describes the app as it really is.

---

## 1. What the app is

Chess4Me is a chess opening trainer. The user builds "courses" (openings) by
entering moves on a board, then practises them: the user plays their own
colour's moves, and the app plays the prepared replies for the other colour.

- Personal use for now. Might go on the App Store one day.
- Built as a progressive web app (PWA): a website that can be added to the
  iPhone home screen and behaves like an app.
- Main device: iPhone, held upright (portrait). Must also work in a laptop
  browser (Chrome/Edge on Windows), which is where it will be built and tested.
- It should feel smooth, clean and satisfying to use, in the spirit of
  chess.com's look and feel (without copying chess.com's graphics or sounds).

---

## 2. Technology rules

- Plain HTML, CSS and JavaScript only. No frameworks (React, Vue etc.), no
  build tools, no npm build step. The user is a beginner and has learned
  basic HTML/CSS/JS.
- Use classic `<script src="...">` tags, NOT JavaScript modules
  (`type="module"`), so the app works when index.html is opened by
  double-clicking it (file://) during development.
- Libraries:
  - chess.js for all chess rules (legal moves, castling, en passant,
    promotion, check). Licence: BSD (fine to use).
  - Draw the board ourselves with HTML/CSS (simple, full control, no licence
    issues). Do NOT use Lichess's chessground (GPL licence).
  - Chess piece images: a free set with a permissive licence (for example
    Colin M.L. Burnett's set, which is available under a BSD licence).
  - Before adding ANY library, image set or sound file, tell the user what it
    is and its licence, and wait for approval. Prefer MIT/BSD/CC0 licences.
    Avoid GPL.
- Download library files into the project's `lib/` folder (do not load them
  from the internet), so the app can later work offline.
- Record every outside library, image and sound, with its source and
  licence, in `CREDITS.md`.

---

## 3. Folder structure

```
chess4me/
  index.html        the app's single page
  SPEC.md           this file
  CLAUDE.md         standing instructions for Claude Code
  CREDITS.md        sources and licences of outside files
  manifest.json     PWA settings (added in a later step)
  sw.js             service worker for offline support (must be in the top
                    folder so it covers the whole app)
  css/
    style.css
  js/
    config.js       app name and settings (e.g. APP_NAME = "Chess4Me")
    storage.js      ALL saving/loading code lives here and only here
    sound-data.js   the recorded sound clips, stored as text
    sounds.js       playing sounds, and the sound on/off setting
    board.js        drawing the board and handling taps
    practice.js     practice mode
    editor.js       creating and editing courses
    explorer.js     the course explorer (browsing a course, its stats and buttons)
    app.js          menus and moving between screens
  lib/              outside libraries (e.g. chess.js)
  assets/
    pieces/         piece images
    sounds/         sound files
    icons/          app icons
```

Files can be split differently if there's a good reason, but explain why first.

---

## 4. The app name

- The name is "Chess4Me" for now.
- It must be stored in ONE place (`js/config.js`, and `manifest.json` once it
  exists) so it can be changed easily later. Never hard-code the name anywhere
  else.

---

## 5. Look and feel

- Colours: match the user's earlier practice page. Read
  `../practice/web-basics/style.css` for the palette (cream background, green
  headings, rounded green buttons). Ask permission before reading it, since
  it is outside this folder.
- Board: light squares cream, dark squares green, similar to chess.com's
  classic green board.
- Clean, modern, uncluttered. Rounded buttons. Large enough to tap easily on
  an iPhone (at least 44px tall).
- Smooth piece movement (short slide animation, not an instant jump).
- Layout: the move list goes NEXT TO the board when there's room (laptop,
  landscape). On an upright iPhone the board fills the screen width, so the
  move list goes directly BELOW the board.
- Must include the viewport meta tag so it fits phone screens.

---

## 6. Screens

### 6.1 Main menu
- Shows the app name at the top.
- A list of course cards. Each card shows:
  - On the far left: a square box filled in the colour the user plays
    (a white box for White, a black box for Black).
  - Then the course name.
  - A small performance summary (see section 9).
- Tapping a card opens that course's page (6.2).
- Buttons: "New course", "Export", "Import", and a sound on/off toggle.
- The user expects to redesign this screen later, so keep its code tidy and
  easy to change.

### 6.2 Course page
- Shows the course name and colour.
- Buttons: "Practice", "Watch", "Edit", "Delete".
- Delete asks for confirmation first ("Delete Italian Game? This can't be
  undone.").
- REPLACED in version 2 (build step 6) by the course explorer, section 19
  (`js/explorer.js`). Delete keeps the same confirmation there.

### 6.3 Course editor (creating or editing a course)
- Fields: course name, and which colour the user plays (White/Black).
- A board where the user enters the moves for BOTH colours, in order, by
  tapping a piece and then tapping the square it should go to.
- Only legal moves are allowed (chess.js).
- Pawn promotion: show a small choice of pieces (queen, rook, bishop, knight).
- The move list is shown next to/below the board. It shows the whole tree,
  with side lines (section 17.4).
- Back and forward arrows (forward follows the main line at splits).
- "Undo last move" button: removes the current move, only if it is the end
  of a line (otherwise greyed out).
- Tapping any move in the move list jumps to the position after it
  (section 17.2) and opens its comment box, where the user can add, edit or
  delete a comment. Comments are optional. The box isn't focused
  automatically, so the iPhone keyboard only appears when the user taps it.
- "Save" and "Cancel" buttons.
- Editing an existing course opens it at the end of the main line, with its
  moves already played on the board.

### 6.4 Practice mode
- The board is always shown with the user's colour at the bottom.
- The app plays the other colour's moves automatically, 1.5 seconds after the
  user's move (or 1.5 seconds after starting, if the other colour moves first).
  The 1.5 seconds is a setting in `config.js` (MOVE_DELAY).
- To move, the user taps a piece (it gets highlighted and its legal
  destination squares show small dots), then taps a destination square.
  Tapping the piece again, or another of their own pieces, changes the
  selection.
- Illegal moves are simply not allowed (the piece doesn't move). They do not
  count as mistakes.
- If the move is correct: play the "move" sound, keep the move, and show the
  comment for that move if there is one.
- If the move is legal but wrong:
  - The piece moves to the square it was sent to.
  - A red circle with a white X pops up (on or near the destination square).
  - The "incorrect" sound plays.
  - The piece slides back, and the user tries again.
  - This counts as a mistake (section 9).
- Comments for the app's own moves also show after the app plays them.
- Comments appear in a small box below the board and stay until the next move.
- "Hint" button: highlights the piece the user should move. Counts as a hint
  used.
- "Show move" button: plays the correct move for the user. Counts as a move
  shown.
- The move list shows the moves played so far.
- End of the line:
  - A green circle with a white tick pops up. If the line ends in
    checkmate, the skull beside the checkmated king shows instead (16.2),
    and the game is over.
  - Two buttons appear: "Restart" and "Main menu".
- A small "back" button at the top returns to the course page at any time.

### 6.5 Watch mode
- A forward and back arrow to control when to show next move
- There should also be a button that plays through the whole line automatically, both colours, one move every
  1.5 seconds, with the move sound. After pressing Play it waits 1.5 seconds before the first move too
  (setting WATCH_DELAY in `config.js`). It should be interuptable with a ppuase button, and a back and forward button. Should then also be able to continue the automatic play through.
- Board shown from the user's colour.
- Buttons: Play/Pause, Back one move, Forward one move, Restart.
- Comments show as their move is reached.

---

## 7. Sounds

- "Move" sound: like a wooden piece being put down on a real board.
  Plays for every move (the user's and the app's), and when a move is taken
  back (Back / Undo).
- "Capture" sound: played instead of the move sound when a piece is captured
  (including en passant). Castling uses the move sound.
- "Check" sound: played instead of the move sound when a move gives check.
  If a move captures AND gives check, the check sound plays.
- "Checkmate" sound: a piece falling over on a wooden board. After a mating
  move, that move's own sound (the check sound) plays, then the checkmate
  sound 0.3 seconds later.
- Move, capture, check and checkmate are short recorded clips (CC0, from
  Freesound.org, see CREDITS.md), kept in `assets/sounds/` and stored as text
  in `js/sound-data.js` so they also work when index.html is double-clicked.
- "Incorrect" sound: clearly signals a mistake, but soft and NOT irritating.
- Both must come from free, reusable sources (check the licence, ask the
  user, add to CREDITS.md). Do NOT use chess.com's sounds.
- A sound on/off toggle (main menu, and also easy to reach in practice and
  watch). The choice is saved. It's shown as an icon: a speaker with sound
  waves when sound is on, a speaker with a cross when it's off (16.4).
- Note: iPhones only allow sound after the user has tapped the page at least
  once. Handle this so sounds work reliably.

---

## 8. Data

### 8.1 Storage
- Stored only on the device, in the browser's storage (localStorage).
- ALL reading and writing of saved data goes through `js/storage.js` and
  nowhere else. This is so a future version can swap to an online database
  with user accounts by replacing just this file.

### 8.2 Course format
Even though version 1 only builds single lines, store moves as a TREE from
the start, so branches can be added in version 2 without converting data.

Each course has:
- `id` (unique)
- `name`
- `colour` ("white" or "black")
- `description` (optional, empty for now; may be shown on cards later)
- `moves`: a tree of move nodes. Each node has:
  - `move` (in standard notation, e.g. "Nf3")
  - `comment` (optional text)
  - `children` (the possible next moves; the first one is the main line,
    any others are side lines)
  - `name` (optional: a side line's name, on its first move, e.g.
    "Two Knights Defence". Only saved if the move has a name.)
- `stats` (section 9)
- `created` and `updated` dates

Include a version number in the saved data (now `dataVersion: 2`, see
section 21) so the format can be upgraded safely later.

### 8.3 Starting example
On first launch (no saved data yet), create one example course:

- Name: "Italian Game", colour: White
- Moves: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4
- Example comments:
  - on 3.Bc4: "The bishop aims at f7, Black's weakest square."
  - on 4.c3: "Preparing d4 to take over the centre."

The user can edit or delete it like any other course.

---

## 9. Performance measure

Per course, track:
- times practised (started)
- times completed
- mistakes (wrong legal moves)
- hints used and moves shown
- accuracy: correct moves on the first try ÷ all the user's moves, as a %
- date last practised
- per move: how many times it was got wrong (for future "practice my weak
  moves" features). Since dataVersion 2 this is part of the per-position
  stats (section 20.1).

On the main menu card, show a short summary, e.g. "Accuracy 86% · Practised 12
times". Keep it subtle.

---

## 10. Export and import (backup)

- "Export": saves all courses (and stats) as one JSON file named like
  `chess4me-backup-2026-10-24.json`. On iPhone, open the share menu
  (so it can be saved to Files/iCloud Drive or AirDropped). On a laptop,
  download the file.
- "Import": choose a backup file. Check it is a valid Chess4Me backup first.
  Ask: "Add these courses to your existing ones, or replace everything?"
  Never lose data without a clear confirmation.

---

## 11. Becoming an iPhone app (PWA)

- `manifest.json` with the app name, colours and icons.
- App icon: an original, simple sketch-style chess piece (e.g. a knight),
  drawn by Claude Code as an SVG and converted to the PNG sizes iPhones need.
  Placeholder for now; may be replaced later.
- Apple-specific tags so it looks right when added to the iPhone home screen
  (icon, full screen, status bar colour).
- Offline support with a service worker. Do this as one of the LAST steps of
  version 1, because caching can make testing confusing. Make sure updates
  reach the phone (use a version number in the cache name).
- Hosting: GitHub Pages, from a PUBLIC GitHub repo. Never put passwords, keys
  or personal information in the code.

---

## 12. Not in version 1 (planned for later)

Version 2 (now fully planned in sections 15–23):
- Branches: more than one prepared reply at a position.
- Course explorer: walk through a course's moves, choose a branch at each
  split, then "Practice from here" (random branches after this point) or
  "Practice this line only".
- Adding branches in the editor: go to a position and play a different move.
- In practice, when there are several prepared replies, pick one at random.
- For the performance measure, users should be able to go along the tree and see the stats update at each stage as they click through the branches.

Later:
- PGN import/export.
- Chess engine / evaluation bar (Stockfish). Note: Stockfish's GPL licence
  matters if the app is ever distributed.
- Spaced repetition (including "smart" random choice that favours lines
  practiced least or with the most mistakes).
- Transpositions (different move orders reaching the same position treated
  as one position). For now they are just separate branches.
- User accounts and syncing between devices.
- Course descriptions on cards and a redesigned main menu.
- Duplicating courses, sorting/searching courses.

---

## 13. Build plan (version 1)

Build ONE step at a time. Each step should end with something the user can
see working in the browser. The user commits after each step.

- [x] 1. Project skeleton: folders, index.html, style.css, config.js, and an
         empty board drawn on screen in the right colours.
- [x] 2. Add chess.js and piece images. Show the starting position.
         Tap-to-move with highlights and legal-move dots.
- [x] 3. storage.js, the course data format, and the example Italian Game course.
- [x] 4. Main menu and course page, with switching between screens.
- [x] 5. Practice mode: correct/wrong moves, the app's automatic replies,
         board flipping, end of line.
- [x] 6. Feedback: red X, green tick, slide animations, sounds, mute toggle.
- [x] 7. Hint and Show move buttons. Comments shown during practice.
- [x] 8. Put it online with GitHub Pages so it can be tested on the iPhone.
- [x] 9. Watch mode.
- [x] 10. Course editor: new course, edit, delete, comments, promotion.
- [x] 11. Performance stats and the summary on menu cards.
- [x] 12. Export and import.
- [x] 13. App icon, manifest and iPhone home-screen tags.
- [x] 14. Offline support (service worker).
- [x] 15. Polish pass on the iPhone: spacing, tap sizes, smoothness.

Tick a step ONLY after the user confirms it works.

---

## 14. Checklist: version 1 is done when…

- [x] I can add Chess4Me to my iPhone home screen and it opens like an app.
- [x] It opens and works with no internet.
- [x] The main menu lists my courses with a colour box, name and stats.
- [x] I can create a course by tapping moves for both sides, add comments,
      save it, edit it and delete it.
- [x] In practice my colour is at the bottom, the app replies after 3 seconds,
      a wrong move shows the red X, plays a soft sound and goes back.
- [x] Hint highlights the right piece; Show move plays it for me.
- [x] Finishing shows the green tick with Restart and Main menu.
- [x] Watch mode plays the line through.
- [x] Move and incorrect sounds work and can be muted.
- [x] Stats update after practising.
- [x] I can export a backup and import it again.

---
---

# VERSION 2

## 15. Version 2 overview

Version 2 adds to the SAME app (same repo, same address, same home-screen
icon). It is not a separate app. It adds:

1. A set of small improvements to version 1 (section 16).
2. Branches: a course can have more than one prepared reply for the
   opponent at a position (section 17).
3. Practice with random branch choice (section 18).
4. The course explorer, which replaces the course page (section 19).
5. Stats for every position in the tree, with colour-coded moves (section 20).
6. "Cover every line" and "Practice weak spots" modes (sections 18.4, 18.5).

All the rules from sections 1–11 still apply (plain HTML/CSS/JS, no modules,
licences checked and approved before downloading anything, CREDITS.md, all
saving in storage.js, app name only in config.js and manifest.json).

Whenever app files change and are pushed, bump the service worker's cache
version so the iPhone picks up the update.

---

## 16. Small improvements to version 1

### 16.1 Sounds
- New "move" sound: the current one doesn't sound like wood. Find 2 or 3
  free, permissively licensed options that sound like a wooden piece put down
  on a real board, and let the user listen and choose.
- New "capture" sound, played instead of the move sound when a piece is
  captured. Castling uses the normal move sound.
- New "check" sound, played instead of the move sound when a move gives
  check. Applies to both colours' moves, in every mode (practice, watch,
  editor, explorer).
- New "checkmate" sound: like a piece (the king) falling over on a wooden
  board. Played after the mating move.
- All new sounds follow section 7's rules (free, licence checked, user
  approves, added to CREDITS.md, respects the mute setting).

### 16.2 Checkmate
- When a move gives checkmate, a small black circle with a white skull icon
  pops up beside the checkmated king: exactly the same size and positioning
  as the red X icon for a wrong move. The checkmate sound plays. The skull
  pops up at the same moment as the checkmate sound (0.3 seconds after the
  mating move), not with the move sound.
- The skull icon is drawn by Claude Code as an original SVG (no licence
  issues), in the same style as the red X and green tick.
- Shown in practice, watch, the editor and the explorer.
- In practice, if the line ends in checkmate, the skull replaces the green
  tick, then the usual "Restart" and "Main menu" buttons appear. The game is
  over: no more moves can be made.

### 16.3 Board coordinates
- Small, subtle labels on the board edges: letters (a–h) along the bottom
  row and numbers (1–8) up the left column, drawn INSIDE the edge squares
  (chess.com style).
- Label colour contrasts subtly with its square (cream text on green squares,
  green text on cream squares).
- They flip with the board: when the user plays Black, "h" is on the left
  and "8" is at the bottom.
- Shown on every board (practice, watch, editor, explorer).

### 16.4 Sound icon
- Replace the sound on/off text button with an icon: a speaker icon when
  sound is on, a speaker with a cross (muted) icon when sound is off.
- Use the icon everywhere the toggle appears (main menu and beside the board).
- Icons drawn by Claude Code as original SVGs.
- At least 44px tap area.

### 16.5 Timing
- The app's reply delay in practice changes from 3 seconds to 1.5 seconds,
  including when the app plays first.
- Watch mode waits 1.5 seconds before playing the first move (instead of
  playing it instantly), and 1.5 seconds between moves.
- Both values are settings in `config.js`.

### 16.6 Spelling
- Everywhere the user can see text, use "practice", "practiced" and
  "practicing" (never "practise" or "practised"). This includes buttons,
  stats text and messages.

### 16.7 Board shadow
- Keep the board's current shadow as it is. No change.

---

## 17. Branches

### 17.1 How branches work
- A course is a tree of moves. A "branch" (or "side line") is where the
  OPPONENT has more than one prepared reply at a position.
- The user's own moves never branch: for each position, the user has exactly
  ONE planned move.
- Branches can happen at any depth, including the very first move (e.g. a
  Black course with prepared answers to both 1.e4 and 1.d4).
- Each position with several opponent replies has one "main line" reply
  (the first one added) and one or more side lines.

### 17.2 Adding branches in the editor
- The user can tap ANY move in the move list to jump to the position after
  that move. The board shows that position and the move is highlighted.
- Playing a move from that position:
  - If that move already exists there, the editor simply follows it.
  - If it is an OPPONENT move that doesn't exist yet, it is added as a new
    side line.
  - If it is a USER move and a different user move already exists there, ask:
    "Replace 4.c3 with 4.d3? This deletes the 5 moves after it." Only replace
    if the user confirms.
- The forward/back arrows in the editor follow the main line at splits.
- (Done in build step 3:) a new opponent move at a position that has no
  replies yet simply continues the line. "Undo last move" already follows
  the 17.3 rule (end of a line only).

### 17.3 Managing branches in the editor
- "Make main line": promotes a side line to be the main line at its split.
- "Delete from here": deletes the selected move and everything after it,
  with a confirmation that says how many moves will be deleted
  (e.g. "Delete 3...Nf6 and the 6 moves after it?"). Deleting the very first
  move of the course is not allowed this way (use Delete course instead).
- "Undo last move" removes the selected move only if it is the end of a line;
  otherwise it is disabled or hidden (use "Delete from here").
- Optional line names: the user can give a name to the first move of a side
  line (e.g. "Two Knights Defence"). The name is shown next to that move in
  the move list and the explorer.
- Comments work as before, on any move.
- (Done in build step 4:) "Make main line" works on the side line the
  current move is in, at its nearest split; for a side line inside a side
  line, pressing it again promotes it further. "Delete from here" is only
  blocked for the course's ONLY first move (a side line on move 1, e.g.
  1. d4 next to 1. e4, can be deleted). The line name box appears in the
  comment panel when the first move of a side line is tapped.

### 17.4 Move list display (all screens)
- Show the whole tree, chess.com style:
  - The main line is written normally.
  - Side lines appear in brackets, indented, directly under the move where
    they split, in a slightly muted colour. E.g.:
    ```
    1. e4 e5
    2. Nf3 Nc6
    3. Bc4 Bc5
       (3... Nf6 4. Ng5)
    4. c3 Nf6
    5. d4 exd4
    ```
  - Side lines inside side lines are indented further.
- Tapping any move jumps to it. The current move is highlighted.
- On the iPhone, the list scrolls below the board if it gets long.
- The user may want to try a simpler "current line only" view later; keep the
  move list code in one place so it's easy to change.

---

## 18. Practice with branches

### 18.1 Random branch choice
- When the app reaches a split, it chooses which opponent reply to play at
  random.
- Each complete line in the course has an EQUAL chance of being chosen
  (not 50/50 at each split, which would favour short side lines). Work out
  the line before or during play so this holds.
- Avoid playing exactly the same complete line twice in a row (when the
  course has more than one line).
- (Done in build step 5:) the line is chosen at the start, at random from
  all complete lines (each equally likely). The last line practiced in each
  course is remembered until the app is closed, so Restart never repeats it
  straight away. Hint and Show move follow the chosen line. Per-position
  stats are recorded as moves are played (20.1). Until the explorer arrives
  (steps 6 and 7), the course page's Practice button is "Practice all".

### 18.2 Practice all
- Starts from the beginning of the course, with random branches all the way.

### 18.3 Practice from here / Practice this line only (from the explorer)
- The user first picks a position in the explorer by tapping a move (section
  19). The route from the start to that move is the "chosen route".
- In BOTH modes, practice starts from move 1. The user plays their own moves
  all the way, and the app plays the opponent moves along the chosen route
  (not random). These moves count towards the stats like any other.
- "Practice from here": after the chosen position, any further splits are
  random (section 18.1).
- "Practice this line only": after the chosen position, follow the main line
  at every split to the end.

### 18.4 Cover every line
- Goes through every complete line in the course once, in random order.
- Shows progress, e.g. "Line 3 of 7".
- After each line ends (green tick or skull), a "Next line" button continues.
- At the end, shows a short summary: lines done, accuracy, mistakes.
- Can be stopped at any time with the back button.

### 18.5 Practice weak spots
- Practices only the lines that contain the user's weakest moves: user moves
  with a first-try accuracy below a threshold (setting in config.js, default
  80%), and that have been practiced at least once.
- Lines with weaker moves are more likely to be chosen.
- If there are no weak spots, show a friendly message (e.g. "No weak spots
  right now. Nice work.").

### 18.6 Everything else stays the same
- Red X for wrong moves, hints, show move, comments, end of line, sounds,
  user's colour at the bottom, all as in section 6.4 (with the 1.5 second
  delay from 16.5).

---

## 19. Course explorer (replaces the course page)

Tapping a course card on the main menu opens the explorer. It's for browsing
the course, not being tested.

- Top bar: back arrow (to main menu), course name, colour box, sound icon.
- The board, with the user's colour at the bottom.
- Arrows under the board: Start, Back one move, Forward one move. At a split,
  Forward follows the main line.
- The move list (section 17.4). Tapping any move jumps the board there; this
  is how the user picks a branch. When the explorer opens, it starts at the
  beginning (no moves played).
- Comments for the current move are shown.
- A small stats box for the current position (section 20.2).
- Buttons:
  - "Practice from here" (section 18.3)
  - "Practice this line only" (section 18.3)
  - "Watch this line": watch mode (section 6.5) along the chosen route, then
    the main line to the end.
  - "Practice all" (section 18.2)
  - "Cover every line" (section 18.4)
  - "Practice weak spots" (section 18.5)
  - "Edit" and "Delete" (Delete keeps its confirmation).
- Main actions are big, easy-to-tap buttons. Less-used ones (Edit, Delete)
  are smaller.
- The user will try this layout and probably adjust it.
- (Done in build step 6:) the explorer has "Practice all", a temporary
  "Watch" (main line) until step 7 adds "Watch this line", and smaller
  "Edit" and "Delete". The board is for looking only (taps do nothing).
  Stats box: "Reached N times" (or "Practiced N times" at the start),
  "This move: N mistakes · N hints · N shown" on the user's moves, and
  "Accuracy from here" over all the user's moves after this point.

---

## 20. Stats (version 2)

### 20.1 What is tracked
- Everything from section 9, per course.
- Per move node (every position in the tree):
  - times reached in practice
  - for the user's moves: times answered correctly on the first try,
    mistakes, hints used, moves shown
- Course card summary on the main menu: "Accuracy 86% · Practiced 12 times
  · 5 lines".

### 20.2 Stats while browsing the explorer
As the user moves through the tree, the stats box updates to show, for the
current position:
- times this position was reached
- accuracy from here onwards (all the user's moves after this point)
- mistakes on this move
- hints and moves shown on this move
Keep it small and subtle.

### 20.3 Colour-coded moves
- In the move list (explorer and practice), the user's moves are tinted
  subtly by first-try accuracy: red (poorly known), through orange/yellow,
  to green (well known).
- Moves never practiced have no tint. Opponent moves have no tint.
- The thresholds are settings in config.js (TINT_RED_BELOW 50,
  TINT_ORANGE_BELOW 70, TINT_YELLOW_BELOW 90; first-try accuracy in %).

---

## 21. Data upgrade

- The saved data format becomes `dataVersion: 2`.
- On first launch of version 2, storage.js upgrades existing version 1 data
  automatically:
  - Keep every course, its name, colour, moves and comments exactly.
  - RESET all stats to zero (the user has chosen this) and set up the new
    per-node stats.
- Importing a version 1 backup file upgrades it the same way.
- Export saves in the version 2 format.
- Never lose courses or moves during the upgrade.
- Before the first version 2 push, the user will export a backup from the
  home-screen app.
- How it's stored (done in build step 2):
  - Per-position stats live in the course's stats, as `stats.nodes`, labelled
    by the moves leading to the position including its own move, e.g.
    `"e4 e5 Nf3"`. They are NOT stored inside the move tree, because the
    editor rebuilds the tree when a course is saved. Each entry has
    `reached`, `correctFirstTry`, `mistakes`, `hintsUsed`, `movesShown`.
    A position with no entry has all-zero stats.
  - The old `stats.moveMistakes` is replaced by `stats.nodes[...].mistakes`.
  - The course-level stat names keep their old spelling (`timesPractised`,
    `lastPractised`), as they are saved data, not text the user sees.
  - Before upgrading, storage.js keeps an untouched copy of the old data in
    the browser's storage under `chess4me-data-v1-copy`, as a safety net.

---

## 22. Build plan (version 2)

Build ONE step at a time, as with version 1. Each step ends with something
the user can see working. The user commits after each step (and after each
part of step 1).

- [x] 1. Version 1 improvements (section 16). Do them in this order, one
         part at a time, waiting for the user to try and commit each part:
         a) Sounds: new move sound (offer 2–3 options), capture, check,
            checkmate sounds. — 1a done
         b) Checkmate skull icon and end of game. — 1b done
         c) Board coordinates, sound/mute icons, 1.5 second timings,
            spelling changes. — 1c done
- [x] 2. Data upgrade to dataVersion 2 (section 21), with per-node stats.
         Existing courses still load and practice as before; stats reset.
- [x] 3. Editor: jump to any move, add side lines, own-move replace
         confirmation, and the branched move list display (17.2, 17.4).
- [x] 4. Editor: make main line, delete from here, undo rules, line names
         (17.3).
- [x] 5. Practice all with random branch choice, equal chance per line, no
         repeat (18.1, 18.2), recording per-node stats.
- [x] 6. Course explorer: board, arrows, move list, comments, stats box,
         colour-coded moves (19, 20.2, 20.3). Replaces the course page.
- [ ] 7. Explorer actions: Practice from here, Practice this line only,
         Watch this line (18.3, 19).
- [ ] 8. Cover every line (18.4).
- [ ] 9. Practice weak spots (18.5) and the new course card summary (20.1).
- [ ] 10. Polish pass on the iPhone (spacing, tap sizes, long move lists,
          smoothness), bump the service worker version, final push.

Tick a step ONLY after the user confirms it works.

---

## 23. Checklist: version 2 is done when…

- [ ] Moves sound like wood; captures, checks and checkmates have their own
      sounds, and all can be muted with the sound icon.
- [ ] Checkmate shows the skull icon beside the king and ends the game.
- [ ] The board shows coordinates, flipped correctly when I play Black.
- [ ] The app replies after 1.5 seconds; watch waits 1.5 seconds first.
- [ ] All text says "practice"/"practiced".
- [ ] My existing courses survived the upgrade (stats reset to zero).
- [ ] In the editor I can jump to any move, add side lines for the
      opponent, promote, delete and name lines.
- [ ] Practice picks random lines, each with an equal chance.
- [ ] The explorer lets me browse the tree, see stats per position, and see
      my moves colour-coded from red to green.
- [ ] I can pick a line in the explorer and use Practice from here,
      Practice this line only and Watch this line.
- [ ] Cover every line goes through each line once.
- [ ] Practice weak spots drills the moves I get wrong.
- [ ] Export and import still work, including old version 1 backups.
- [ ] It all works on my iPhone home-screen app, offline.
