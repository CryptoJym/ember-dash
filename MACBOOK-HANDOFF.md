# Ember Dash — MacBook Pro handoff

**Synced from:** Studio0 (`/Users/utlyze/Projects/goldline-runner`)  
**Local path:** `/Users/jamesbrady/Projects/ember-dash`  
**Xcode on this machine:** present (verified)

## Open & build for TestFlight

```bash
cd /Users/jamesbrady/Projects/ember-dash
export PATH="/opt/homebrew/bin:$PATH"
npm run ios:open
```

In Xcode:

1. Select **App** target  
2. **Signing & Capabilities** → your Apple Developer **Team**  
3. Bundle ID: `com.utlyze.emberdash` (change if needed)  
4. Destination: **Any iOS Device (arm64)**  
5. **Product → Archive** → Distribute → App Store Connect → TestFlight  

Full checklist: `docs/TESTFLIGHT.md`

## After game code edits

```bash
cd /Users/jamesbrady/Projects/ember-dash
export PATH="/opt/homebrew/bin:$PATH"
npm run sync
```

## Web preview

```bash
npm run serve
# http://127.0.0.1:8765
```
