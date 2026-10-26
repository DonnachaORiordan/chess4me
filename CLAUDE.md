# Instructions for Claude Code

## Start of every session
- Read SPEC.md first. It describes exactly what Chess4Me should be.
- Version 1 is COMPLETE (build plan in section 13, all ticked). Don't redo
  or change version 1 work unless a version 2 step asks for it.
- We are now building VERSION 2. Its plan is in SPEC.md sections 15–23.
  Check the version 2 build plan (SPEC.md section 22) to see which step
  (or part of a step) is next.
- Where a version 2 section of SPEC.md differs from an earlier section, the
  version 2 section wins. When a step changes behaviour described in an
  earlier section, update that earlier section too.

## About me
- I'm a complete beginner. I know only basic HTML, CSS and JavaScript.
- Explain what you did in plain, simple language, file by file, after each
  change. No jargon without a short explanation.
- If my request is unclear, or conflicts with SPEC.md, ask me before acting.

## My setup
- Windows laptop, PowerShell terminal, VS Code. I test in Chrome/Edge on my
  laptop and on my iPhone (Safari and the home-screen app).
- My Windows username contains an apostrophe. In PowerShell, use
  $env:USERPROFILE instead of typing my user folder path.
- No Node.js or Python installed. Don't rely on them without asking.

## The app is live
- Chess4Me is published with GitHub Pages from this PUBLIC repo, and I use
  it daily as a home-screen app on my iPhone. Whatever I push is what my
  phone gets, so changes must not break the app.
- My real courses are saved in the home-screen app's storage. Any change to
  saved data (especially the dataVersion 2 upgrade in SPEC.md section 21)
  must never lose courses, moves or comments. Tell me clearly before any
  step that changes the saved data format, so I can export a backup first.
- The service worker caches the app for offline use. Whenever app files
  change in a step, bump the service worker's cache version so my iPhone
  gets the update, and remind me that the change is in.
- Remind me that PWA features (offline, home screen) can only be tested on
  the live site after pushing, not by double-clicking index.html.

## How to work
- Work on ONE build step, or ONE part of a step (e.g. step 1 is split into
  parts a, b and c), at a time. Don't jump ahead or add features I didn't
  ask for.
- Keep changes small, so I can check them with git diff.
- Follow the folder structure in SPEC.md. Keep code tidy, with short comments
  explaining what each part does.
- Plain HTML/CSS/JS, classic script tags, no frameworks or build tools
  (see SPEC.md section 2).
- Before adding any outside library, image or sound: tell me what it is,
  where it comes from and its licence, and wait for my OK. Record it in
  CREDITS.md. Prefer MIT/BSD/CC0. Avoid GPL.
- Icons (skull, sound on/off) should be original SVGs you draw, so there
  are no licence issues.
- In all text the user can see, use "practice", "practiced" and
  "practicing", never "practise" or "practised".
- Small looks-only tweaks I ask for between build steps get their own commit,
  and get recorded in SPEC.md so later steps don't undo them.
- Never put passwords, keys or personal information in the code. The GitHub
  repo is public.

## Git
- Don't run git commit or git push yourself. I do that.
- At the end of each change, tell me how to check it (what to open, what I
  should see) and suggest a short commit message.
- When I confirm a build step (or part of a step) works, tick it off in
  SPEC.md section 22. For step 1, note which parts are done (e.g. "1a done")
  and tick the whole step only when a, b and c are all done.
