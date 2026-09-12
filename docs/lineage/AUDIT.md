# Ember Dash: Lineage — audit and release scope

Audited base: `38277eca6fe62fec9f2638eb440d4c8a0b057ce1` in `CryptoJym/ember-dash`.

## Preserve what works
The classic runner already has fox artwork, dash effects, audio, fixed-step simulation, coyote time, jump buffering, an authored teaching course and a Capacitor wrapper. All original tracked files remain unchanged. The new mode is additive at `lineage.html`, with its own save key.

## Findings and fixes in the new mode
The original is an automatic runner, rather than player-controlled exploration. The new mode adds bidirectional movement, randomized chambers, route choices, combat, guardian seals and permanent progression. Six color-coded bloodlines and four additional spirit traits are entirely beneficial.

The original authored course repeats; subsequent generation uses unseeded `Math.random()` around `js/game.js` lines 830–934. Lineage seeds its first chamber, later geometry, encounters and choices. Cosmetic sparks remain non-deterministic.

Unguarded storage access at original `js/game.js` lines 164 and 1041 can throw. Lineage guards storage, preserves corrupt or unsupported saves, offers import/export and memory-only play, settles interrupted expeditions once, and detects cross-tab changes. The original storage implementation is not changed.

Original persistence tracks best distance, not an upgrade economy. The new version-2 save retains light, generation, four permanent upgrade tracks, and twelve ancestors. Death does not deduct light.

The classic first-pit test is narrow. Added pure Node and native-browser suites cover the new mode; no claim is made that the classic first-pit harness was rerun. A possible already-failed-image loading edge in the original is a source-review risk, not a reproduced failure. Lineage has no external runtime assets.

## Exact verification
`evidence/core-tests.txt`: 26 passing Node tests, including 9,000 generated chamber cases and actual baseline-physics jumps over every required gap in 1,000 chambers. Tests also cover deterministic replay, safe checkpoints, positive powers, cooldowns, exact spending, corrupt and blocked saves, and idempotent death settlement.

`evidence/native-browser.json`: 11 passing checks in disposable macOS Chrome over loopback HTTP using real localStorage. Reload persistence, interrupted-run settlement, keyboard movement/jump/dash and genuine cross-tab conflict detection passed without uncaught errors. The receipt records the tested HTML SHA-256. The portable source package additionally carries a 34-check in-memory Chromium UI suite; its storage shim is explicitly not native persistence proof.

Screenshot review led to a closer portrait camera, phone-specific control hints, notifications above the playfield and an always-visible hero during invulnerability instead of blinking away. Imported names have a bounded character allowlist.

## Boundaries and recovery
This is a playable vertical slice, not commercial release certification. Chambers are randomized horizontal sequences with optional ledges, not a connected multi-floor dungeon map. Three biome treatments, three ordinary enemy archetypes and one scaling guardian are implemented. Controlled combat fixtures do not prove organic encounter balance. Physical iPhone, Safari, gamepad hardware and sustained frame-time testing remain open. Exact in-progress rooms do not resume after closing the page; saved light is retained. Cross-tab detection is not a transactional database or cloud sync.

Only additive files are introduced. Revert the Lineage release commit to remove the new mode; classic code, assets, native signing and best-distance storage remain independent. No new paid service or account is required.
