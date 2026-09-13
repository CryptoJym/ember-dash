# Ember Dash approved-art release receipt

Date: 12 September 2026. Work: `eco-nt8oly`. Branch: `astra/art-direction-20260912`.
Baseline before this release: public `main` `aeca864c11cfde739aad77489f19f29301cf4993`.

## What was actually built

BORG was used for local writes and command execution. Blender 5.2.1 on Studio6 and Godot 4.7.2 were used directly. The classic root game remains byte-unchanged from the baseline; this work targets the additive `/forge/` Godot game.

The six foxes now use the approved painted character sheet from this conversation directly. The game no longer depends on one recolored substitute character for the bloodlines. The approved source is stored under `art-source/approved/source.avif`. Six separate Blender 2.5D puppet scenes preserve those paintings as packed textures and animate a continuous mesh with sixteen keyed poses each: idle, run, rise, fall, dash, and pulse. The export therefore contains 96 approved-art animation cells at 512×384, six clean selection portraits, and six HUD heads. The selection UI names the canonical founders Caldera, Mira, Zephra, Astra, Solen, and Briar while living descendants retain randomized personal names.

The three approved environment paintings from the conversation are stored at `art-source/approved/worlds.avif` and adapted into widescreen matte plates for The Lanternwild, The Glass Cathedral, and The Cinder Below. Demo characters baked into the source paintings are removed. Foreground collision remains real Godot geometry, while Blender-authored transparent terrain, portals, and four enemy archetypes provide the visible world. The final terrain pass replaces repetitive brick walls with fractured natural stone ledges, moss/flowers, roots, crystal or ember treatments, and a thin visible landing contour that matches the unchanged collision surface.

Editable Blender source is retained under `art-source/approved/`: six painted fox puppet `.blend` files, three approved 2.5D stage `.blend` files, and ten prop `.blend` files for terrain, portals, and enemies. These are deliberately 2.5D art scenes; this release does not claim the painted matte worlds were reconstructed as fully modeled 3D environments.

## Progression implemented from the owner direction

A living fox keeps its XP, level, light, talents, upgrades, and absorbed Spirit when the page is closed and reopened. Defeating an enemy now transfers that enemy's level into the fox's `Spirit` total in addition to XP. Spirit contributes bounded damage, speed, pulse-radius, and light-attraction growth. The HUD exposes the Spirit total. Death writes only the two-field dead-profile tombstone, so absorbed levels, XP, light, talents, and upgrades disappear with that fox. A descendant starts at level 1 with zero Spirit.

This extends the existing version-1 Ironflame save compatibly: older living profiles normalize with `spirit=0`; earlier classic and Lineage save keys remain untouched.

## Native verification

The exact Godot source used for the candidate passes:

- 21 pure rules assertions, including 1,000 deterministic heir-name batches and 1,000 generated chamber geometry envelopes.
- 6 direct physics assertions.
- 14 actual `CharacterBody2D` controller/traversal assertions, including 200 generated gaps traversed through engine collision.
- 27 actual scene-flow assertions covering menus, combat rewards, Spirit absorption, upgrades, room carry-over, lethal death, and fresh descendant reset.
- 43 art/projection contract assertions covering all 96 approved fox cells, six distinct bloodlines, no cell clipping, landing-anchor alignment, all three terrain/portal sets, and all four enemy assets.

That is 111 non-duplicated native assertions. Logs are under `docs/art-direction/evidence/final-native/`.

## Exact browser verification

The exact exported WebGL artifact passes the final 13-check smoke suite in real local Chrome: runtime startup, unique descendant names, clean menu removal, keyboard movement, braking, held jump, dash activation/distance, pause/resume, native `localStorage` save/reload, and zero uncaught/script errors.

The exact exported artifact also passes the 22-check full browser journey: organic keyboard traversal and combat, XP/level growth, enemy-level absorption into Spirit, earned light, a real purchased strength upgrade, a chosen talent, XP and Spirit persistence across reload, cleared-sanctuary anti-farming, real fall death, dead-profile tombstone, fresh zero-Spirit descendant, preservation of prior Ember Dash save keys, stale-tab write rejection, and simultaneous movement+jump touch input at both 390×844 and 844×390. Mobile verification is Chromium touch emulation, not physical-device certification.

Final browser receipts and screenshots are under `docs/art-direction/evidence/exact-final-smoke/` and `docs/art-direction/evidence/exact-final-journey3/`.

## Exact candidate artifacts

- `forge/index.html` SHA-256: `c4117bcfa11c5fcb57e1b703b5c698c8b7a6de841dfb5d0d58a0ed7ba4d05072`
- `forge/index.pck` SHA-256: `f4f7777cfbd101292f9ee9d707be19bd8bc913e9e2410210d374dc315ad2d671`
- `forge/index.wasm` SHA-256: `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0`

The PCK is rebuilt from the approved direct-art pipeline. The WASM engine binary is unchanged from the previously verified Godot 4.7.2 export.

## Remaining boundary

This release is verified in native Godot and real Chrome/WebGL. Physical iPhone/Safari and physical gamepad hardware were not available to this agent, so those are not claimed. The approved matte paintings are the game's 2.5D visual direction; background features that look like distant platforms are scenery, while live traversable surfaces are always drawn with the separate Blender foreground and explicit landing contour.

The community Blender MCP experiment remains optional and is not part of the game runtime. BORG-to-Blender batch rendering is the proven production path used for this release.

## Release-review correction after the approved-art checkpoint

Commit e348727 captured the approved-art build and the browser results above. Final review subsequently reproduced one progression defect: absorbed Spirit was recorded immediately but active strength/range/speed only refreshed at the next XP level. The correction refreshes active attributes on every defeat and still limits healing to actual level-ups.

The new regression failed before the patch and passes afterward. Native counts are now rules 21, physics 6, controller 14, scene flow 30, art 43: **114 distinct assertions**. Additionally, loading the exact rebuilt web PCK with native Godot --main-pack passed all 30 scene-flow assertions; those duplicate the flow suite and are not added to 114.

Final correction artifacts supersede the checkpoint hashes above:
- HTML: `1d30239ec458d81b4487ee5f5744ad795d50eb8f2d8736c4dc59e09d99acde8b` (6,901 bytes)
- PCK: `d2decf3d6fcd905835d8975e97853ee54e290dcac7d9df3a7554e493e8ffcff2` (14,568,604 bytes)
- WASM: `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0` (unchanged)

The 13+22 browser passes remain evidence for the approved-art checkpoint, not a new browser run of this correction. Tool safety checks refused the two requested browser-script reruns before execution. The exact final pack has native engine verification, but a fresh final browser run is not claimed. See evidence/release-review/VERIFICATION.md and the before/after and native-pack logs for the precise scope.
