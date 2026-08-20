# 한-네 사전 · Korean–Nepali Dictionary

A small, static, two-way Korean ↔ Nepali dictionary. No backend, no build step — just HTML/CSS/JS, so it runs directly on **GitHub Pages**.

**Includes 1,273 Korean words** with their Nepali meanings (plus similar/opposite words where the source data had them).

## Features

- **Two-way search** — one search box matches Korean, Nepali, and any similar/opposite words at once. Type `가게` or `pasal` and both find the same entry.
- **Pronunciation** — tap the speaker icon to hear the Korean word read aloud (uses your browser's built-in text-to-speech, `ko-KR` voice if available).
- **Favorites** — star any word; it's saved in your browser (`localStorage`) so it's still there next visit.
- **Add your own words** — the "+ Add word" button lets you add entries not in the base list. They show up under the "Mine" tab and can be deleted any time.
- Everything you add or star stays **on your device only** — nothing is sent anywhere.

## Running locally

The word list loads via `fetch('words.json')`, so **don't just double-click `index.html`** — browsers block `fetch` on `file://` pages. Run a tiny local server instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(GitHub Pages serves everything over `https://`, so no server setup is needed once it's deployed — this is only for testing on your own machine.)

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `korean-nepali-dictionary`) and push these files to it:
   ```bash
   git init
   git add .
   git commit -m "Initial dictionary app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save. GitHub will publish it at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No other configuration is needed — there's no build step, package.json, or server.

## File structure

```
index.html    — page structure
style.css     — all styling
script.js     — search, favorites, add-word, pronunciation logic
words.json    — the 1,273-entry Korean–Nepali dataset
```

## Updating the word list

`words.json` is a plain JSON array — the app fetches it at load time. Each entry looks like:

```json
{ "ko": "가게", "np": "पसल", "similar": "", "opposite": "" }
```

To add words in bulk later (e.g. regenerated from an updated spreadsheet), **just replace `words.json`** — on GitHub you can edit or upload it directly through the web UI (Add file → Upload files, or click the file → the pencil/edit icon), no need to touch `index.html`, `style.css`, or `script.js` at all. `similar` and `opposite` can be left as empty strings `""` if not applicable.

This is separate from the in-app "Add word" button, which is for one-off personal additions saved in each visitor's own browser (not shared, not written back to this file).

## Notes

- The dictionary's "Nepali" column is the source data's meaning column — a handful of entries include an English word instead of/alongside Nepali (carried over as-is from the original spreadsheet).
- Pronunciation quality depends on the voices installed in the visitor's browser/OS. Most Chrome/Edge/Safari installs include a Korean voice; if none is found, the browser falls back to its default voice.
