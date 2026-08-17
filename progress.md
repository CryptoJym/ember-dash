# Progress

## 2026-08-16 — refine one-2

- iPhone landscape only. Home-screen name Ember. Title/death go edge-to-edge on native.
- JUMP/DASH are gold rings; hidden on desktop (keyboard). ENTER focus is the filament, not a box.
- 8-frame painted run. 15s silent `assets/store-preview.mp4`. Store words in `docs/STORE.md`.

## 2026-08-16 — one fox, one number, public page

- Game sprite, jump, run cells keyed from the cinematic fox. Icon is the face.
- HUD is meters only, hidden until play. Lives appear only after a wisp hit. No footer, no early hints, no canvas tutorial chrome.
- Death stamp is the painted face + meters. Best is stored as meters (`ember-dash-best-m`).
- Cache `?v=20260816-one-1`.

## 2026-08-16 — first pit + death stamp

- First pit is a hard void: walking cannot steal the far pad. Falling through the street dies immediately.
- Retry is sync. Tap the death screen or press Space. Audio unlocks in the background.
- Death writes a share card (meters + fox crop). SEND uses Web Share or Capacitor Share/Filesystem.

## 2026-08-16 — HUD instrument + button feel

- Top bar is no longer four stat cards. One gold-line instrument: ember lives, Didot score, distance/best, MUS/SFX dials.
- Lives are lantern pips. Fever/combo writes into the readout.
- ENTER stamps on press. JUMP fill rises while held. DASH rim turns when ready. Pads squash on press.

## 2026-08-16 — title enter

- Title overlay is no longer a wordy card. Fox stays the poster.
- One wordmark (`EMBER`) and a gold-line `ENTER` at the bottom. Space still starts.
- Death screen keeps score + `Run Again`. Cache `?v=20260816-enter-1`.

## 2026-08-16 — fox-visible trailer

- Title menu moved to the left; overlay wash no longer covers the fox.
- New close-up opening shot + tight mid/leap cut. Poster: `assets/entry-poster.jpg`.
- Cache `?v=20260816-fox-2`. Synced to `www/` and iOS `public/`.

## 2026-08-15 — iOS app bundle

- Capacitor iOS app `com.utlyze.emberdash`, version **1.0.1** (build **2**).
- Entry trailer copied into `ios/App/App/public/assets/entry-trailer.mp4`.
- Landscape-first, `public.app-category.games`, 120 Hz flag.
- Studio0 has no Xcode.app — archive/TestFlight is on the MacBook (`npm run ios:open`).

## 2026-08-15 — entry trailer

- Imagine cut: wake → run → leap (3×6s). `media/trailer/ember-dash-entry.mp4` and `assets/entry-trailer.mp4`.
- Title overlay plays the trailer behind the Start panel. Game over does not replay it.
- Cache: `js/game.js?v=20260815-entry-1`.
