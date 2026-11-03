# Engine and state roadmap

Status: complete as of 2026-11-03, including desktop and narrow-width visual acceptance of the map route preview.

## Progress

The first contract slice was implemented on 2026-11-02:

- Story, rules, run-state, and save-format versions are explicit.
- Runs include a monotonic revision and deterministic inventory state.
- Conditions support stats, flags, inventory quantities, and nested `all`/`any`/`not` composition.
- Effects support bounded stat deltas, flag assignment, and validated inventory deltas.
- Resource costs are separate from ordinary stat effects. A cost automatically locks a choice when the player cannot afford it and is spent atomically on acceptance; ordinary negative effects remain available for damage or involuntary loss.
- The canonical transition returns immutable state plus structured stat, flag, inventory, scene, and ending events. `applyChoice` remains a compatibility wrapper.
- Save/import validation checks every persisted field, revision/history consistency, supported versions, and endings. Existing unversioned local saves are migrated from their history.
- Exploration state identity includes inventory, and the story map renders the expanded condition/effect language.
- Canonical route simulation exposes every transition for later map/editor previews, and exploration reports transitions that cycle back to an already visited gameplay state.
- Story validation finds structural cycles and requires an explicit `intentionalLoop` marker within each cyclic component. Exploration identifies whether an observed runtime cycle was marked and reports the failed conditions behind blocked non-ending states.
- An incompatible save is preserved for export instead of being deleted automatically.
- The story catalog resolves saves against an exact retained immutable version. If a build no longer carries that version, the save remains exportable and the reader explains that starting the latest version will replace it.
- The read-only story map can trace one canonical route to any reachable ending. It highlights the passages and edges and shows the engine-produced final stats, inventory, flags, and ordered choices.
- Authored/imported JSON passes through a bounded runtime parser before it reaches typed validation or the engine. Malformed nested data produces path-specific format errors instead of uncontrolled property/type failures.
- Shared engine limits bound scene count, choices per scene, prose/label size, condition depth, and accepted choice history. Parser, validator, saves, replay, and transitions apply the same limits.
- "New Town" now exercises the contract directly: the Route 9 flyer is an inventory item, and a composed requirement accepts either that flyer or Dev's referral for day labor.

Current ID decision: scene IDs are unique within a story; choice IDs are unique within a scene. A choice event is resolved sequentially from the current scene, so the stable reference is the `(sceneId, choiceId)` pair even though compact saves store the ordered choice IDs. Published story versions are immutable, which makes the compact history unambiguous during replay. Revisit the serialized history shape before external APIs or datasets need independently addressable events.

The only deferred contract item is an explicit migration fixture when the next save or rules version is introduced; inventing a second format solely to test migration would add false complexity. Released story files must remain immutable and registered in the catalog while their saves are supported; removal uses the preserved-save behavior above rather than silently loading a different version.

Visual follow-up completed 2026-11-03 with `npm run test:visual` at 1440×1000 and 390×844. The smoke test verifies document containment, selects an ending, traces its canonical route, checks highlighted nodes and edges, and renders the final state panel. Full-page screenshots were also inspected at both widths. The narrow review exposed and fixed intrinsic-width overflow in the workspace navigation and map summary.

The playable reader and read-only story map prove that the current JSON can drive both play and visualization. The next risk is the contract beneath those screens. Editing tools should not hard-code today's narrow state model and then require a rewrite when inventory, richer requirements, chapters, mini-games, or external influence are added.

This work should extend the engine only for mechanics with a near-term story or authoring use. It should define stable extension points for later ideas without implementing the full community, LLM, or multiplayer roadmap.

## 1. Freeze the versioned state contract

Define and test the canonical shapes for:

- Story schema version, story content version, and engine/rules version.
- Run ID, state revision, current scene, player identity fields, stats, flags, inventory, choice history, and ended state.
- Save/export format version and the exact compatibility policy for older story and save versions.
- Stable scene and choice IDs. Decide whether choice IDs remain scene-local or become story-wide before authoring tools create references to them.
- Numeric rules: integer versus decimal values, required bounds, clamping, currency units, and behavior for missing state keys.

Keep hidden/meta stats in the same deterministic state model unless a concrete mechanic requires a separate type. Do not add account-wide progression to a per-story run implicitly.

## 2. Define conditions and effects as a closed language

The engine currently supports stat `gte`/`lte` checks, boolean flags, numeric deltas, and flag assignment. Decide the first complete author-facing set before building controls for it.

Research and implement only the operations required by the next stories, likely:

- Conditions over stats, flags, and inventory quantities.
- Explicit `all`, `any`, and `not` composition if real story rules need them.
- Effects for bounded stat changes, flag assignment, and inventory grant/spend.
- Clear failure behavior for unknown references, invalid numbers, impossible costs, and unsupported operations.
- Player-facing effect events so the UI does not infer outcomes by diffing arbitrary state.

Stories remain data. Conditions and effects must never evaluate uploaded JavaScript or other executable expressions.

## 3. Make transitions the single state mutation boundary

Evolve `applyChoice` into a complete deterministic transition contract. Given a story, prior state, and choice ID, it should either reject the action or return:

- The next immutable run state.
- Structured events describing stat, flag, inventory, scene, and ending changes.
- A new monotonic state revision.
- Enough context for save, replay, reader feedback, tests, and later server verification to agree.

Define idempotency expectations now. Browser code should never apply a transition twice because of a double click, refresh, import, or retry. Rendering remains side-effect free.

## 4. Harden saves, import, and replay

- Validate every imported field and reject malformed or unsupported versions.
- Reconstruct state from accepted history and the exact story version; do not trust imported derived stats or flags.
- Define the response when the required story version is missing or withdrawn.
- Test export/import round trips, corrupted JSON, invalid histories, version mismatch, unavailable storage, completed runs, and multiple story slots.
- Add explicit migration fixtures before changing a released save format.
- Keep timestamps and display metadata outside deterministic gameplay state unless rules consume them.

## 5. Make exploration match the state model

The path explorer, map, validator, and reader must use the canonical engine rather than duplicate rule evaluation.

- Define canonical state identity for exploration, including every field that can affect future choices.
- Detect reachable endings, blocked non-endings, never-available choices, intentional cycles, and truncation.
- Add maximum transition/state limits and useful diagnostics for state explosion.
- Maintain authored path fixtures for important endings and mechanics; bounded exploration supplements rather than replaces them.
- Add a route simulation API that the map and later editor can consume after the engine contract is stable.

## 6. Acceptance gate before more editor UI

This gate is complete when:

1. The versioned story, run, and save contracts are documented in code and tested.
2. Every supported condition and effect has validation, transition, replay, and exploration coverage.
3. Transition events produce reader feedback without UI-specific rule calculations.
4. Save export/import rejects malformed or incompatible data and round-trips valid runs.
5. All four "New Town" endings remain reachable through canonical engine replay.
6. At least one test story covers inventory, composed requirements if adopted, a reconverging branch, an intentional loop, and a blocked-state diagnostic.
7. The read-only map consumes engine-produced rule/state information without reimplementing mechanics.
8. `npm test` and `npm run build` pass on Node 22.

After this gate, resume Stage 1 UI experiments in this order: route/state simulation in the existing map, passage and choice editing, reconnecting edges, draft persistence/export, and playable preview. Collaborative editing and public publishing remain later work.
