# Stage 1 story-map viewer experiment

Status: viewer and route simulation accepted at desktop and narrow widths. The [engine and state implementation gate](engine-state-roadmap.md) is complete; the editor experiment is recorded in [stage-1-editor-experiment.md](stage-1-editor-experiment.md).

## Question

Can the current story data produce a useful visual flow chart without maintaining a separate diagram that can drift from the playable story?

## Prototype scope

- Generates the map directly from the selected versioned story JSON.
- Shows passages as nodes and choices as directed edges.
- Supports splits, reconverging branches, and early endings.
- Labels choice paths and visually distinguishes good, neutral, and bad endings.
- Lets the reviewer locate a passage, select it, inspect its prose, and follow its outgoing connections.
- Shows requirements, stat changes, and flag changes in the passage inspector.
- Traces one engine-verified route to each reachable ending, highlights its passages/connections, and shows final stats, inventory, flags, and ordered choices.
- Simulates a route from the opening with canonical choice availability and replay. Authors can take a choice, see transition events and full state (including hidden stats), inspect visible locked choices, and undo, reset, or rewind to an earlier step.
- Links between the story picker, reader, and map.

The layout is native React, HTML, and SVG so the first review measures the information design without committing to an editor framework. It uses a left-to-right layered layout with a safe fallback for future cyclic stories.

## Viewer limits at acceptance

- Creating, reconnecting, or deleting nodes and edges.
- Editing prose, choice labels, requirements, or effects.
- Saving changes back to story JSON.
- Collaborative editing or publication.

The subsequent editor experiment now covers passage and edge changes in a local draft. The route simulator remains read-only and starts from a clean sample run; it does not modify a player's save.

## Review checklist

- Can you understand the major branches and reconvergence points without reading the JSON?
- Are the four endings easy to find and distinguish?
- Are choice labels readable enough, or should they appear only on focus/selection?
- Does selecting a passage reveal the right amount of prose and rule information?
- Does tracing an ending route make the state-dependent path understandable without overwhelming the map?
- Is left-to-right navigation comfortable at desktop and narrow widths?
- Which viewer behaviors must carry into the editor iteration?

## Review result (2026-11-03)

Accepted as the baseline for editor experiments. `npm run test:visual` exercises a canonical ending route in installed Chrome at 1440×1000 and 390×844, asserts that the document does not overflow horizontally, and captures full-page screenshots for inspection. The review found and fixed a narrow/tablet intrinsic-width overflow. Keep the contained scrollable canvas, passage inspector, ending tones, route highlighting, and canonical state summary when adding editing controls. Choice labels should remain toggleable because dense branches overlap at the current prototype scale.

## Route/state simulation result (2026-11-03)

The simulator uses `simulateRoute`, `choiceViews`, and `lockedReason` from the engine. A Chrome interaction check followed a four-choice path to the job board, verified an Energy-locked route and highlighted map nodes, then exercised undo and reset. The desktop and mobile map smoke checks still pass.

The map viewport scrolls independently from the page. On narrow screens, the route simulator and passage inspector sit below the map, requiring vertical scrolling between structure and state. Hidden choices follow the reader's visibility rule and are omitted from the simulator; authored requirements remain visible in the selected passage inspector. The next editor experiment should change one in-memory `Story` value, validate that same value, and keep invalid drafts separate from playable previews.
