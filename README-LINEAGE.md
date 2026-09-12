# Ember Dash — Lineage

A playable browser-native fox platformer / roguelite built from the Ember Dash audit.

## Play

Open the standalone `index.html` in a modern browser, or serve this directory with `python3 -m http.server 8765` and open the local page. No npm install, CDN, account, external fonts or asset download is required at runtime. Local-file persistence depends on your browser; use Export save to retain a portable backup. In the original Ember Dash repository the additive build is `lineage.html`; the existing `index.html` remains the classic runner.

A / D or arrows: move. Space / W / Up: jump and air jump. Shift / K: invulnerable dash. J / X: light pulse. E / Down: chest, shrine or exit. Esc / P: pause. Touch buttons are available on coarse-pointer devices. Controller mapping: left stick / D-pad, A jump, B dash, X pulse, Y interact, Start pause. Controller support is implemented but has not been verified on physical hardware.

## The loop

Choose one of three randomized heirs. Every heir has one of six positive bloodlines and an additional positive spirit trait. Orange Emberkin has a stronger, wider pulse; cyan Moonveil gains a ward each chamber; mint Zephyr is faster and can triple-jump; violet Starborn has a longer, quicker-recharging dash; golden Solstice attracts and earns extra light; rose Wildheart has more health and heals between chambers.

Navigate seeded chambers with optional elevated caches, light motes, creatures and traps. Choose a temporary boon at light thresholds and shrines. At the exit, choose between two route modifiers. Every fifth chamber has a Hollow Keeper that seals the exit until defeated. Three biome palettes cycle in five-chamber bands: Lanternwild, Glass Cathedral, Cinder Below. Geometry continues indefinitely; encounter scaling is deliberately capped rather than making arithmetic grow without limit.

All gathered light is immediately credited to the browser's lineage wallet. Death advances the generation but does not deduct light. The hearth sells four permanent upgrades: vitality, pulse damage, attraction radius and dash recharge. The last twelve ancestors are remembered. Repeated seeds reproduce chamber geometry and encounters given the same depth and route; effects such as sparks are cosmetic randomness.

## Saving and reliability

A separate version-2 save key leaves the classic runner's best-distance record untouched. Invalid/unsupported saves are not silently overwritten. Disabled storage falls back to memory-only play with a warning and export. Import is size-limited, version-checked and confirmed before replacement; display names are sanitized. Active-run records are settled once on reload, keeping previously saved light. The exact in-progress room is **not** resumed after closing the page. A save changed in another tab pauses the stale session; this is conflict detection, not a transactional multi-tab database or cloud sync.

Simulation uses fixed 120 Hz steps, bounded catch-up, coyote time, buffered/variable-height jumps, cooldowns and invulnerability. Movement input is cleared on pause, focus loss and pointer cancellation. Portrait uses a closer camera instead of shrinking the whole landscape viewport. Reduced-motion and sound toggles are provided. Keyboard menus are usable; the spatial canvas gameplay itself is not screen-reader accessible.

## Development

`node scripts/build.mjs` creates standalone `index.html` in this package. In the original game repository, use `node scripts/build.mjs --out=lineage.html --with-classic` so the original entry point stays intact.

`node --test tests/core.test.mjs` runs 26 core tests, including 9,000 chamber-generation cases and every mandatory gap in 1,000 chambers through the real physics integrator. The portable source package additionally includes `tests/browser_smoke.py`, a 34-check in-memory Chromium UI suite. `tests/native-browser.mjs` uses an installed Node Playwright and actual loopback-origin browser storage. See the audit and evidence for the exact checks actually run.

Modules: `lineage/core.mjs` deterministic mechanics and save rules; `lineage/renderer.mjs` animated Canvas artwork; `lineage/game.mjs` UI, input, combat, audio and state transitions. The build uses Node standard libraries only. Test instrumentation is enabled only by `?test` or an explicit harness flag, and is not an anti-cheat security boundary. Saves are local and user-editable.

## Scope

This is a complete playable vertical slice, not a finished commercial game. Chambers are randomized horizontal platform sequences with optional ledges and two route choices between chambers, not a fully connected multi-floor dungeon map. There is one guardian archetype and three regular creature archetypes. Art is custom procedural/vector rendering, not Blender renders or a Unity export. It does not yet have original recorded music, distinct biome-specific boss designs, cloud saves, a gamepad-driven menu system, or full Safari / real-device certification. Existing iOS signing and store submission are unchanged.
