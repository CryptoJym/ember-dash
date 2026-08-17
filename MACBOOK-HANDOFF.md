# Ember — MacBook Pro

**This machine is the signing / TestFlight cockpit.**  
**Path:** `/Users/jamesbrady/Projects/ember-dash`  
**Remote:** `https://github.com/CryptoJym/ember-dash`  
**Live web:** https://cryptojym.github.io/ember-dash/

The older non-git copy was moved aside on 2026-08-17:

`/Users/jamesbrady/Projects/ember-dash-pre-port-20260817`

Do not treat that backup as current.

## First open

```bash
cd /Users/jamesbrady/Projects/ember-dash
export PATH="/opt/homebrew/bin:$PATH"
git pull
npm install
npm run sync
npm run ios:open
```

Xcode:

1. Target **App**
2. **Signing & Capabilities** → your paid Apple Developer team
3. Bundle ID `com.utlyze.emberdash`
4. Destination **Any iOS Device (arm64)**
5. Run on a phone once, then **Product → Archive** → App Store Connect → TestFlight

Full checklist: `docs/TESTFLIGHT.md`

## After Studio pushes

```bash
cd /Users/jamesbrady/Projects/ember-dash
git pull
npm run sync
```

## Web preview on this Mac

```bash
npm run serve
# http://127.0.0.1:8765
```

