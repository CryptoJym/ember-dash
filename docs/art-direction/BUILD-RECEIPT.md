# Ember Dash: local art build and computer-control receipt

Date: 12 September 2026. Work: eco-nt8oly. Branch: astra/art-direction-20260912.
Baseline: public main aeca864c11cfde739aad77489f19f29301cf4993.

## Actual local construction

The BORG connection was used to write source, execute Blender and Godot on Studio6, transfer results back to Studio0, and test the exported game. This was not read-only work.

The new Blender pass produces six fox variants with 28,126 curved groom strands per shared character rig, facial/ear/cheek detail and separately modeled fire, crescent/crystal, leaf/wind, star-orbit, solar-halo and flowering-vine ornaments. All 96 animation cells render at 384 by 288 pixels. The packing check found no clipped animation frames. Metadata now determines the Godot frame dimensions, drawing scale and common foot anchor; collision geometry is unchanged.

Nine editable Blender scenes are saved under art-source/art-direction/: six fox scenes and three world scenes. The environment pass adds geometric cliff erosion, material surface detail, modeled leaves, thin roots, waterfall curtains and atmosphere. These are baked 2.5D backgrounds, not fully traversable 3D levels.

The Godot presentation pass adds head portraits, drawn hearts independent of a symbol font, a chamber-progress indicator, a title-screen fox, larger selection portraits and coordinated panel borders. Existing character XP, purchases, talents, save/resume, permadeath and all previous save keys are preserved.

## Verification of this candidate

The existing four Godot suites were rerun: 20 rules assertions, 6 physics assertions, 14 controller/traversal assertions and 25 scene-flow assertions, total 65. This includes 200 actual engine-collision gap traversals. Native logs contain no failed assertions or script errors.

The actual exported web game passed 13 browser smoke checks and 20 journey checks through BORG-run Chrome automation. The journey included ordinary input-driven traversal and combat, earned experience/light, a purchased upgrade, a talent choice, reload, death/reset, old-save preservation, stale-tab rejection, and simultaneous movement/jump touch input at 390px and 844px widths. Mobile proof is Chromium emulation, not a physical iPhone.

The engine WASM digest remains fc74679e3b97f76878947fcd4fbe1268cbfa6188182a2e33bbc3f5dc9bfa57d0. The new game-data PCK is 10,867,248 bytes. Exact candidate/source hashes are in evidence/local-tested-build.json. Actual screenshots, not generated mockups, are under evidence/browser and evidence/journey.

## Computer-control integration findings

BORG reports computer, desktop and Inbox tools configured. Its native macOS permission check reports Screen Recording, Accessibility and Event Synthesizing granted. Its current source identifies Desktop Commander as the files/commands backend and Peekaboo as the native desktop backend. Reinstalling those as another public remote service is not necessary to continue this build.

The native browser interface reported connected with 29 tools. Creating, inspecting and closing a new owned Ember Dash tab worked. Two attempted native provider operations (evaluation and screenshot) returned withheld provider errors. Those are not treated as passed or as missing macOS permissions. BORG-run Playwright remains a separately verified browser automation path.

The third-party community package ahujasid/blender-mcp 1.9.1 was installed on Studio6, pinned to commit 5f8ddaf6e987c4aa0c3467fcc548838b28f64477 with its frozen dependency lock. Its upstream installer placed the Blender addon at /Users/studio6/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py. An actual MCP initialize/list-tools exchange advertised 28 tools. That protocol probe used DISABLE_TELEMETRY=true and BLENDER_MCP_SAFE_MODE=1.

This community plugin is NOT represented as an official Blender product. Automated live-session startup and a proposed reusable startup wrapper were refused by the connector tool review. Neither is claimed operational. The addon is installed but has not been enabled/connected to a live Blender scene. No new public listener, remote-control subscription, additional account, replacement BORG gateway or global client configuration was created. Existing BORG batch rendering and Godot builds work without the optional plugin.

## Release and visual acceptance

This is a locally built, functionally tested art candidate, not a claim that the approved concept-art quality has been reached. The rendered model proportions, fur and environment composition still differ visibly from the desired illustrated treatment. The work remains open for that visual finish. This candidate has not been published over the current public game. Preserve the current release and these exact local results rather than describing technical test passes as final artistic acceptance.
