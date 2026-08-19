# 한-네 사전 · Korean-Nepali Dictionary

An installable, offline-first Korean ↔ Nepali dictionary Progressive Web App (PWA). Pure HTML/CSS/JS — no build step, no dependencies. Just open `index.html` or deploy the folder as-is (e.g. GitHub Pages).

## Features

- **Search** — instant search across Korean and Nepali (word, meaning, similar/opposite words), 1,211 built-in entries
- **Favorites** — star any word, saved locally
- **Add your own words** — stored locally on the device, fully editable/deletable
- **Pronunciation** — uses the browser's built-in Speech Synthesis API (`ko-KR`) to read Korean words aloud, with adjustable speech rate
- **Dark mode** — manual toggle, remembers your choice, defaults to system preference
- **Flashcards** — flip-card practice, choose source (all / favorites / my words) and direction (Korean→Nepali or Nepali→Korean)
- **Quiz** — multiple-choice quiz mode with scoring, same source/direction options
- **Export** — download favorites, your custom words, or the full dictionary as JSON/CSV
- **Responsive UI** — works on phone, tablet, and desktop
- **PWA / offline caching** — installable to home screen, service worker caches the app shell and dictionary data so it works with no internet connection

## Project structure

```
├── index.html          # App shell / all views
├── manifest.json        # PWA manifest
├── service-worker.js    # Offline caching (cache-first, background refresh)
├── css/
│   └── style.css        # All styling incl. dark mode theme
├── js/
│   ├── data.js           # Dictionary data (generated from DICTIONARY.xlsx)
│   └── app.js             # App logic
└── icons/                # App icons (regular + maskable, 192/512)
```

## Running locally

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Opening `index.html` directly via `file://` also works, though the service worker won't register under `file://` in most browsers — use a local server to test the offline/PWA behavior.)

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository (root, or a `docs/` folder).
2. In the repo settings, enable **Pages** and point it at the branch/folder you used.
3. Visit the published URL — the "Install app" option will appear in supported browsers once served over HTTPS.

## Updating the dictionary data

`js/data.js` defines a single `WORDS_DATA` array of objects:

```js
{ id: 1, word: "가게", meaning: "पसल", similar: "", opposite: "" }
```

To regenerate it from a spreadsheet, export your source data with columns `Words, Meaning, Similar Words, Opposite Words` and rebuild the array in that shape (any script/spreadsheet tool that outputs JSON works fine — no special tooling is required at runtime).

## Notes on pronunciation

Speech uses the device/browser's installed voices. If no Korean (`ko-KR`) voice is installed, the browser will fall back to a default voice or may not produce audio — this depends on the operating system, not the app. Settings → "Test Korean voice" shows which voice (if any) is being used.

## Privacy

All user data (favorites, custom words, theme, speech rate) is stored only in the browser's `localStorage` on the user's own device. Nothing is sent to a server — there is no backend.

## License

Feel free to adapt this project for your own use.
