# Ember Dash exploratory mobile playtest — 12 September 2026 MDT

Task: eco-nt8oly.4. Baseline: c5e0b7fdfd1303270f63b3c3fd135dcb9f27316a.
Fix workspace: /Users/utlyze/Projects/ember-dash-playability-20260912.
Fix branch: astra/playability-sim-20260912. This is separate from the approved-art release branch and public game.

## What was actually simulated

The actual Godot WebGL export ran in isolated Chromium browser contexts with touch input and six viewport sizes: 320x568, 375x667, 390x664, 844x300, 844x390 and 768x1024. These represent small phones, browser-height-constrained views and a tablet-sized view, not claims of particular physical phone models. Tests used actual touch events to open menus and simultaneous movement/jump input. Rotation changed the viewport; it was not an iOS orientation-sensor test. No real user saved game was used or erased.

Studio0 has an Xcode installation and a discoverable simctl executable. The subsequent runtime/device inventory request was rejected before an execution receipt, with no diagnosed rule. Therefore an available iOS runtime, booted Simulator or physical Safari playtest is NOT established. Studio6 has Command Line Tools but no simctl in the selected developer path.

## Findings and local corrections

### F1: Starting the game fails on some small mobile layouts

On the baseline, the Begin action could be positioned outside the screen. At 320x568 its observed rectangle was [34,585,208,58], entirely below the viewport. The touch test could not start the game at 320x568, 375x667 and 390x664. Additional fully-onscreen-action assertions failed at 844x390 and 768x1024, although those centers were still clickable. Some initial observation races were later eliminated by waiting for the actual choice state and settled Godot container layout; no gameplay assertion was removed.

Root cause in main.gd: a height-sized card scroller was nested inside an outer scrolling menu that also contained the action row. Long button labels and three fixed-width cards compounded minimum-size pressure.

Correction: only the cards scroll; Begin/Back remain pinned in the panel. Wide three-card layout now requires enough width. Button text cannot force the panel wider than the screen; the complete text remains available as a tooltip. The existing painted portraits and progression rules are unchanged.

After correction, a settled 320x568 real-touch browser run found Begin at [34,474,168,58], within the screen, and entered play. All eight checks in that case passed, including two-finger movement/jump, braking on release, rotation, pause/resume and no script errors.

### F2: The short-landscape camera hides the player behind a movement control

At 844x300, the baseline placed the fox's feet at approximately [55.23,222.66]. Its collision-body screen rectangle intersected the left movement control. This is a visibility/usability defect even though the controls themselves remain onscreen.

Correction: in landscape views no taller than 430px, the camera rests with the initial platform near 55% of screen height rather than underneath the thumb-control band. The physics body, jump velocity, enemy logic and save schema are unchanged.

Native engine checks verify the player collision body is clear of movement controls at both 844x300 and 844x390. A completed fresh browser verification of those two corrected landscape cases is still pending.

## Verification and honest limits

- Baseline exploratory run: 27 assertions reached, 21 passed, six findings, three cases unable to start; process exit 1. Original screenshots and JSON remain in the approved-art worktree under docs/playtest-20260912/baseline.
- Corrected 320x568 browser case: eight assertions passed, no findings/errors; process exit 0. Evidence: settled/exploratory.json and screenshots.
- New native small-screen suite: 14 assertions passed across all six viewport sizes, including fixed action/panel bounds and landscape player visibility.
- Existing actual-scene suite on the corrected source: 31 assertions passed, including Spirit growth, XP/healing, menus, profile persistence rules and death/reset.
- A longer corrected Chromium matrix passed the 320px case and the 375px movement/rotation checks, but a screenshot timed out. The shared Studio0 host was then measured at load 111.32 on 32 CPU cores. The owned run was stopped; no other agent's process was killed. This partial run is NOT counted as a completed 48-check matrix.
- The existing Playwright packages were copied into the owned Studio6 test workspace to protect the overloaded interactive Studio0. This was recovery from an observed runtime/capacity problem, not a workaround for the earlier unrelated simulator-inventory rejection. Studio6 had headroom, but its installed Chrome failed to become ready within the 120-second launch deadline. No browser test pass is claimed there; the command exited 1.
- Playwright WebKit is installed on Studio0, but a new WebKit run was not completed. It must not be called a Safari or iOS Simulator pass.

Corrected PCK SHA-256: 49b967192eed3129a8e74eedb68514a89350f8e2dbcc6ef1147f7507cbb330fb.
Corrected HTML SHA-256: 6267c6cb81ac1ac592953cce569ae56dab34e869fcde4cf390b36a3e456c387c.
Unchanged WASM SHA-256: fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0.

The runtime export was built before adding the new test_small_layout.gd regression script, which is excluded from Web export. No subsequent production-source or asset changes were made during these browser checks.

## Next improvements, in order

1. Finish the mobile presentation pass: make the selected fox's full name and gift visible without scrolling a large portrait, add clear card-scrolling cues, test notch/browser-bar safe areas, and run the complete corrected viewport matrix on a ready host.
2. Make movement and combat easier to read: check fox/hazard size in short landscape views, communicate remaining jumps and dash recovery at the character, improve hit/stagger and enemy wind-up cues, and separate character art from collision contours without altering inherited power identity.
3. Make the dungeon loop richer: introduce authored room families selected by the seed (vertical traversal, optional treasure, combat challenge, rest), biome-specific guardian attacks, and explicit power synergies. The current generator uses six horizontal base platforms with optional elevated ledges; changing widths alone is not enough long-term variety.
4. Make growth visible: show what absorbed enemy levels changed, not only a rising Spirit number; offer clearer before/after upgrade comparisons and a death recap identifying the actual cause while preserving the requested per-character reset.
5. Measure device performance and loading separately: capture frame-time distributions and transfer sizes on a suitable host/network, then test actual Safari in an available iOS Simulator and on a physical iPhone. Current overloaded-host captures cannot establish phone FPS, battery life or thermal behavior.

No additional game engine or third-party computer-control connector is needed for these code/art changes. The remaining release must include review and fresh exact-artifact verification; these local fixes have not replaced the public game.
