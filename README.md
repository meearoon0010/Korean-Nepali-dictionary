# 한-네 사전 · Korean–Nepali Dictionary

A small, static, two-way Korean ↔ Nepali dictionary. No backend, no build step — just HTML/CSS/JS, so it runs directly on **GitHub Pages**.

**Includes 1,303 Korean words** with their Nepali meanings (plus similar/opposite words where the source data had them).

## Features

- **Two-way search** — one search box matches Korean, Nepali, and any similar/opposite words at once. Type `가게` or `pasal` and both find the same entry.
- **Pronunciation** — tap the speaker icon to hear the Korean word read aloud (uses your browser's built-in text-to-speech, `ko-KR` voice if available).
- **Favorites** — star any word; it's saved in your browser (`localStorage`) so it's still there next visit.
- **Add your own words** — the "+ Add word" button lets you add entries not in the base list. They show up under the "Mine" tab and can be deleted any time.
- Everything you add or star stays **on your device only** — nothing is sent anywhere.

## Running locally

Just open `index.html` in a browser. For local development with a simple server (recommended so the speech API and fonts behave normally):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

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
words.js      — the 1,303-entry Korean–Nepali dataset (as a JS variable)
```

## Updating the word list

`words.js` just assigns a JSON array to `window.DICT_DATA`. Each entry looks like:

```js
{ "ko": "가게", "np": "पसल", "similar": "", "opposite": "" }
```

Edit or extend that array directly to add words in bulk (e.g. regenerated from a spreadsheet), separately from the "Add word" button which is for one-off personal additions saved in the browser.

## Notes

- The dictionary's "Nepali" column is the source data's meaning column — a handful of entries include an English word instead of/alongside Nepali (carried over as-is from the original spreadsheet).
- Pronunciation quality depends on the voices installed in the visitor's browser/OS. Most Chrome/Edge/Safari installs include a Korean voice; if none is found, the browser falls back to its default voice.
