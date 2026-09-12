# Ember Dash: Ironflame — Godot construction playtest

This is the separate **real Godot 4.7.2 / GDScript game**, not the Canvas prototype and not a screenshot of the image-generation boards. Open `project.godot` in the installed Godot editor. Blender creates the animation cells and world plates; Godot owns movement, collision, input, combat, progression, menus, audio and browser export.

## Play and controls

The published build lives under `/forge/` in the Ember Dash website. The original root runner and `/lineage.html` remain separate and unchanged by this release. A web export must be served over HTTP/HTTPS, not opened as a local HTML file.

Move with A/D or arrows. Space/W/Up jumps; hold for height and press again for an air jump. Shift/K dashes; J/X emits a spirit pulse (holding repeats at the actual cooldown). E enters a nearby sanctuary portal. S/Down drops through thin one-way ledges. P/Escape pauses. Touch buttons support simultaneous movement and jump. Controller actions are mapped, but no physical gamepad certification is claimed.

## The current rules

Choose one of three uniquely named foxes from six beneficial birthrights: Embermane (stronger pulse), Moonveil (a room ward), Swiftfern (speed/triple jump), Starstep (dash), Dawngleam (light collection) and Wildbloom (vitality/healing). The names are characters, not account identities.

Defeated enemies grant spirit experience according to their level. Leveling increases this fox's strength; even-numbered levels grant a selectable talent. The sanctuary after each chamber sells character upgrades for earned light. The next route changes the reward or enemy emphasis. A keeper seals every fourth chamber. Lanternwild, Glass Cathedral and Cinder Below cycle in four-chamber bands.

**The individual fox is the profile.** XP, level, light, upgrades and talents remain with a living character when you save and leave. Actual lethal damage or falling into the abyss replaces that character's record with a death tombstone. A new life starts at level 1 without those resources. This deliberately follows the later permadeath direction rather than the earlier permanent lineage-wallet design. It does not delete a user's account or touch the old game saves.

## Save boundaries

A separate browser-local key, `ember-ironflame-godot-v1`, holds the living character. The original `ember-lineage-v2` and `ember-dash-best-m` keys are never changed. Quitting is not death. Reload returns the same character to a validated safe location in the same generated chamber, preserving collected motes, defeated enemies and spent upgrades. Remaining enemies restart their health/patrol; midair position and projectile state are not exact replay snapshots.

Unsupported or unreadable saves are not overwritten. Unavailable storage is visibly marked temporary. A changed save in another same-origin tab prevents stale writes and stops play until reload; this is optimistic conflict detection, not a transactional cloud database. Browser-local saves are user-editable and are not an anti-cheat system. Accounts, cloud sync and cross-device profile recovery are not implemented.

## Build

`bash scripts/build_ironflame.sh /absolute/output/directory` from the repository uses the installed Godot executable (override with `GODOT_BIN`), imports the committed art, runs four native test suites, exports single-threaded Compatibility/WebGL2, brands the loading shell and includes the engine's actual license notices. Matching 4.7.2 web export templates must be installed. The included installer verifies the official archive digest before adding missing web templates; it never replaces different existing templates.

The web runtime files are committed for the existing GitHub Pages host. No database, new paid hosting account, API key, browser login or CDN asset is needed to play.

## Art source

`art-source/` contains the editable keyed fox scene and the three native Blender environment scenes. `scripts/forge_blender.py` regenerates 16 animation cells for each of six variants: idle, an eight-cell run, rising, falling, dash and pulse. `scripts/pack_fox_atlas.gd` packs the cells with a common foot anchor and checks image-edge clipping. `scripts/forge_scenery.py` generates the world plates, converted by `scripts/prepare_scenery.gd`.

The image-generation boards in the project conversation supplied visual direction for the six magical bloodlines. They are not represented as shipped gameplay or animation footage. These are authored stylized Blender assets, not final high-detail fur models. Environment plates are baked 3D art; the playable world and collisions are two-dimensional.

## Verification and limits

Native tests exercise the production Godot controller and actual scene flow. The controller suite covers braking, tap/held/air jumps, buffered landing, ceilings, a thin wall at dash speed, locked dash direction, one-way landings/drop-through and 200 mandatory generated gaps. Pure rules additionally check 1,000 naming/generation cases. Browser suites use real input and real localStorage. The journey test traverses a chamber, defeats enemies, earns XP/light, purchases strength and a talent, reloads, dies, starts fresh and checks concurrent-tab conflict handling. Portrait/landscape tests use Chromium touch emulation.

This remains an indie-game construction playtest: one keeper behavior with biome-specific presentation, three regular enemy types, horizontal procedural chambers rather than a connected multi-floor dungeon, synthetic sound effects rather than a composed soundtrack, and no physical iPhone/Safari/gamepad or long-session balance certification. The committed evidence distinguishes those boundaries from tested behavior.
