# Ember → TestFlight

The game is ready to wrap. The remaining gate is **your Apple team**, not more scaffolding.

Studio0 has Xcode 16.4. It has **no signing identities**. Archive and upload from the **MacBook**, signed into your paid Apple Developer account.

Live web (not TestFlight): https://cryptojym.github.io/ember-dash/

| Already done | Still on you |
|---|---|
| Capacitor iOS app | Paid Apple Developer Program ($99/yr) |
| Bundle ID `com.utlyze.emberdash` | App Store Connect app record with that ID |
| Version **1.0.1** build **2** | Team selected in Xcode signing |
| Games category, encryption = No | Archive → upload |
| Icon + splash = cinematic fox | Internal TestFlight group + testers |
| Privacy manifest in the target | First run on a real iPhone |

---

## Your steps (once)

### 1. Confirm Apple Developer is paid and open
[developer.apple.com/account](https://developer.apple.com/account)

### 2. Create the app record
[appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → +

- Platform: iOS
- Name: Ember Dash (store name; home screen can stay Ember Dash)
- Bundle ID: `com.utlyze.emberdash` (register it under Certificates, IDs & Profiles if it is not there)
- SKU: `ember-dash-001`
- User access: full

Then TestFlight → create an **Internal** group. Add yourself first.

### 3. Pull and open on the MacBook

```bash
# if this machine is the source of truth, sync the repo to the MacBook first
cd /Users/jamesbrady/Projects/ember-dash   # or wherever you cloned CryptoJym/ember-dash
git pull
export PATH="/opt/homebrew/bin:$PATH"
npm install
npm run sync
npm run ios:open
```

### 4. Sign
Xcode → target **App** → **Signing & Capabilities**

- Automatically manage signing: ON
- Team: your paid team (not “Personal Team” if you want TestFlight)
- Bundle Identifier: `com.utlyze.emberdash`

Plug in an iPhone once and hit Run. Confirm ENTER, first pit, SEND, audio, haptics.

### 5. Archive and upload
- Destination: **Any iOS Device (arm64)**
- Product → Archive
- Distribute App → App Store Connect → Upload
- Encryption question: **No** (already in Info.plist)

Wait for processing. App Store Connect → TestFlight → add the build to the internal group. Testers install the **TestFlight** app, then Ember.

Every new upload: bump **Build** (3, 4, 5…). Version can stay 1.0.1 until you care.

---

## After I change the game

On Studio or MacBook:

```bash
npm run sync
```

Then archive again. `www/` and `ios/App/App/public` are generated. Do not edit those by hand.

---

## Not TestFlight, but useful today

- Web: https://cryptojym.github.io/ember-dash/
- Same Wi-Fi preview: `npm run serve` → `http://<studio-ip>:8765`

---

## Usual failures

| Symptom | Cause |
|---|---|
| No signing identities on Studio0 | Expected. Sign on the MacBook. |
| Bundle ID not available | Someone else registered `com.utlyze.emberdash`. Change it in `capacitor.config.json` + Xcode, then `npm run sync`. |
| Personal Team cannot upload | Need the paid program for TestFlight. |
| Blank webview | Forgot `npm run sync` after a game edit. |
| No sound | First tap must be ENTER. That unlocks audio. |
| Haptics silent | Simulator never vibrates. Phone only. |
