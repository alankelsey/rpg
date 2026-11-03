# Stage 1 story-map viewer experiment

Status: implemented prototype with canonical ending-route state preview, awaiting desktop/mobile review before editor work begins. The [engine and state implementation gate](engine-state-roadmap.md) is complete.

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
- Links between the story picker, reader, and map.

The layout is native React, HTML, and SVG so the first review measures the information design without committing to an editor framework. It uses a left-to-right layered layout with a safe fallback for future cyclic stories.

## Deliberately deferred

- Creating, reconnecting, or deleting nodes and edges.
- Editing prose, choice labels, requirements, or effects.
- Saving changes back to story JSON.
- Full state simulation along a selected route.
- Collaborative editing or publication.

Those belong to the editor iteration after this viewer is accepted.

## Review checklist

- Can you understand the major branches and reconvergence points without reading the JSON?
- Are the four endings easy to find and distinguish?
- Are choice labels readable enough, or should they appear only on focus/selection?
- Does selecting a passage reveal the right amount of prose and rule information?
- Does tracing an ending route make the state-dependent path understandable without overwhelming the map?
- Is left-to-right navigation comfortable at desktop and narrow widths?
- Which viewer behaviors must carry into the editor iteration?
