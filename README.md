# MedCheck — Personal Health Assistant

Scan food labels, prescriptions, and lab reports for instant, personalized
AI guidance. 100% client-side: there is no backend and no server in the
request path — your browser calls Google's Gemini API directly using your
own API key.

> ⚠️ **Not a medical device.** MedCheck provides general informational
> guidance only and is not a substitute for professional medical advice,
> diagnosis, or treatment. Always confirm anything health-related with a
> licensed doctor or pharmacist.

---

## Features

- **Scan Label** — photograph or upload a food/nutrition label; get a
  traffic-light verdict (safe / caution / danger) personalized against your
  saved health profile (LDL/HDL/triglycerides, allergies, conditions,
  medications, diet pattern).
- **Manual Entry** — type a food name + amount instead of photographing it.
- **Prescription** — photograph a prescription; get plain-language
  explanations of each medication, dosage, and purpose.
- **Lab Report** — photograph or upload lab results (images or PDF) for a
  plain-language explanation of what the numbers mean.
- **Multi-file upload** — attach several photos/files to one analysis (e.g.
  a multi-page lab report), up to 6 files / 18MB combined per request.
- **Bilingual** — full UI in Vietnamese and English, with an independent
  "AI response language" setting so the interface and Gemini's answers
  don't have to match.
- **Local history** — past verdicts (text only, never images) are kept in
  your browser so you can revisit them.
- **Installable PWA** — works offline for the app shell; light/dark theme
  follows your system preference by default.
- **Bring your own API key** — MedCheck never sees or stores your key
  anywhere but your own browser's `localStorage`, and it's sent straight to
  Google, never through any third-party server.

## Tech stack

Plain HTML/CSS/JavaScript. No framework, no bundler, no build step —
native ES modules (`<script type="module">`) loaded directly by the
browser. The only external network call the app itself makes is to
Google's Gemini API; Google Fonts is loaded for the Inter typeface.

## Project structure

```
medcheck/
├── index.html              # App shell: markup, CSP, dialogs (modals)
├── style.css                # All styling (design tokens + components)
├── manifest.json             # PWA manifest (installable app metadata)
├── service-worker.js         # Offline cache for the static app shell only
├── _headers                  # Security headers for hosts that support them
│                              # (Netlify, Cloudflare Pages — see note below)
├── icons/                    # App icons (PWA + favicon)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
└── js/
    ├── app.js                # Entry point — wires everything together
    ├── config.js              # Constants: storage keys, limits, endpoints,
    │                            # default/fallback Gemini models (see "Updating
    │                            # models" below)
    ├── i18n.js                 # Translations (VI/EN) + Gemini prompt builders
    ├── ui.js                    # All DOM rendering and DOM-driven state
    ├── camera.js                 # Camera capture + file reading primitives
    ├── gemini-api.js               # The ONLY module that talks to the network
    ├── storage.js                   # The ONLY module that touches localStorage
    ├── theme.js                      # Light/dark theme handling
    └── icons.js                      # Hand-built inline SVG icon set
```

Each file in `js/` has a single, clearly-scoped responsibility (documented
in a header comment at the top of the file) — e.g. `gemini-api.js` is the
only file that ever calls `fetch()` to a third party, and `storage.js` is
the only file that ever touches `localStorage`. This makes it easy to
audit where data actually flows.

## Running locally

Because the app uses native ES modules, you can't just double-click
`index.html` (browsers block module imports over the `file://` protocol).
Serve it with any static file server from the project root, for example:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

## Getting a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and
   create a free API key (also linked in-app under Settings).
2. Open MedCheck → the settings icon in the header → paste your key.
3. (Optional) Change the model or set a fixed AI response language —
   defaults work for most people.

Your key is stored only in your browser's `localStorage` and sent directly
to `generativelanguage.googleapis.com` with every request — MedCheck has
no server to intercept or log it.

## Updating models

Google periodically renames, retires, or ships new Gemini models. Every
model name in the app lives in **one place** — `js/config.js` — so keeping
up to date is a two-line edit, no other file needs to change:

```js
// js/config.js

export const DEFAULT_MODEL = 'gemini-3.6-flash';   // 1. the primary model

export const FALLBACK_MODELS = [
  'gemini-3.6-flash',       // 1. Primary — same as DEFAULT_MODEL above
  'gemini-2.5-flash',       // 2. Fallback 1
  'gemini-2.0-flash',       // 3. Fallback 2
  'gemini-2.5-flash-lite',  // 4. Fallback 3
  'gemini-2.5-pro',         // 5. Final fallback
];
```

