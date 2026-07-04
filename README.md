# SPLITS. — the honest race calculator

Static PWA. No build step, no backend, no dependencies. One goal in — every pace, split and hard truth out.

## Deploy (Vercel, ~3 minutes)

**Option A — GitHub (recommended, same flow as TriArchive):**
1. Create a repo (e.g. `splits`) and push this folder's contents to the root.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Other**. Build command: *(leave empty)*. Output directory: *(leave empty / root)*.
4. Deploy. Done — every push to `main` redeploys.

**Option B — CLI, no repo:**
```bash
npx vercel --prod
```
Run it inside this folder and accept the defaults.

Add a custom domain later in Vercel → Settings → Domains (e.g. `splits.twoislands.co.nz`).

## Install on a phone
Open the deployed URL in Safari (iOS) → Share → **Add to Home Screen**. It installs with the SPLITS icon, runs full-screen, and works offline after first load (service worker caches everything).

## What's in here
- `index.html / styles.css / app.js` — the whole app. All maths lives in the top half of `app.js` as pure functions (VDOT, CSS, bike physics, Riegel) — lift them straight into a future Next.js build if/when you add accounts or Strava sync.
- `sw.js` — offline cache (bump `CACHE='splits-v1'` to `v2` etc. when you ship changes, or users may see the old version).
- `manifest.webmanifest` + icons — home-screen install identity.

## Persistence
Everything the athlete enters — units, goals, current fitness, race legs, pace-band settings — saves to `localStorage` automatically and restores on next visit. Clearing site data resets it. (This is device-local: no accounts, nothing leaves the phone.)

## Calibration knobs (in `app.js`)
- `FRAC` — Daniels intensity fractions (run paces)
- `swimOffFromCSS`, `SWIMCOND` — swim distance/open-water offsets
- `CEIL`, `ROB`, `runPenalty` — bike IF ceilings and run-off-bike penalties
- `RATE` — improvement rates behind the on-track/stretch/fantasy verdicts
- `BIKE_IF`, `CDA` — bike effort curve and position drag

These are honest population defaults. Tune them against real athletes before treating verdicts as gospel.
