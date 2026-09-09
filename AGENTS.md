# AGENTS.md

Project instructions for AI agents working on this codebase. Applies across all
sessions/windows. Keep this file concise and up to date.

## Project

Handball Goalkeeper Trainer — a 2D reaction/positioning training game.
Stack: HTML5 + Canvas + vanilla ES modules, built with **Vite**.

## Commands

- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview production build: `npm run preview`
- Verify a build works: `npm run build`, then serve `dist/` and load `index.html`
- No lint/typecheck setup exists yet.

## Structure

- `index.html` — page shell + all DOM/HUD elements
- `js/main.js` — entry point (ES module), wires everything up
- `js/game.js` — main game engine: state, timer, HUD, game loop, SoundFX
- `js/targets.js` — TargetManager: spawn/draw/collide targets, particles, float text
- `js/store.js` — Zustand store (best score, history) persisted to localStorage
- `js/fun.js` — medals, taunts, titles (cosmetic only)
- `css/style.css` — all styling + animations

## Architecture / conventions

- ES modules only; import/export, no globals leaking between files.
- TargetManager is given a reference to the game and delegates scoring to it
  (`game.registerHit` / `game.registerMiss`).
- All sizes are relative (canvas ratios, `contentScale`), never hard-coded px,
  so the game scales across screens.
- UI text is bilingual (Arabic + English). Keep emoji use as-is.

## Game loop (important)

`gameLoop` runs ~60fps via `requestAnimationFrame`, passing `timestamp` (a
past bug was the timestamp not being passed, causing targets to never spawn).
Keep signature `gameLoop(timestamp)`.

## Mobile performance — DO NOT REGRESS THESE

The game targets phones; keep it smooth. Known expensive things to avoid:

- **No `backdrop-filter: blur()`** — mobile render-killer. Use near-opaque/solid
  backgrounds instead (removed from `.game-container` and `.overlay`).
- **No `ctx.shadowBlur`/`shadowColor`** on canvas — extremely slow on mobile GPU.
  The golden-ball glow is a cheap pre-drawn translucent ring instead.
- **Cap `devicePixelRatio`** — min(2, and 1.5 on screens ≤480px). Avoids 9x
  pixel fill on dpr-3 phones.
- **Cache the static background** — the goal/net/floor/gradient are drawn once
  into `goalCache` (offscreen canvas) and blitted each frame via `blitGoal()`.
  `_goalDirty` triggers a rebuild only on resize. The cache canvas is resized in
  `resizeCanvas()` and must stay in sync with the main canvas size.

## Delivery

This repo auto-deploys to Vercel on push to `main`. Commit to `main` to ship
changes. Local Vercel config (`.vercel/`) is gitignored.

## Android APK (signed release)

- Every push to `main` also triggers `.github/workflows/build-apk.yml`, which
  builds a **signed release APK**, publishes it to the GitHub Release tag
  `latest`, and shows a 📲 download button in the web UI.
- Permanent install URL (always the newest build, no login required):
  `https://github.com/Ali112008/handball-goalkeeper-game/releases/download/latest/app-release.apk`
- Version is auto-incremented per build via `github.run_number` (Gradle reads
  `VERSION_CODE`/`VERSION_NAME` env vars). This is what lets Android users
  update over a previous install without uninstalling.
- Signing identity lives in GitHub secrets (RELEASE_KEYSTORE_BASE64,
  RELEASE_KEYSTORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD) and a
  password-protected copy at `..\release-signing-backup\`
  (`handballkeeper-release.jks`). **Never lose the keystore/text — losing it
  permanently breaks updates.** Never commit the keystore (it's gitignored).
- Do NOT re-enter the `run: |` block scalar lines at column 0 in YAML
  (line 1 indent required) — GitHub rejects the workflow instantly with 0 jobs;
  validate with actionlint before pushing.

## Secrets

Never commit tokens or keys. There is an env file (`github and vercel info.env`)
outside the repo that holds credentials — do not reference or commit it. Use OS
keychain / env vars instead.
