# Instructions for Claude Code

## Start of every session
- Read SPEC.md first. It describes exactly what Chess4Me should be.
- Check the build plan in SPEC.md (section 13) to see which step is next.

## About me
- I'm a complete beginner. I know only basic HTML, CSS and JavaScript.
- Explain what you did in plain, simple language, file by file, after each
  change. No jargon without a short explanation.
- If my request is unclear, or conflicts with SPEC.md, ask me before acting.

## My setup
- Windows laptop, PowerShell terminal, VS Code. I test in Chrome/Edge on my
  laptop and on my iPhone (Safari).
- My Windows username contains an apostrophe. In PowerShell, use
  $env:USERPROFILE instead of typing my user folder path.
- No Node.js or Python installed. Don't rely on them without asking.

## How to work
- Work on ONE build step (or one small change) at a time. Don't jump ahead
  or add features I didn't ask for.
- Keep changes small, so I can check them with git diff.
- Follow the folder structure in SPEC.md. Keep code tidy, with short comments
  explaining what each part does.
- Plain HTML/CSS/JS, classic script tags, no frameworks or build tools
  (see SPEC.md section 2).
- Before adding any outside library, image or sound: tell me what it is and
  its licence, and wait for my OK. Record it in CREDITS.md.
- Never put passwords, keys or personal information in the code. The GitHub
  repo will be public.

## Git
- Don't run git commit or git push yourself. I do that.
- At the end of each change, tell me how to check it (what to open, what I
  should see) and suggest a short commit message.
- When I confirm a build step works, tick it off in SPEC.md.
