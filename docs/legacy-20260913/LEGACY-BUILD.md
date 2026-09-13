# Ember Dash — Lineage, Relics, Mutations and Directed Rooms

Built and verified on 13 September 2026 (America/Denver).
Work: `eco-nt8oly.5`.
Branch: `astra/legacy-systems-20260913`.
Base: mobile-refined `7078d1b64391ba1b07ef7b510857a06674a4e32c`.

## What was actually built

This update is integrated into the existing Godot game rather than a design document or parallel prototype.

### Separate lineage history

The living fox still uses the existing `ember-ironflame-godot-v1` profile and the existing Version 1 tombstone `{version:1, alive:false}`. Character XP, light, Spirit, relics, talents and upgrades still die with the fox.

A new separate `ember-lineage-archive-v1` store records bounded history: generation, ancestor name/bloodline, reached level/depth, defeated spirits, absorbed Spirit, cause of death, mutation, relic discoveries and defeated guardians. It stores a maximum of 64 ancestor records and discovery sets. It does not provide permanent additive levels or raw stat inflation.

The title exposes the archive after a completed life. The death screen explains what was lost versus what was archived. Rebirth advances the generation number while the new living profile starts at level 1 with zero XP, light, Spirit and relics.

### Positive birth mutations

Every new generated descendant receives one deterministic positive mutation. The pool contains general movement/vitality/combat/light mutations plus six bloodline-specific crests. The selection cards show generation, mutation name and its actual benefit before the player chooses a fox.

Older Version 1 living saves without lineage fields normalize as Generation 1 with no mutation/relics and remain playable.

### Per-life relics and synergies

Eight relics currently alter only the living fox: pulse damage, movement, extra jump, magnet/bounty, vitality, dash recovery, ward and pulse reach. A fox can carry at most six.

Three first-pass named synergies activate from actual relic combinations: Stormstep, Predator Flow and Radiant Bloom. The sanctuary exposes a `Living build` panel listing the mutation, all equipped relics and active synergies.

Room rewards are idempotent by chamber depth. Re-entering a cleared sanctuary cannot farm a relic or light reward. If a relic cannot be equipped because it is duplicate/full, its echo converts to bounded light instead.

### Directed procedural rooms

The original tested random platform generator remains the collision foundation, including its 58–110px required-gap envelope. A deterministic room director now layers six archetypes over it:

- Wandering Roots — balanced room;
- Lantern Cache — more light, fewer hunters, relic-biased;
- Ancestor Shrine — additional elevated route, relic reward;
- Spirit Gauntlet — stronger/extra enemies and richer light;
- Skyward Ruins — additional elevated movement route;
- Guardian Threshold — every fourth chamber, keeper + relic reward.

`roots`, `cache` and `trial` route choices bias the archetype pool rather than becoming cosmetic labels. The HUD and room-entry notice expose the selected room archetype.

## Exact verification

All existing native suites and the new systems ran after importing the actual existing art/audio assets into the isolated worktree.

Native Godot: **427 checks passed** across 14 suites. This includes the existing physics/controller/mobile/combat/art/save suites plus:

- 38 lineage/relic/mutation/room-director checks;
- 17 actual scene-flow lineage checks;
- 1,200 directed-room geometry checks inside the new legacy suite;
- 200 actual CharacterBody2D generated-gap traversals;
- 30 repeated mobile input cycles across six screen sizes;
- 18 two-thumb procedural chamber journeys across all six bloodlines;
- fixed-rate mobile physics checks at 30/60/120Hz;
- all 96 approved fox animation frames/art contracts.

Browser verification used the exact exported Godot WebGL artifact through an isolated loopback origin:

- **13/13** original browser smoke checks passed;
- **24/24** original full browser journey checks passed, including keyboard traversal, Spirit, shop/talent, save/reload, actual death/reset, stale-tab protection and 390/844 touch emulation;
- **21/21** new lineage browser journey checks passed.

The new browser journey used real inputs to clear four rooms. In the observed run it encountered Shrine → Crossroads → Skyward Ruins → Guardian Threshold, earned an Ancestor Bell and Echo Fang, defeated the guardian, died by falling in chamber 5, verified the original two-field living tombstone plus the separate ancestor archive, then started Generation 2 with a new positive mutation and zero dead-life XP/light/Spirit/relics. Older Ember Dash localStorage keys were verified unchanged.

Screenshots in this directory are from the actual exported game, not concept mockups. The 390px selection proof shows mutation content scrollable with Begin/Back pinned onscreen.

## Exact tested artifact

- `forge/index.html` — SHA-256 `7c6a69bd577404f2ef9ed10de541406e60385fcf9ae04ac7ec7e3a78b22d43f0`
- `forge/index.js` — SHA-256 `33c94cb3175f3333b82e2a3be5e8e86f77986f0aa2042b1631f6367a4e5bb6ba`
- `forge/index.pck` — 14,582,304 bytes — SHA-256 `627083588cc943e6447756382ca3341d513c15a0d0a51689bb8f4e5ef9b33bfc`
- `forge/index.wasm` — SHA-256 `fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0`

The tracked `forge/` artifact was copied from the exact tested export and separately read back through the current loopback preview; HTML/JS/PCK/WASM bytes matched.

## Boundaries not claimed

This is not physical iPhone/Safari or physical gamepad certification. Mobile browser evidence is Chromium touch emulation plus native Godot touch/physics tests. This candidate has not replaced the public GitHub Pages game yet. Independent release review and public-origin verification remain release gates; they are not substituted by these local passes.
