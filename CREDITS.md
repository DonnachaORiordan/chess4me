# Credits

Outside libraries, images and sounds used in Chess4Me, with their source and licence.

## Libraries

- **chess.js** version 0.10.3, by Jeff Hlywa. Chess rules (legal moves, check, castling etc.).
  - File: `lib/chess.js`
  - Source: https://github.com/jhlywa/chess.js (downloaded from https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.js)
  - Licence: BSD 2-Clause. The copyright notice is kept at the top of the file.

## Images

- **Chess pieces** ("cburnett" set), by Colin M.L. Burnett (Wikimedia user Cburnett).
  - Files: `assets/pieces/*.svg` (renamed, e.g. `Chess_plt45.svg` → `wP.svg`)
  - Source: Wikimedia Commons, e.g. https://commons.wikimedia.org/wiki/File:Chess_plt45.svg
  - Licence: the author offers a choice of GFDL, BSD or GPL. Chess4Me uses them under the **BSD** licence.

- **App icon** (sketch-style knight): an original drawing made for Chess4Me by Claude Code.
  It's a placeholder.
  - Files: `assets/icons/icon.svg`, and PNG copies `icon-180.png`, `icon-192.png`, `icon-512.png`
    (made from the SVG with the Edge browser).
  - No outside source, so no outside licence.

## Sounds

All four are short clips cut from longer recordings on Freesound.org, all under the
**Creative Commons 0 (CC0)** licence (public domain: free to use and change, no conditions).
Each clip is one tap from the recording, made mono, with its edges faded and its volume evened
out. Files: `assets/sounds/*.wav`; the app plays the same clips from `js/sound-data.js`.

- **Move** (`move.wav`): "Chess piece setting 1" by Alnotreally.
  - Source: https://freesound.org/people/Alnotreally/sounds/801349/
- **Capture** (`capture.wav`): "Chess_foley_1.mp3" by Amatsuuu.
  - Source: https://freesound.org/people/Amatsuuu/sounds/629182/
- **Check** (`check.wav`): "chess pieces.wav" by simone_ds (one of the harder put-downs).
  - Source: https://freesound.org/people/simone_ds/sounds/366065/
- **Checkmate** (`checkmate.wav`): "Forcefully knocking over chess piece, with roll FINAL.wav" by mht23SD.
  - Source: https://freesound.org/people/mht23SD/sounds/707342/

The "incorrect" sound is generated in code (`js/sounds.js`), so it has no outside source.
