# ⛳ Mini 18 — Famous Holes Putt-Putt

A mobile-first, single-file HTML5 **mini-golf** game: putt-putt tributes to the
greatest holes in golf — Augusta, Pebble, Sawgrass, St Andrews, Oakmont and more
— reimagined with walls, water, bunkers, slopes, bumpers, a windmill, a spinner
and teleport warps.

## How to play
- **Drag back** from the ball and release to putt (slingshot).
- A dotted line **previews the roll and bounces** before you commit.
- Walls bounce · sand slows · water costs a stroke · ride the slopes.
- Time the windmill, dodge the spinner, use the warps. 2 mulligans per round.

## Project structure
- `index.html` — the whole game (HTML + CSS + canvas JS, no build step).
- `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` — PWA assets.
- `sw.js` — offline cache service worker (bump `CACHE` when you ship changes).

## Run locally
```bash
npx serve .     # or: python3 -m http.server 8000
```

## Deploy
Any static host works — no build step. Deployed to Vercel as project `mini-18`
via `.github/workflows/deploy-mini-18.yml` on every push to `main` touching
`mini-18/**`.
