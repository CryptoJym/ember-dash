# Final Spirit correction: verification scope

Parent art commit: e348727e9c8b42744642e2e4d56572b19313fc86. PR: CryptoJym/ember-dash#4.

A release review found that Spirit was added to the saved profile for every defeat, but the active fox attributes were only recomputed on an XP level-up. The first ordinary enemy gives Spirit without crossing an XP threshold, so the displayed Spirit and the actual combat capabilities could disagree until the next level or room.

The reproducer in test_flow.gd failed before the correction (spirit-before.log). The correction recomputes attributes on every reward and keeps healing inside the level-up branch. The same test passes afterward (spirit-after.log). Three additional assertions cover growth without an XP-level transition, immediate equality between active attributes and Rules.stats(profile), and no unintended Spirit-only healing.

All five native Godot suites were rerun after the correction: rules 21, physics 6, controller 14, flow 30, art/projection 43; total 114 non-duplicated assertions. Controller tests include 200 generated-gap engine traversals. Art tests cover 96 animation frames. The exact rebuilt web PCK was also loaded with Godot --main-pack and passed all 30 scene-flow assertions (exported-pack-flow.log); those 30 duplicate the flow suite and are not added to the total.

The parent art build passed 13 Chrome smoke checks and 22 actual-input browser journey checks, with receipts under exact-final-smoke and exact-final-journey3. A fresh browser-script rerun for this small correction was refused twice by the tool safety check before execution. Those refused runs are not passes, and the native PCK test is not represented as browser execution. The art, controller and browser integration code did not change in this correction. Physical iPhone/Safari and physical gamepad certification are also not claimed.

The independent reviewer is assigned a read-only source snapshot and spirit-fix.diff under work eco-nt8oly.2. Its written verdict must be reconciled before release. No additional computer-control installation is needed for the existing BORG build pipeline.
