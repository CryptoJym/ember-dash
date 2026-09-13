# Ember Dash: mobile physics refinement

Work: eco-nt8oly.4.2. Date: 12 September 2026, America/Denver.
Workspace: /Users/utlyze/Projects/ember-dash-playability-20260912.
Base: bc63f7c0f01a06845ef34ccb8e60dc7c900f48bf, astra/playability-sim-20260912.

## Changes driven by repeated tests

1. **Sliding a thumb now changes direction without lifting.** Real Chromium touch events on the baseline left the fox moving right at 320 world pixels/second after the finger crossed to Left. Direction buttons now use Godot's native pass-by input handling. Their vertically extended touch regions tolerate thumb drift. Jump and Dash do not use pass-by activation: drifting across them must not generate an unintended action.
2. **An airborne dash no longer ends in a long uncontrolled coast.** The baseline continued with 780px/s momentum after the timed burst. The same native fixture measured approximately 273.39px of total dash-and-release travel. The corrected endpoint returns to normal run momentum and brakes to rest in approximately 167.17px total at the game's 120Hz physics rate. Canceling a dash into a jump also removes excess burst momentum. Dash direction locking and thin-wall collision protection remain intact.
3. **A quick jump tap buffered before landing stays a quick hop.** Previously the release occurred before the buffered jump fired, so it was forgotten; the next landing produced an unintended full jump of approximately 107.90px. Release intent is now retained with the buffer, producing approximately 56.10px in that same fixture. Held jumps retain their previous height. A press and release within one physics step also registers exactly one short hop.
4. **Mobile players can drop through thin ledges.** A dedicated Down control invokes the existing one-way-platform behavior; solid floors remain solid. The first placement interfered with the fox in a very short landscape view. A second iteration moved it alongside the movement pad in landscape, and the full six-size native overlap check then passed.
5. **Rotation does not keep stale thumb input alive.** Resizing releases touch ownership and clears queued jump/dash input before replacing controls. Pause, cancellation, release, and returning to play have explicit regression coverage.
6. **Readiness is visible near the thumb.** Pressed controls light up; Jump and Dash have read-only readiness rings. These do not disable the timing buffers or modify character abilities.

No character-art textures, save keys, inheritance rules, health values, rewards, or original collision-box dimensions were changed by this pass.

## Iteration record

- Baseline Chromium touch playtest: 14 checks reached; 10 passed, four findings. The two viewport cases each exposed a missing drop control and failed thumb reversal. No uncaught/GDScript errors were reported.
- Baseline native controller tests: 13 checks; five failed. In addition to the touch findings, these measured dash coast, lost short-hop intent and stale coordinates after resize.
- First corrected native pass: 13/13 passed.
- Expanded six-size repetition pass: 143/144 passed; the new Down control covered the starting fox at 844x300. This was fixed rather than excluding that view.
- Corrected expanded repetition: 144/144 passed, representing 30 thumb-action cycles across 320x568, 375x667, 390x844, 844x300, 844x390 and 768x1024. Each cycle checks sliding reversal, vertical drift, action-finger drift, cancellation and stable landing. Each viewport also checks actual drop-through versus solid-floor behavior.
- Final focused mobile suite: 15/15 passed, including ultra-short taps.
- Fixed-rate trajectory suite: 18/18 passed at 30, 60 and 120 physics updates per second, including no dash tunneling through a two-pixel wall. These are engine timestep comparisons, NOT phone frame-rate measurements.
- Two-thumb engine pilot: 18 fresh procedural chamber runs, three for each of six bloodlines, all completed. The pilot used at most two finger indices and switched its action thumb between Jump, Pulse and Enter. There were no health, XP, wallet, enemy or position edits after each fresh life started. All runs earned XP, Spirit and light normally. 36/36 assertions passed.
- Existing physics/controller, scene flow, combat, layout, rules and art suites: 159/159 passed, including 200 generated-gap traversals and the approved 96 sprite cells.

Final source verification totals **372 distinct native assertions**. The focused 15-check suite was also rerun successfully against the actual exported game pack; that repeat is not added to the distinct-check total. Exact counts and hashes are in VERIFIED.json.

### Test-harness correction, not a claimed game improvement

An early two-thumb pilot reused an ended game scene while immediately changing the native viewport. Alternating cases had their test-forced touch layer hidden and never moved. The diagnostic logs were retained. The final pilot gives every life a separate scene/context, matching the isolated-life scope of the browser harness. It does not force progression or move the fox to rescue a failed run. This setup correction is not counted as a reproduced physical-phone defect.

## Fixed-rate measurements

| Physics updates/second | Held-jump rise | Air-release drift | Dash-and-release total |
| --- | ---: | ---: | ---: |
| 30 | 99.54px | 26.67px | 182.67px |
| 60 | 105.87px | 29.33px | 172.33px |
| 120, normal game setting | 109.11px | 30.67px | 167.17px |

These are world-space fixture measurements. Browser scheduling delays on a busy Studio are not used as proof of physical touch latency, phone performance, battery life or temperature.

## Verification boundaries

The new post-change mobile browser-test invocation was rejected before execution with: "This tool call was blocked by OpenAI's safety checks. Please double check what you are sending." No cause or rule was returned. That operation was not disguised, rerouted or counted as passed. The rejection is recorded in the durable BORG control skill's incident ledger.

The completed new post-change evidence is native Godot touch/control/physics testing and exact exported-pack verification. The earlier browser pass belongs to the baseline, not this rebuilt pack. Physical iPhone, native iOS Simulator and Safari are unverified here. The state-aware pilot is not human difficulty or enjoyment certification.

This is an improved local playtest candidate. Public main has not been replaced in this pass. Independent review and the fresh browser/device acceptance remain separate release requirements. The owner's existing local save should be retained when refreshing the Studio preview.

## Primary technical references consulted

- Godot 4.7 TouchScreenButton: https://docs.godotengine.org/en/4.7/classes/class_touchscreenbutton.html
- Godot 4.7 InputEventScreenTouch: https://docs.godotengine.org/en/4.7/classes/class_inputeventscreentouch.html
- Godot 4.7 Input: https://docs.godotengine.org/en/4.7/classes/class_input.html

These references describe the native input interface. The test logs, not the documentation, are the evidence for Ember Dash behavior.
