<div align="center">

<img src="doc/banner.svg" alt="Za3bot Library - your PDFs on a 3D shelf" width="100%">

<br>

**A self-hosted, Xbox-style bookshelf for every PDF on your computer.**<br>
Folders become 3D coverflow shelves. Books open as a real two-page flipbook with bookmarks, notes and page previews.

<br>

![Node.js](https://img.shields.io/badge/node-%E2%89%A5%2020-2bff88?style=flat-square&logo=node.js&logoColor=white&labelColor=12161b)
![License](https://img.shields.io/badge/license-MIT-19c1ff?style=flat-square&labelColor=12161b)
![No cloud](https://img.shields.io/badge/100%25-local%20%26%20private-ffc83d?style=flat-square&labelColor=12161b)
![Dependencies](https://img.shields.io/badge/runtime%20deps-5-9aa6b2?style=flat-square&labelColor=12161b)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-2bff88?style=flat-square&labelColor=12161b)

</div>

---

## Why Za3bot Library?

Your PDFs are probably scattered across `Downloads`, `Documents` and a dozen project folders, and every PDF viewer treats them like files in a list. **Za3bot Library treats them like books.**

Point it at a folder, and you get a dark, gaming-console-style library you can drive with the keyboard, a mouse, a touch screen or a **gamepad**. Every sub-folder turns into its own shelf. Open a book and the pages actually turn, with shadows, drag-to-flip corners and the sound of real paper.

No account. No upload. No database to set up. Your books never leave your machine.

<div align="center">
<img src="doc/screenshots/library.png" alt="Library view: folders as coverflow shelves" width="92%">
</div>

## Features

### A library that looks like a console
- **3D Coverflow shelves** powered by Swiper, with a focused-cover glow, reflections and a neon-on-black theme
- **One shelf per folder.** Organise your PDFs in normal folders, nested folders show up as `Science › Physics`
- **Auto-generated covers:** the first page of every PDF, rendered once and cached
- **Instant search** across book titles *and* folder names
- **Fold shelves** you are not using, and Za3bot Library remembers it
- Works great with Arabic, spaces and any Unicode in file and folder names

### A reader that feels like paper
- **Real two-page spread** with 3D page turning, soft shadows and **drag-to-flip** (StPageFlip)
- **Realistic page-turn sound**, synthesised on the fly, so no audio files are bundled
- **Zoom 50% - 400%** with sharp re-rendering at every level, plus a hand tool to pan
- **Page previews:** a thumbnail sidebar to jump to any page with one click
- Jump-to-page box, `Home` / `End`, and a cover that sits centred like a real book

### Tools for actually reading
- 🔖 **Resume bookmark:** drop one on a page, and the book re-opens right there next time
- 📝 **Notes on every page:** written in a side panel, saved automatically, listed per book. Arabic and other right-to-left text just works
- 🏷 **Shelf badges:** covers show their bookmark page and note count at a glance

### Made for any input
- ⌨️ Full keyboard control
- 🖱 Mouse drag, click and wheel
- 🎮 **Gamepad support** for any controller your browser reports with the standard layout (Xbox style): D-pad to browse, **A** to open, **B** to close, **LB / RB** to turn pages

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="doc/screenshots/reader.png" alt="Two-page reader with page previews"><br><sub><b>Two-page reader</b> with page previews on the left</sub></td>
    <td width="50%"><img src="doc/screenshots/notes.png" alt="Notes panel and bookmark"><br><sub><b>Notes &amp; bookmarks</b> saved per page</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="doc/screenshots/zoom.png" alt="Zoomed page" width="50%"><br><sub><b>Zoom</b> re-renders pages sharply instead of just stretching them</sub></td>
  </tr>
</table>

> The demo books in the screenshots are generated placeholders, not real publications.

## Quick start

### Requirements

| What | Version | Notes |
|------|---------|-------|
| **Node.js** | **20 or newer** | Required by PDF.js 4. Check with `node -v` |
| **npm** | comes with Node | |
| **A modern browser** | Chrome, Edge, Brave or any recent Chromium recommended | The cover reflection effect needs a Chromium-based browser or Safari. Everything else works anywhere ES modules do |
| **OS** | Windows, macOS, Linux | Prebuilt binaries for the image renderer, so **no compiler, no Poppler, no Ghostscript** needed |

> Developed and tested with Chromium on Linux. Windows and macOS use the same Node code, so they are expected to work. If something misbehaves, please [open an issue](../../issues).

### 1. Get it

```bash
git clone https://github.com/<your-username>/za3bot-library.git
cd za3bot-library
npm install
```

### 2. Run it

**Option A: books live next to the app** (simplest)

Copy your PDFs, or folders of PDFs, into the `za3bot-library` folder, then:

```bash
npm start
```

(`*.pdf` is git-ignored, so your books are never committed by accident.)

**Option B: keep the app and your books separate**

Run the server *from the folder that holds your books*. The folder you start it in becomes your library:

```bash
# macOS / Linux
cd ~/Books
node /path/to/za3bot-library/server.js
```

```powershell
# Windows PowerShell
cd D:\Books
node C:\tools\za3bot-library\server.js
```

### 3. Open it

Go to **http://localhost:6060** and press `Enter` on a book.

That is it. Add or move PDFs at any time and press **↻** (or reload the page) to rescan.

## Organise your books into shelves

Every folder that contains PDFs becomes a shelf. The PDFs that sit directly in the library folder go on the **Main shelf**.

```text
Books/                         ← where you start the server
├─ Getting Started.pdf         →  Main shelf
├─ Security/
│  ├─ Cyber Defense Guide.pdf  →  Shelf "Security"
│  └─ Network Basics.pdf
├─ Programming/
│  ├─ Pocket Python.pdf        →  Shelf "Programming"
│  └─ Algorithm Atlas.pdf
└─ Science/
   ├─ Physics/Quantum Primer.pdf   →  Shelf "Science › Physics"
   └─ Biology/Cell Stories.pdf     →  Shelf "Science › Biology"
```

- Sub-folders can be nested up to **8 levels** deep
- Hidden folders (starting with a dot), `node_modules` and empty folders are skipped
- Shelves are sorted naturally (`Volume 2` comes before `Volume 10`), and so are the books inside them
- With **no** sub-folders you get the classic single big coverflow, with no shelf headers

## Controls

### Library

| Key | Action |
|-----|--------|
| `←` `→` | Browse books on the current shelf |
| `↑` `↓` | Move between shelves |
| `Enter` | Open the book (or unfold a folded shelf) |
| `C` | Fold / unfold the current shelf |
| `/` | Focus the search box |
| `Home` `End` | First / last book on the shelf |
| `M` | Sound on / off |

### Reader

| Key | Action |
|-----|--------|
| `←` `→` | Turn the page |
| `Home` `End` | First / last page |
| `+` `-` `0` | Zoom in / out / reset (also `Ctrl` + mouse wheel) |
| `H` | Hand tool: drag to move around a zoomed page (middle mouse button works too) |
| `B` | Set / remove the bookmark |
| `N` | Open the notes panel |
| `T` | Show / hide page previews |
| `M` | Sound on / off |
| `Esc` | Close the book |

You can also drag a page corner with the mouse, click the arrows, or type a page number in the **Page** box and press `Enter`.

### Gamepad

| Button | Action |
|--------|--------|
| D-pad / left stick | Browse books, and up / down between shelves |
| **A** | Open a book |
| **B** | Close the book |
| **LB** / **RB** | Previous / next page |
| **X** | Bookmark |
| **Y** | Page previews |

Press any button once after connecting; browsers only reveal a controller after the first input.

## Configuration

Za3bot Library has two settings, both environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `6060` | The port to listen on |
| `HOST` | `127.0.0.1` | The address to listen on. `127.0.0.1` = only this computer |

```bash
# macOS / Linux
PORT=7070 node server.js
```

```powershell
# Windows PowerShell
$env:PORT = 7070; node server.js
```

```bat
:: Windows cmd
set PORT=7070 && node server.js
```

### Read your library from your phone or another PC

```bash
HOST=0.0.0.0 node server.js
```

Then browse to `http://<your-computer-ip>:6060` from a device on the same network. See [Security](#security--privacy) first.

## Where your data lives

Za3bot Library writes two small folders **inside your library folder** and nothing else on your disk:

| Path | What it holds | Safe to delete? |
|------|---------------|-----------------|
| `.covers/` | Cached cover images (PNG) | Yes, they are re-created automatically |
| `.za3bot/state.json` | Your **bookmarks and notes**, keyed by each book's path | Back this file up. It is your reading data |

Because notes follow the path (for example `Science/Physics/Quantum Primer.pdf`), moving or renaming a book detaches it from its notes. Move the book back, or edit the key in `state.json`.

Your PDFs are only ever read, never modified.

## How it works

```text
┌────────────────────────────┐        ┌───────────────────────────────┐
│  Browser (index.html)      │        │  Node.js + Express (server.js)│
│  • Swiper coverflow shelves│◄──────►│  • scans folders for *.pdf    │
│  • PDF.js renders pages    │  HTTP  │  • renders page 1 → PNG cover │
│  • StPageFlip 3D flipbook  │        │  • serves PDFs (Range support)│
│  • Web Audio paper sounds  │        │  • stores bookmarks & notes   │
└────────────────────────────┘        └───────────────────────────────┘
```

- **Covers** are drawn on the server with PDF.js and [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas), then cached in `.covers/`
- **Pages** are drawn in the browser with PDF.js, only the ones near the page you are reading, so even huge PDFs open quickly
- **Page-turn sound** is generated with the Web Audio API, no audio files in the repo
- The whole UI is **one HTML file**, with no build step and no bundler

### Project structure

```text
za3bot-library/
├─ server.js          Express server: scanning, covers, PDFs, bookmarks & notes API
├─ index.html         The entire front end (UI, shelves, reader)
├─ package.json
├─ doc/              Banner and screenshots used by this README
└─ LICENSE
```

### HTTP API

Handy if you want to script against it:

| Endpoint | Description |
|----------|-------------|
| `GET /api/books` | All books: `title`, `folder`, `pdfUrl`, `coverUrl`, `bookmark`, `noteCount` |
| `GET /api/cover/:id.png` | Cover image (generated on first request) |
| `GET /pdf/<path>` | The PDF itself, with HTTP Range support |
| `GET /api/state/:file` | Bookmark and notes for one book (`:file` is the URL-encoded relative path, e.g. `Science%2FPhysics%2FQuantum.pdf`) |
| `PUT /api/state/:file/bookmark` | Body `{ "page": 12 }`, or `{ "page": null }` to clear |
| `PUT /api/state/:file/notes/:page` | Body `{ "text": "..." }`, empty text deletes the note |

## Security & privacy

- By default the server listens on **`127.0.0.1` only**, so nobody else on your network can reach it
- Nothing is sent to any external service. All libraries are served from your own `node_modules`
- The file server only hands out `.pdf` files **inside** the library folder. Paths with `..`, hidden folders and `node_modules` are refused
- Write requests (bookmarks, notes) coming from *other websites* open in your browser are rejected
- If you use `HOST=0.0.0.0`, **anyone on your network can read your library and edit your notes**. There is no login. Use it on networks you trust, or put it behind a reverse proxy that adds authentication

## Troubleshooting

<details>
<summary><b>The library is empty</b></summary>

The folder you **start the server from** is the library. Check the `Folder :` line printed at startup. Remember hidden folders (starting with `.`) and `node_modules` are skipped. Press **↻** after adding files.
</details>

<details>
<summary><b><code>npm install</code> fails or the app complains about a missing feature</b></summary>

Run `node -v`. You need **Node.js 20 or newer**. Older versions cannot run PDF.js 4.
</details>

<details>
<summary><b>A book shows a coloured placeholder instead of its first page</b></summary>

The cover could not be rendered, usually because the PDF is damaged or password-protected. The placeholder keeps the library usable, and the server log prints the reason. Password-protected PDFs are not supported yet.
</details>

<details>
<summary><b>"Address already in use"</b></summary>

Something else uses port 6060. Pick another: `PORT=7070 node server.js`.
</details>

<details>
<summary><b>No page-turn sound</b></summary>

Browsers block audio until you interact with the page. Click or press a key once. Also check the 🔊 button is not muted (`M`).
</details>

<details>
<summary><b>My gamepad is not detected</b></summary>

Press any button on the controller with the page focused. Browsers only expose gamepads after the first button press.
</details>

<details>
<summary><b>I want to start from scratch</b></summary>

Stop the server and delete `.covers/` (covers) and/or `.za3bot/` (bookmarks and notes) from your library folder.
</details>

## Ideas for the future

Contributions are very welcome. Some directions:

- [ ] Password-protected PDF support
- [ ] Reading progress bars on covers
- [ ] Collections / tags across folders
- [ ] Light theme and custom accent colours
- [ ] Full-text search inside books
- [ ] EPUB support
- [ ] Right-to-left interface and translations

## Contributing

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Run `npm install` and `npm start` against a folder with a few PDFs
3. Keep changes focused. The app is intentionally small: one server file, one HTML file
4. Open a pull request describing what you changed and why

Found a bug? [Open an issue](../../issues) with your Node version, OS, browser and the steps to reproduce.

## Built with

| Project | Used for | License |
|---------|----------|---------|
| [Express](https://expressjs.com/) | HTTP server | MIT |
| [PDF.js](https://mozilla.github.io/pdf.js/) | Rendering PDF pages and covers | Apache-2.0 |
| [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) | Server-side image rendering | MIT |
| [Swiper](https://swiperjs.com/) | 3D coverflow shelves | MIT |
| [StPageFlip](https://github.com/Nodlik/StPageFlip) | 3D page-flip reader | MIT |

## License

[MIT](LICENSE). Use it, change it, share it.

<div align="center">
<br>

**If Za3bot Library makes your PDFs more fun to read, give it a ⭐**

</div>
