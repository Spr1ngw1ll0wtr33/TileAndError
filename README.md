# Tile & Error

An advert-free Mahjong solitaire game for my own phone and tablet. It has a 4-slot tray, endless levels, helps that build up over time, and progress tracking.

It is a web app (a "PWA"). It is published with GitHub Pages and installed from Chrome, just like Garden Diary, Memory Jar and Boundaries.

- **Web address:** https://spr1ngw1ll0wtr33.github.io/Mahjong/
- **Name on the phone:** Tile & Error
- **Manifest Id:** `/Mahjong/` (its own identity, so it can't clash with the other apps)

---

## 1. Switch on GitHub Pages (once only, on the computer)

1. Go to https://github.com/Spr1ngw1ll0wtr33/Mahjong and sign in.
2. Click **Settings** (the cog tab along the top of the repository).
3. In the left-hand menu, click **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Under **Branch**, choose the branch the app was saved on, leave the folder as **/ (root)**, then click **Save**.
6. Wait 2 or 3 minutes, then refresh the page. A line saying **"Your site is live at …"** appears at the top.

## 2. Install it on the phone or tablet

1. Open **Chrome** and go to **https://spr1ngw1ll0wtr33.github.io/Mahjong/**. Use the capital **M**.
2. Wait for the home screen with the arch to appear.
3. Tap **⋮** (three dots, top right).
4. Tap **Install** (sometimes **Add to Home screen → Install**). Do **not** choose "Create shortcut", because shortcuts don't show in O'launcher.
5. **Tile & Error** now appears in O'launcher. Open it from there.

To check it installed properly, type `chrome://webapks` into Chrome's address bar. Look for Tile & Error and check that **Manifest Id** ends in `/Mahjong/`.

## 3. Updates

When a new version is published, open the app twice. The first time it fetches the update quietly in the background, and the second time it uses it.

If something ever looks stuck, clear only **"Cached images and files"** in Chrome. **Never clear "Cookies and site data"** for this web address: that would wipe every app at spr1ngw1ll0wtr33.github.io at once, including your Garden Diary and Memory Jar entries.

## 4. Keeping progress safe

Progress is stored on the device. On the **Progress** screen:

- **Save a backup file** puts a dated file in your Downloads, for example `tile-and-error-backup-12-10-2026.json`.
- **Restore from a file** loads one back. Use it when moving to a new phone, or to copy progress between the phone and the tablet.

The phone and tablet keep **separate** progress unless you copy a backup file from one to the other.

---

## How the game works

- Tap a **free** tile to move it into the tray. A tile is free when nothing lies on top of it and its left or right side is clear.
- Two matching tiles in the tray vanish. Any flower matches any flower, and any season matches any season.
- The tray holds 4 tiles. If it fills with no pair, you choose between:
  - **Restart**, which counts as a loss, or
  - **Carry on**: the tray tiles go back on the board, and up to 4 reverse moves are used (fewer if you have fewer).
- Every level is generated so that it **can** be cleared. The same level number always gives the same board.

**Helps:**
- **Hint** lights up a good move.
- **Shuffle** re-deals the tiles on the board, and the board can still be cleared afterwards.
- **Reverse move** takes back your last tap.
- **Hammer** smashes any tile, even a covered one, together with a matching tile.

You start with one of each.

**Prizes:**
- Every 10 levels, choose 1 help.
- Every 50 levels, choose 3.
- Every 100 levels, get one of each.

**Progress screen:** levels done, games won and played, win rate, day streak and best streak, helps in stock, and a dated history of every game.

---

## For whoever maintains it

- Plain HTML, CSS and JavaScript, with no build step. Open `index.html` through any web server, at the path `/Mahjong/`.
- Tests: `npm test` (Node 18 or later). They check that 500 generated levels can all be cleared without the tray filling, as well as the tray, Carry on, hammer, shuffle, prizes and streaks.
- **Shared address rules** (all of these apps live at spr1ngw1ll0wtr33.github.io):
  - The manifest `id`, `scope` and `start_url` are all `/Mahjong/`.
  - Service worker caches start with `tile-and-error-`, and only those are ever deleted.
  - The IndexedDB database is called `tile-and-error`.
- When releasing a change, bump `CACHE` in `sw.js` and `VERSION` in `js/app.js`.
- Style: "Layered Paper" (see `DESIGN.md` in the IGBoundaries repository).
- Fonts are bundled for offline use, under the SIL Open Font Licence (see `fonts/`):
  - Poiret One and Josefin Sans.
  - A 25-character subset of Noto Serif SC, for the tile characters.

### Departures from the Layered Paper guide
- It has no generated paper-cut illustration. The home screen uses the type-only arch style instead, with a tile as its motif.
- Some text in the game is smaller than the guide's sizes, which are set for social media images. Poiret One is used only for headings and figures.
- Tile faces use the traditional colours mapped onto the palette: blue becomes ink, green becomes forest and red becomes crimson.
