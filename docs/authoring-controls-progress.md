# Authoring controls progress

Status: local single-author draft controls with JSON download, not a publishing workflow. This extends the [Stage 1 editor experiment](stage-1-editor-experiment.md).

## Implemented

- Passage title/prose, choice label/destination, passage and choice creation/removal, and ending tone use one in-memory `Story` value.
- Story title, summary, and opening passage can be edited in the local draft. Story ID and version remain tied to the published source used for local save/import.
- `#/create` starts a new version 1 story from a valid two-passage template. The new story ID is editable; IDs already used by the repo's starter story are rejected. New-story drafts have a separate browser-local save slot, restore a valid preview on reload, and can be imported or downloaded as JSON. New Town remains the sole published starter story in the repo.
- Choice rules have forms for stat/item/flag requirements, nested `all`/`any`/`not` conditions, stat costs, stat and item changes, flag changes, locked hints, hidden locked choices, and intentional loops. Existing rule data is preserved when an edge is reconnected. Switching between `all` and `any` preserves the group's children.
- Authors can define initial flags. The flag is then available in condition and effect controls.
- Authors can add, edit, and remove stat and item definitions, including initial values, bounds, labels, money display, and hidden stats. Removing a referenced definition leaves a visible validation error until its rules are repaired.
- Every change passes through `validateStory`. The map and route simulator use only a valid applied snapshot. Browser-local save and JSON download/import can preserve incomplete drafts. Existing-story imports must match the source story/version; new-story imports accept structurally valid story JSON, then show semantic validation errors in the editor.
- Validation messages for story details, passages, choices, stats, and items link to their editing controls. Following a link selects the passage or opens the relevant section and focuses the field.
- A bounded path explorer runs against a valid draft on demand. It reports reachable endings and a traceable route to each, blocked non-endings, never-available choices, cycles, and truncation after 5,000 states. Tracing an ending route applies that draft only to the local map preview.

## Verification

- `npm run build`, `npm test`, and `npm run test:visual` pass on Node 22.
- Chrome checks showed an authored Energy threshold lock a route, then a changed threshold, $100 cost, and +5 Energy effect produce the expected canonical state. Nested `all`/`any`/`not` changes survived JSON download. New initial flags and flag requirements also survived export. The path explorer found all four New Town endings, traced one on the map, and cleared stale findings after a draft edit. Adding a stat and item, triggering and repairing an invalid bound, and downloading their definitions passed at desktop and 390px mobile width without document-wide overflow.

## Remaining author workflow

- New stories are local drafts only. There is no in-app publication or automatic repo update; downloaded JSON can be reviewed before being added to the repo manually.
- Identity, schema, and starting-flag validation messages have no field links yet. The bounded explorer does not replace route fixtures or human playtesting and is limited to 5,000 states per click.
- Browser-local drafts have no cross-device sync or collaboration. Downloaded JSON is the portable backup; published story files are not changed by the editor.
- Attribution, public credits, ownership, and approval remain separate work before a public author platform.
