# Ember Dash → TestFlight

This project is a **Capacitor iOS** wrapper around the HTML5 game so you can
ship a real iPhone/iPad build through **Apple TestFlight**.

## What this machine already has

| Item | Status |
|------|--------|
| Game web app (`www/`) | Ready |
| Capacitor iOS project (`ios/`) | Scaffolded |
| App ID | `com.utlyze.emberdash` (change if needed) |
| Display name | Ember Dash |
| App icon + splash | Generated under `ios/App/App/Assets.xcassets/` |
| Export compliance flag | `ITSAppUsesNonExemptEncryption = false` |

## What **you** still need (Apple requirement)

1. **Xcode** from the Mac App Store (full app, not only Command Line Tools)  
   - On this Studio host, only CLT was installed when scaffolded — install Xcode and run:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   ```
2. **Apple Developer Program** membership ($99/year) signed into Xcode  
3. A free moment to create the App Store Connect app + TestFlight group  

Without those, the project is ready but cannot produce an `.ipa` upload.

---

## One-time setup

### 1. Install tools (if missing)

```bash
# Xcode from App Store, then:
xcode-select -s /Applications/Xcode.app/Contents/Developer

# CocoaPods is not required for Capacitor 8 SPM-based plugins,
# but Xcode itself is required to archive.
```

### 2. Pick your bundle ID

Default: `com.utlyze.emberdash`

If that ID is not yours on App Store Connect, change it in:

- `capacitor.config.json` → `appId`
- Xcode → target **App** → **Signing & Capabilities** → Bundle Identifier

Then re-sync:

```bash
cd /Users/utlyze/Projects/goldline-runner
npm run sync
```

### 3. Open in Xcode

```bash
cd /Users/utlyze/Projects/goldline-runner
npm run ios:open
```

In Xcode:

1. Select the **App** target  
2. **Signing & Capabilities**  
   - Team: your Apple Developer team  
   - Automatically manage signing: ON  
3. Select a physical iPhone or **Any iOS Device (arm64)** for archive  

### 4. Run on a phone (sanity)

- Plug in an iPhone, Trust computer  
- Select the device → ▶ Run  
- Confirm jump / dash / audio / haptics  

---

## Ship to TestFlight

### A. App Store Connect (web)

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+**  
2. New iOS app  
   - Name: Ember Dash  
   - Bundle ID: must match Xcode (`com.utlyze.emberdash` or yours)  
   - SKU: e.g. `ember-dash-001`  
3. Create a **TestFlight** internal group (you + trusted testers)  

### B. Archive & upload (Xcode)

1. Menu **Product → Destination → Any iOS Device (arm64)**  
2. **Product → Archive**  
3. Organizer → **Distribute App** → **App Store Connect** → Upload  
4. Wait for processing (email / App Store Connect → TestFlight)  
5. Answer export compliance if asked (we set non-exempt encryption **No**)  
6. Add build to internal testers → they install via **TestFlight** app  

### C. Version numbers

Bump before each upload:

- Xcode → target **App** → **General**  
  - Version: `1.0.0` (user-facing)  
  - Build: `1`, `2`, `3`… (must increase every upload)  

Or edit `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the Xcode project.

---

## Day-to-day game changes

After editing `index.html`, `styles.css`, `js/*`, or `assets/*`:

```bash
cd /Users/utlyze/Projects/goldline-runner
npm run sync          # refresh www/ + copy into ios
npm run ios:open      # optional: reopen Xcode
```

Then re-run or re-archive.

---

## Optional: web preview on phone (not TestFlight)

Same LAN:

```bash
npm run serve:www
# open http://<studio-ip>:8765 on the phone browser
```

That is **not** a TestFlight install — useful only for quick UI checks.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `xcodebuild requires Xcode` | Install Xcode.app; `xcode-select -s` to it |
| Signing error | Free or paid team selected; bundle ID unique |
| Blank white screen | `npm run sync`; check Safari Web Inspector on device |
| No sound | iOS requires a user gesture first — Start Run unlocks audio |
| Haptics silent | Only on device, not Simulator; real iPhone |
| Upload rejected encryption | Confirm ITSAppUsesNonExemptEncryption is false |

---

## Project map

```
goldline-runner/
  index.html, styles.css, js/, assets/   # source of truth
  www/                                   # Capacitor webDir (generated)
  ios/                                   # Xcode project
  resources/icon.png, splash.png         # master marketing assets
  capacitor.config.json
  scripts/prepare-www.sh
  docs/TESTFLIGHT.md                     # this file
```

## Reality check

**TestFlight = signed iOS app from Xcode + App Store Connect.**  
This repo is fully prepared for that path. The remaining gate is Apple tooling and your Developer account on a Mac with Xcode — not more game code.
