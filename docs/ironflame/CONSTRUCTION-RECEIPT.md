# Ember Dash: Ironflame — construction and verification receipt

## Actual implementation, not concept art

This release adds a Godot 4.7.2 GDScript / WebGL2 platformer under `forge/`, with editable source in `godot/` and native Blender scenes in `art-source/`. The original runner and earlier Canvas Lineage are separate. The generated concept boards guided six bloodline colors and motifs; they are not screenshots of the delivered game. Actual visual evidence is captured from the exported Godot build.

Blender 5.2.1 on Studio6 authored a continuous torso, articulated legs, head/tail poses, lineage ornaments, and 96 image cells across six variants. A fixed common foot anchor drives the animation atlas. The atlas verification reported no clipping at the edges of any of the 96 frames. Three editable environment scenes produce baked world plates; live foregrounds, enemies, light pickups and effects are drawn in Godot. This is stylized 2.5D, not a fully 3D or final high-detail fur game.

## Playability repairs

The previous bespoke controller was replaced with CharacterBody2D collisions: real solid wall and ceiling response, one-way ledges, drop-through, coyote time, jump buffering, separate ground/air acceleration, strong braking, meaningful tap/held jump heights, and a directional dash that cannot reverse mid-burst. Baseline double jump and dash work for every bloodline. Menus have a dedicated modal CanvasLayer whose visibility follows game state; this repairs the exported-web pause overlay defect that pure scene-signal tests did not reveal. Compact menus scroll within the viewport and mobile controls accept simultaneous movement and jump.

## Progression and death

The individual fox is a living character profile. Defeating enemies grants spirit experience according to enemy level; levels increase strength and award talent choices. Earned light buys upgrades in the sanctuary. XP, talents, upgrades and current room progress survive saving and reloading while the fox is alive. Actual lethal damage or an abyss fall replaces that profile with a two-field death tombstone. The next fox starts at level 1 with no light, XP, talents or upgrades.

The separate key is `ember-ironflame-godot-v1`. The previous `ember-lineage-v2` and `ember-dash-best-m` are not modified. Safe-ground restore excludes near-hazard and near-enemy checkpoints. Collected light, opened caches, defeated enemies and room-clear XP are preserved to prevent reward replay. Unknown saves are preserved rather than overwritten; unavailable storage is visibly temporary. Cross-tab conflict checks reject stale writes. This is browser-local persistence, not user accounts, cloud sync, server-enforced permadeath or anti-cheat.

## Native proof

The native build gate runs the production Godot engine and rejects failed assertions, script errors and engine errors. The four suites contain **65 assertions**: 20 pure rules, 6 basic physics, 14 controller/traversal checks and 25 actual scene-flow checks. Pure-rule batches cover 1,000 name selections and 1,000 room geometry envelopes. The controller suite actually jumps every mandatory gap in 40 generated chambers (**200 engine-collision traversals**), not merely a formula for reachability. Tap rise measured approximately 67 world pixels; held rise approximately 109. No required gap failed. A dash could not tunnel through the two-pixel test wall. Native headless tests do not play audio; browser/native visual play loads the six shipped WAV effects.

## Browser proof and exact artifact

`evidence/browser-smoke.json` records the keyboard/mouse/save smoke assertions. `evidence/journey.json` records the full actual-input chamber traversal, combat, earned XP/light, paid upgrade, selected talent, reload, no repeated room-clear reward, death, fresh life, old-save preservation, cross-tab conflict and two-touch mobile checks. Controlled traversal reads the engine's read-only state but does not mutate characters, positions, currency or damage. The browser scripts produce real screenshots. Portrait and landscape are Chromium touch emulation, not physical iPhone/Safari proof.

`evidence/tested-build.json` binds the tested output by SHA256 and size. Public verification is separately recorded after release; local browser success alone is not deployment proof. Engine and third-party notices are exported from the installed engine to `forge/ENGINE-LICENSES.txt`. The loading shell is branded without changing engine boot behavior.

## Release boundary and recovery

Release only the additive Godot files. The construction branch starts from an unreleased earlier Canvas-art candidate, so the accepted Godot commit must be cherry-picked onto the current public main, not merged with that candidate ancestry. Verify both old entry pages remain byte-identical. Rollback removes only this additive playtest commit; neither earlier game nor earlier saves depend on it.

This is a working indie-game construction playtest, not commercial completion. It has three ordinary enemy behaviors, one scaling keeper behavior with biome-specific presentation, and horizontal randomized chambers with two route modifiers. Connected multi-floor dungeons, a composed soundtrack, cloud profiles, differentiated boss mechanics, sustained balance/performance certification and physical iPhone/gamepad acceptance remain open.