**To adopt a new model**, e.g. Google ships `gemini-4.0-flash` to replace
`gemini-3.6-flash`:

1. Update `DEFAULT_MODEL` to `'gemini-4.0-flash'`.
2. Update the first entry in `FALLBACK_MODELS` to match.
3. Reorder, add, or remove any other entries in `FALLBACK_MODELS` the same
   way — order is priority order, first-to-last.

That's it — `gemini-api.js`'s retry/fallback logic and the fallback-chain
chip preview in Settings both read `FALLBACK_MODELS` live, so they can
never drift out of sync with each other.

One cosmetic-only exception: `index.html` has a hardcoded `placeholder`
attribute (`placeholder="gemini-3.6-flash"`) on the Settings model input.
It's just greyed-out hint text for an empty field and has zero effect on
behavior, but update it too if you want it to stay accurate:

```html
<input type="text" id="settings-model" placeholder="gemini-4.0-flash" ...>
```

Anyone using the app keeps working through this change automatically —
a user's own custom model in Settings is always tried first regardless of
what `DEFAULT_MODEL`/`FALLBACK_MODELS` say; these constants only affect
new installs and the automatic fallback chain.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Repo → **Settings → Pages** → set **Source** to your default branch
   (root).
3. Your app will be live at `https://<username>.github.io/<repo>/`.

No build step is needed — GitHub Pages serves the static files as-is.

**Note on `_headers`:** that file adds security headers (clickjacking
protection, MIME-sniffing protection, etc.) that Netlify and Cloudflare
Pages read automatically. **GitHub Pages does not support custom response
headers at all**, so `_headers` has no effect there. If you need those
protections on GitHub Pages, put a service like Cloudflare in front of it.

## Updating the installed PWA (important!)

Pushing new code to GitHub updates the live URL immediately, but **that
alone does not update the app for anyone who already installed MedCheck
to their phone's home screen.** Installed PWAs are served from the
service worker's offline cache, and browsers only re-check that cache when
`service-worker.js` itself changes.

**The rule:** any time you change a file listed in `SHELL_ASSETS` inside
`service-worker.js` (any `js/*.js`, `style.css`, `index.html`,
`manifest.json`, or an app icon), bump the version on this one line
*before* pushing:

```js
// service-worker.js
const CACHE_NAME = 'medcheck-shell-v2';   // ← bump to v3, v4, ... on every
                                           //   deploy that touches a shell file
```

That single edit is what triggers the update — changing this line changes
`service-worker.js`'s own bytes, which is the only thing a browser checks
to decide "there's a new version." Forgetting it means the code on GitHub
and the live URL are both updated, but everyone with the app already
installed keeps silently running the old cached files indefinitely.

A couple of things worth knowing about how it rolls out once you do bump it:
- **No push notification** — the check only happens when someone opens the
  app. If they don't open it for a while, they don't get the update until
  they do.
- **One reopen needed** — the new files download and get cached in the
  background on that visit, but the page already running in memory keeps
  using the old code. The person needs to fully close and reopen the app
  once (not just switch away and back) for the update to actually take
  effect.

Not sure if an update landed? Bumping the version is always safe to do
even if you're unsure — it just forces a fresh recache of everything.

## Security notes

- Strict Content-Security-Policy (`script-src 'self'`, no inline scripts)
  is set in `index.html`.
- Every field in Gemini's response is HTML-escaped before being displayed,
  so adversarial text embedded in a photographed label/document can't
  execute as markup.
- History is stored as text only — images and PDFs are never persisted.
- The service worker only ever caches same-origin static files; it cannot
  see or cache a Gemini request/response.
- The API key lives in plaintext in `localStorage` (there's no backend to
  move it to) — this is the accepted trade-off of a bring-your-own-key,
  no-server architecture, and the strict CSP above is what meaningfully
  protects it in practice.

## Known limitations

- File-type/size checks happen client-side only — easily bypassed by
  editing the page's own JS, but that only affects the user's own request
  (their key, their quota), not anyone else's.
- Up to 6 files / ~18MB combined per analysis (Gemini's own inline-request
  limit, not an arbitrary restriction).
- Camera capture requires a browser that supports `getUserMedia` over a
  secure context (HTTPS, or `localhost` for local dev).

## License

All rights reserved — see [`LICENSE`](./LICENSE). Because GitHub Pages
requires a public repository, the source code will be publicly *viewable*
regardless of license; the license governs what people are legally
*permitted to do* with it (i.e. nothing, without written permission), not
whether they can see it.
