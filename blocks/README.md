# BLOCKS. — the honest training plan

The training companion to **[Splits.](../)** Splits answers *"is my goal honest, and what pace do I hold?"* Blocks answers the next question: *"what do I actually do each week to get there?"*

Static PWA. No build step, no backend, no dependencies. Race date + your fitness in — a periodised block of weekly triathlon sessions out, at paces, power and send-offs you can actually hold.

## What it does
- **Reverse-engineers your race date** into weeks of Base → Build → Peak → Taper, with a 3:1 deload rhythm and volume that ramps toward a peak week and tapers into race day.
- **Builds every session off your real fitness** — the same engine as Splits: Daniels VDOT for the run, CSS for the swim, Coggan power for the bike. A threshold run shows your exact pace; a bike VO₂ set shows your exact watts; a swim set shows the send-off.
- **Balances the three disciplines** to how many days a week you can train (3–7), keeping the key sessions — long ride, long run, swim threshold — and trimming from the bottom.
- **Projects race-week fitness** at sustainable progress rates and **predicts your finish**, then reality-checks it against your goal: on track / stretch / fantasy.
- **Tracks the work** — tick sessions done, watch weekly completion. Everything saves to `localStorage`, device-local, offline after first load.

## What's in here
- `index.html / styles.css / app.js` — the whole app. The top of `app.js` is the shared engine, lifted verbatim from Splits so paces and power match the calculator exactly.
- `sw.js` — offline cache (bump `CACHE='blocks-v1'` when you ship changes).
- `manifest.webmanifest` + icons — home-screen install identity.

## Calibration knobs (in `app.js`)
- `TRI` — per-distance race legs, bike IF, default peak hours, taper/peak lengths, run fatigue factor
- `RATE` — weekly improvement rates behind the projection (swim s/100, bike %FTP, run VDOT)
- `CONSISTENCY` — the completion assumption the projection is built on (0.85)
- `SLOTS` — the weekly session template and priority order
- `FRAC`, `ZONES`, `CEIL`, `ROB` — Daniels fractions, Coggan zones, overbike ceilings, run-off-bike penalty

These are honest population defaults. Retest the athlete every 4–6 weeks, update the fitness inputs, and tune the rates against who's actually in front of you before treating the projection as gospel.

## Deploy
Same as Splits — it's a plain static folder. Point Vercel (or any static host) at `blocks/`, no build command, no output directory. Every push redeploys.
