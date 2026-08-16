# Ember Dash — iOS TestFlight handoff (MacBook Pro)

You are on **James Brady’s MacBook Pro** (`Utlyze-6.local`, user `jamesbrady`).
This is the **build machine** for shipping Ember Dash to Apple TestFlight.
Full Xcode is installed here. Studio0 was the game-dev machine; do not assume Studio paths.

## Project path (source of truth on this Mac)

```
/Users/jamesbrady/Projects/ember-dash
```

Related docs in-repo:
- `docs/TESTFLIGHT.md` — full TestFlight checklist
- `MACBOOK-HANDOFF.md` — short open/build notes
- `README.md` — game + Capacitor overview

## What Ember Dash is

A **local noir-gold HTML5 side-scroller** (canvas game), now wrapped as a **Capacitor iOS app** for TestFlight.

Gameplay (already built — do not rebuild from scratch unless asked):
- Ember fox runner: jump / double-jump, 3 lives, coyote + jump buffer
- Gold signal orbs (combo scoring), static wisps (stomp or dash-plow)
- **Ember Dash**: Shift / DASH button — ~0.4s invincible surge, coin magnet, 2× coins, ~3.6s cooldown
- Procedural music + SFX (Web Audio), mobile JUMP + DASH pads, safe-area layout
- Native bridge (`js/native.js`): haptics, status bar, pause on background

## Stack / layout

```
index.html, styles.css, js/, assets/   # game source of truth
www/                                   # Capacitor webDir (generated)
ios/                                   # Xcode project (Capacitor 8 / SPM)
resources/                             # master icon + splash
capacitor.config.json
scripts/prepare-www.sh
```

- Bundle ID: `com.utlyze.emberdash` (change only if James’s Apple team needs a different ID)
- App display name: **Ember Dash**
- Capacitor appId matches bundle ID
- Icon/splash already generated into `ios/App/App/Assets.xcassets/`
- `ITSAppUsesNonExemptEncryption` = false (standard HTTPS only)

## Day-to-day commands (this Mac)

```bash
export PATH="/opt/homebrew/bin:/Users/jamesbrady/.local/bin:$PATH"
cd /Users/jamesbrady/Projects/ember-dash

npm run sync        # prepare www + cap sync ios  (after any game edit)
npm run ios:open    # open Xcode
npm run serve       # web preview http://127.0.0.1:8765
```

Node is at `/opt/homebrew/bin` (non-login shells need that PATH).

## Your job right now

Help James **get a TestFlight build out**, not redesign the game.

1. Verify project health: `ios/App/App.xcodeproj` exists, `npm run sync` works, no missing web assets in `www/` / `ios/App/App/public/`.
2. Open Xcode via `npm run ios:open` when appropriate (ask before long GUI actions if unclear).
3. Guide or perform **Signing & Capabilities**: select James’s Apple Developer team; confirm bundle ID.
4. Guide **Product → Archive → Distribute → App Store Connect → TestFlight**.
5. If App Store Connect app doesn’t exist yet: walk through creating iOS app with matching bundle ID.
6. Call out blockers clearly (signing, certificates, device, network) with the next exact click/command.
7. After game code changes: always `npm run sync` before re-archive.

## Rules

- Prefer minimal, surgical changes.
- Do not invent Apple account credentials or paste secrets.
- Do not delete `ios/` or re-init Capacitor unless broken and James agrees.
- Studio0 path `/Users/utlyze/Projects/goldline-runner` is the old mirror; **this MacBook path is authoritative for shipping**.
- Web playtest is fine; TestFlight still needs Xcode archive + ASC upload.

## First response expected from you

1. Confirm cwd and that you see the Capacitor iOS tree.
2. Run a quick health check (`ls`, `npm run sync` if needed).
3. State whether Xcode can open and what James should click next for signing + first Archive.
4. Offer to either (a) open Xcode now, or (b) tighten anything blocking TestFlight.

Start.
