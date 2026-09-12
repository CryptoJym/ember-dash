# Ember Dash Lineage visual + movement overhaul

Outcome: make Lineage materially better to play and materially more distinctive to look at, without changing the classic runner. Ship a public verified revision.

Current findings:
- descendant names are sampled independently from a 16-name pool, so three heirs can repeat a name and later generations recycle names aggressively;
- all six heirs share nearly the same procedural fox silhouette in the Hearth and gameplay; color alone carries too much identity;
- biome backdrops are procedural canvas silhouettes and do not yet read as authored fantasy spaces;
- movement uses one acceleration value in air/ground, no intentional braking/friction profile, no apex shaping, no landing event/snap, and the camera trails on a single exponential target; the result feels soft rather than precise;
- rooms are mathematically reachable but usability is not the same as playability: generated gaps/heights need generous target envelopes and difficulty curves.

Implementation:
1. Build six genuinely distinct Blender-rendered descendants and three Blender-rendered biome backdrops; keep source generation script in repo.
2. Replace duplicate-prone heir naming with deterministic no-repeat generation using larger thematic name banks and recent-lineage exclusion.
3. Add character visual metadata so each bloodline has a distinct model render and identity.
4. Re-tune platforming around responsive ground acceleration, explicit braking/friction, air control, apex gravity, better coyote/buffer, variable jump cut, landing snap, dash impulse, and camera look-ahead.
5. Re-tune procedural room gap/height envelopes to the new movement model and add playability tests rather than only reachability checks.
6. Improve Hearth cards, route readability, HUD/tutorial flow and mobile control affordances.
7. Rebuild standalone HTML, run deterministic tests, native Chrome real-input tests and public-origin verification, then publish through a reviewed PR.

Recovery: all work is isolated on a new branch from current public main. Revert the merge to restore the currently verified Lineage release; classic root files remain untouched.
