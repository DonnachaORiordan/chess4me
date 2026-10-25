# Chess4Me – Specification

This file describes exactly what Chess4Me should do and look like.
Claude Code: read this whole file before starting any work.
If something here is unclear or seems wrong, ASK the user before guessing.

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
  css/
    style.css
  js/
    config.js       app name and settings (e.g. APP_NAME = "Chess4Me")
    storage.js      ALL saving/loading code lives here and only here
    board.js        drawing the board and handling taps
    practice.js     practice mode
    editor.js       creating and editing courses
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
- (Version 2: this becomes the course explorer, see section 12.)

### 6.3 Course editor (creating or editing a course)
- Fields: course name, and which colour the user plays (White/Black).
- A board where the user enters the moves for BOTH colours, in order, by
  tapping a piece and then tapping the square it should go to.
- Only legal moves are allowed (chess.js).
- Pawn promotion: show a small choice of pieces (queen, rook, bishop, knight).
- The move list is shown next to/below the board.
- "Undo last move" button.
- Comments: the user can tap any move in the move list and add, edit or
  delete a comment for it. Comments are optional.
- "Save" and "Cancel" buttons.
- Editing an existing course opens it with its moves already played on the
  board, so moves can be added to the end or undone.

### 6.4 Practice mode
- The board is always shown with the user's colour at the bottom.
- The app plays the other colour's moves automatically, 3 seconds after the
  user's move (or 3 seconds after starting, if the other colour moves first).
  The 3 seconds is a setting in `config.js`.
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
  - A green circle with a white tick pops up.
  - Two buttons appear: "Restart" and "Main menu".
- A small "back" button at the top returns to the course page at any time.

### 6.5 Watch mode
- A forward and back arrow to control when to show next move
- There should also be a button that plays through the whole line automatically, both colours, one move every
  few seconds (same delay setting), with the move sound. It should be interuptable with a ppuase button, and a back and forward button. Should then also be able to continue the automatic play through.
- Board shown from the user's colour.
- Buttons: Play/Pause, Back one move, Forward one move, Restart.
- Comments show as their move is reached.

---

## 7. Sounds

- "Move" sound: like a wooden piece being put down on a real board.
  Plays for every move (the user's and the app's).
- "Incorrect" sound: clearly signals a mistake, but soft and NOT irritating.
- Both must come from free, reusable sources (check the licence, ask the
  user, add to CREDITS.md). Do NOT use chess.com's sounds.
- A sound on/off toggle (main menu, and also easy to reach in practice).
  The choice is saved.
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
  - `children` (the possible next moves; in version 1 always zero or one)
- `stats` (section 9)
- `created` and `updated` dates

Include a version number in the saved data (e.g. `dataVersion: 1`) so the
format can be upgraded safely later.

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
- per move: how many times it was got wrong (for future "practise my weak
  moves" features)

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

Version 2:
- Branches: more than one prepared reply at a position.
- Course explorer: walk through a course's moves, choose a branch at each
  split, then "Practise from here" (random branches after this point) or
  "Practise this line only".
- Adding branches in the editor: go to a position and play a different move.
- In practice, when there are several prepared replies, pick one at random.
- For the performance measure, users should be able to go along the tree and see the stats update at each stage as they click through the branches.

Later:
- PGN import/export.
- Chess engine / evaluation bar (Stockfish). Note: Stockfish's GPL licence
  matters if the app is ever distributed.
- Spaced repetition.
- User accounts and syncing between devices.
- Course descriptions on cards and a redesigned main menu.

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
- [ ] 13. App icon, manifest and iPhone home-screen tags.
- [ ] 14. Offline support (service worker).
- [ ] 15. Polish pass on the iPhone: spacing, tap sizes, smoothness.

Tick a step ONLY after the user confirms it works.

---

## 14. Checklist: version 1 is done when…

- [ ] I can add Chess4Me to my iPhone home screen and it opens like an app.
- [ ] It opens and works with no internet.
- [ ] The main menu lists my courses with a colour box, name and stats.
- [ ] I can create a course by tapping moves for both sides, add comments,
      save it, edit it and delete it.
- [ ] In practice my colour is at the bottom, the app replies after 3 seconds,
      a wrong move shows the red X, plays a soft sound and goes back.
- [ ] Hint highlights the right piece; Show move plays it for me.
- [ ] Finishing shows the green tick with Restart and Main menu.
- [ ] Watch mode plays the line through.
- [ ] Move and incorrect sounds work and can be muted.
- [ ] Stats update after practising.
- [ ] I can export a backup and import it again.
