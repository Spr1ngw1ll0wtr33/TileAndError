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

6. **Install diagnosis:** Settings → "Installing the app" shows whether Chrome offered the direct install
   route (`beforeinstallprompt`), plus the version, address, Chrome and Android versions. Ask for one
   screenshot of that section instead of sending Kathryn round menu checks.

## Design decisions (13/10/2026)
- Tiles follow Kathryn's reference game (a modern picture-tile game), not traditional Mahjong: one main
  symbol per tile (numbers, simple Chinese characters, patterns, pictures in themes), and a tile
  matches only an identical tile. She finds subtle Chinese writing hard to tell apart, so keep
  characters few and visually distinct.
- Game screen: Forest green table, ivory tiles, tray at the top with tile-sized slots, square
  symbol-only help buttons. Board sizes are capped at 6 tiles across and 7 down so tiles are large.
- Soft colours, not bright ones. Two schemes are available in Settings.
- Tile mix (13/10/2026): about three quarters as many kinds as pairs, so most kinds appear once as a
  pair and some twice. Never more than 4 of any tile.
- Matching animation (13/10/2026): a matching tile glides in beside its partner (other tray tiles
  slide along to make room), the pair rests, clicks together and fades, and the tray closes up.
- Pace (13/10/2026): Kathryn found 1.2 seconds too slow and taps were being lost. A match now takes
  about 0.85 seconds. Taps made during an animation are queued (never ignored; a double tap counts
  once), a queued tile lifts slightly, and queued moves run at double speed with no pause.

## Working with Kathryn
- She is not a developer. Give plain-English, numbered, step-by-step instructions, and avoid jargon:
  say "the panel that pops up", not "dialog".
- British English, dd/mm/yyyy, 12-hour clock. Polite and plain, with no gushing.
- Leave backups manual unless she asks for them to be automatic. She has said she will ask if she
  finds she is forgetting.
