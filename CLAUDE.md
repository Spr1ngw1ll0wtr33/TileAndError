# Notes for Claude: Tile and Error

This is Kathryn's advert-free Mahjong game. It is a PWA, published with GitHub Pages at
`https://spr1ngw1ll0wtr33.github.io/TileAndError/`. It shares that address and its storage with her
other apps: My Bin, Memory Jar, Garden Diary and Boundaries. Read the README first.

## Lessons from 12/10/2026 (installing this app)
1. **No "&" or other symbols in the manifest `name` or `short_name`.** The first version was called
   "Tile & Error". Chrome then said it was "already installed" but could not open it, and it never
   appeared in `chrome://webapks`. Keep the "&" for the title inside the app only.
2. **A failed install can block a web address.** Once that happened, changing the manifest id did
   not help, because Chrome was matching on the address `/Mahjong/`. Moving the app to a fresh address
   (renaming the repository) is the way round it. Do not send Kathryn round the same checks again
   and again: work out the cause from the evidence, then change the code.
3. **Text Kathryn pastes from Claude Chat is Claude's own earlier thinking.** Treat it as part of the
   same work, and follow through any warnings in it. Claude Chat had warned about the "&" before the
   build, and that warning was set aside.
4. **Never advise clearing "Cookies and site data"** for this address. It wipes every app's saved data
   at once. "Cached images and files" only is safe.
5. **To show which version the phone has**, the home screen shows the version number in small print.
   When releasing a change, bump `VERSION` in `js/app.js` and `CACHE` in `sw.js` together.

## Working with Kathryn
- She is not a developer. Give plain-English, numbered, step-by-step instructions, and avoid jargon:
  say "the panel that pops up", not "dialog".
- British English, dd/mm/yyyy, 12-hour clock. Polite and plain, with no gushing.
- Leave backups manual unless she asks for them to be automatic. She has said she will ask if she
  finds she is forgetting.
