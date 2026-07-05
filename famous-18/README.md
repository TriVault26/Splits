# ⛳ 18 Famous Holes — Championship Golf

A mobile-first browser golf game playing tributes to the greatest holes in world golf:
Augusta National (12, 13, 16, 18), Pebble Beach (7, 8), TPC Sawgrass 17, the Road Hole
at St Andrews, Royal Troon's Postage Stamp, Oakmont's Church Pews, Cypress Point 16,
Carnoustie's Barry Burn and more — all at real championship yardages.

## Features
- 3-click swing meter (tap for power, tap at the line for strike) — bad lies speed the meter up
- Full club bag with realistic distances, carry + bounce + rollout physics
- Wind that drifts the ball in flight, shown on an in-game compass
- Fairway / rough / bunker / green lies with distance and accuracy penalties
- Synthesized sound (WebAudio — no audio files): strikes, bounces, splashes, cup rattle
- Personal best tracking (localStorage)
- Installable PWA with offline support (manifest + service worker)

## Project structure
- `index.html` — the entire game (single file: HTML + CSS + JS, canvas-rendered)
- `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` — PWA assets
- `sw.js` — offline cache service worker

## Run locally
```bash
npx serve .
# or
python3 -m http.server 8000
```
Then open http://localhost:8000 (the service worker and audio need http(s), not file://).

## Deploy
Any static host works — there is no build step.

**Vercel:** `npx vercel --prod` from this directory (framework preset: Other / static).

**Netlify:** drag this folder into the Netlify dashboard, or `npx netlify deploy --prod --dir .`

**GitHub Pages:** push to a repo, enable Pages on the root of the main branch.

## Notes for future development
- Game constants (club distances, friction, wind strength, meter speed) are at the top of the
  `<script>` in `index.html`, clearly sectioned.
- Hole layouts live in the `HOLES` array; fairway shapes in `FAIRWAYS` (polyline waypoints).
- The static course background is baked to an offscreen canvas per hole (`renderCourseLayer`)
  for performance — if you change terrain rendering, it re-bakes on hole load.
- Best-round stats persist via Claude artifact storage when run inside Claude, and
  localStorage when deployed to the web (automatic fallback).
