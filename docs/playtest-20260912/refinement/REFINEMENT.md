# Ember Dash — movement, combat and sprite refinement

Local work: 12 September 2026, America/Denver. Parent task eco-nt8oly.4.
Workspace: /Users/utlyze/Projects/ember-dash-playability-20260912.
Base: 2d0ea90f78bac8c6a0b7b48f7dd5c6d7016ece66.

## What is open for the owner

The final local build is served at http://127.0.0.1:9042/ on Studio0. The native BORG application-open action dispatched; its response could not select among multiple Chrome processes. A subsequent exact-window Accessibility read confirmed the address bar held 127.0.0.1:9042. The exact native window-focus action then succeeded. The server returned HTTP 200. Those are the evidence for opening and focusing the game; failed capture/permission probes are not represented as screenshots or extra proof.

Earlier preview tabs at ports 9040 and 9041 were retained. These origins keep separate local saves. Automated playtests use disposable headless browser contexts, not the owner's Chrome profile, gameplay inputs or saved fox. Preview processes are deliberately left running for the owner.

## Changes made

### More controllable movement

Air acceleration is now 3200 world units/s² and neutral air braking 1600, while established ground acceleration, jump velocities and gravity remain unchanged. The actual engine measured 30.67 world pixels of drift after horizontal release in the air. Ground braking, useful tap jumps, higher held jumps, double jumps, side/ceiling collision and one-way ledges continue to pass their existing checks.

Dash presses are remembered for up to 100 milliseconds before the cooldown ends. The buffered dash fires once and keeps the pressed direction; pausing clears queued inputs. Knockback retains a short readable recovery instead of being immediately erased by the stronger air braking.

### Painted fox animation, not replacement artwork

The approved 96-cell painted atlases are unchanged. Runtime presentation now uses their declared clip timing; running cadence follows actual horizontal speed. Takeoff briefly stretches the child sprite, landing compresses it according to impact speed, and the effect settles to the authored proportions. Airborne tilt is subtle. The original 42x34 collision rectangle and paw anchor remain separate and unchanged.

Pause now freezes AnimatedSprite2D as well as the physics body. Remaining air-jump dots and a dash-recovery bar provide feedback near the fox. A reduced-motion setting removes the new sprite deformation/tilt/trails and floating-text movement. It is not a claim that every pre-existing animated background effect has been disabled.

### Fairer combat and clearer progression

Spitters telegraph for 0.55 seconds and guardians for 0.70 seconds. They lock aim when the cue begins, rather than tracking the fox at the last instant, and cannot silently charge while offscreen. Ordinary creatures can be briefly staggered and their wind-up interrupted. Guardians keep their telegraph through damage so holding pulse cannot permanently stun-lock them.

Actual hits show damage; absorbed Spirit shows a strength-change callout. Death identifies the lethal source, summarizes the life in a transient recap, and still writes only the dead-profile tombstone. No permanent character progression was added after death.

### Small-screen flow

The preceding pinned Begin/Back layout remains. Compact layouts also show the selected fox's full name and gift outside the scrolling portrait area. The title scales down on narrow/short screens. The short-landscape camera keeps the starting fox above the thumb controls.

## Exact final verification

Eight native Godot suites passed with exit 0 and no failed assertions or script errors: rules21, physics6, controller/traversal14, actual scene flow33, art/projection43, small layout14, controller-feel14 and combat-readability14 — **159 assertions**. These include 200 actual engine gap traversals and all96 art cells. Tap rise was67.15 and held rise109.11 world pixels in the controller fixture.

The final exported PCK passed a fresh 13-check Chrome smoke suite and 24-check real-input journey. The journey covered generated-room traversal, combat, XP, Spirit, earned purchases/talents, real localStorage reload, death/reset, old-save preservation, stale-tab rejection and simultaneous390px/844px touch input. The command completed with exit0 and both receipts have empty error lists. Evidence: hud-smoke/browser-smoke.json, hud-journey/journey.json and their actual screenshots.

Four served resources (HTML, JavaScript loader, PCK, WASM) were separately read back over loopback HTTP and compared with the manifest. All four matched exactly. The canonical forge directory now holds this tested build. PCK SHA256:355a0c6a08feb6c9a11d9997b2e96cbab5511f69a843e3500af873600c6962ee. See tested-build.json for all hashes and source identities.

## Failures retained rather than hidden

The first new browser build stopped before UI creation at the new reduced-motion preference read, despite native tests passing. Its startup-stage observation and black-screen capture exposed the defect. Returning an explicit numeric preference from JavaScript and converting it to bool restored complete startup; the final full browser tests passed. This browser-only failure is why native checks were not treated as sufficient.

Earlier matrix attempts had a screenshot timeout and a startup timeout. Those failures are retained. A later complete six-size run passed all **48 assertions**, exited 0 and had no findings/errors; see final-matrix/exploratory.json. It covered 320x568, 375x667, 390x664, 844x300, 844x390 and 768x1024, including two-finger input, release braking, rotation and pause/resume.

A separate real-input bot completed four consecutive random chambers and the first guardian, passing eight checks with no script errors. It reached level 5, 27 Spirit and 216 light with three hearts remaining (seed 2056818491). No profile or encounter mutation was used. It is a state-aware automated playtest, not a human skill or commercial-balance verdict.

Review of the guardian screenshot then exposed stale HUD values while the sanctuary was paused: the central panel showed healed health, but the corner HUD had not refreshed. The final change refreshes those labels on entering/rebuilding the sanctuary. Two new native assertions and two new browser assertions verify health/light consistency and post-purchase wallet updates. The final 159 native, 13 smoke and 24 journey checks above are on this corrected build. The 48-case matrix and four-room run precede only this HUD refresh and read-only observation change, with their original artifact identity preserved in pre-hud-tested-build.json; they are not relabeled as full runs of the new PCK.

Studio0 was intermittently overloaded by unrelated shared work. No other agent's process was stopped. An official version-matched Playwright headless-shell installation on Studio6 downloaded but stalled during extraction; only its freshly verified owned installer and child were terminated. The incomplete browser installation is not claimed successful. Existing Chrome was used for the completed browser tests.

## Review and publication boundary

An independent read-only review packet and task eco-nt8oly.4.1 were prepared. The normal conductor router refused shipping because the workspace is pinned to Studio0, which is excluded from new agents. No unmanaged reviewer or policy override was used. Independent review of this new refinement remains pending; earlier Spirit-patch approval is not relabeled as approval of these changes.

This is a locally opened, tested game refinement. It is not a claim of a public main-branch deployment, physical iPhone/Safari testing, physical gamepad testing, a finished commercial balance pass, or a fully sculpted3D character replacement. The public release is left unchanged pending integration/review. Reverting this refinement restores the prior source/export together; existing save keys and art assets are unchanged.

## Local preview update

The final HUD-corrected artifact is now served by the canonical forge directory on port 9042. A previously loaded browser tab keeps its in-memory build until refreshed; no active owner gameplay or save was force-reset. The test artifacts and preview are the same files. Controls: A/D or arrows to move, Space to jump/air jump, Shift to dash, J to pulse, E to enter a sanctuary, P/Esc to pause.
