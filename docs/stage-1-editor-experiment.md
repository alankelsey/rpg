# Stage 1 story editor experiment

Status: local prototype built against the versioned New Town story. It edits a draft copy; the published story and reader remain unchanged.

## What the experiment proves

- The same `Story` data shape drives the editor, validator, graph, route simulator, JSON download, and import. There is no parallel node/edge document to synchronize.
- Selecting a map node opens that passage in the editor. Authors can edit its title and prose, change a choice label or destination, add or remove a choice, create or remove a passage, and set an ending tone. Existing requirements, costs, and effects stay attached to a choice when it is reconnected. The start passage cannot be removed.
- Adding an ending and reconnecting an existing choice demonstrates a split and early ending. An edge can also be removed; validation reports any dead end, missing ending, or unreachable passage that results.
- Validation runs on the draft. Errors disable **Apply valid draft to map**; warnings remain visible. The graph and route simulator continue using the last valid applied story while the author edits an invalid draft.
- The draft can be saved in browser local storage or downloaded as versioned story JSON. Import checks the structure and source story identity before showing the draft. Semantic errors may be imported for repair but cannot reach the playable preview.
- The map viewport, selected passage inspector, route simulator, and editor live on one page. The reader link always opens the published story, avoiding accidental play-save changes from an unpublished draft.

## Verification

- `npm test` and `npm run build` pass on Node 22.
- Desktop and 390px mobile Chrome smoke checks cover route simulation, invalid-draft isolation, applying a passage edit, and no document-wide horizontal overflow.
- A Chrome round-trip check covered valid and incomplete local saves across reload, JSON download, and import. A separate editor interaction check covered creating an ending and reconnecting a choice to it.

## Findings and Stage 2 direction

Carry forward the single `Story` value, the canonical engine route simulator, validation before preview, and form-based editing with the map as navigation. Keep JSON export/import and local save as author-controlled draft mechanisms. Add direct controls for requirements, costs, effects, and ending metadata, plus useful warning locations and playtest fixtures, before treating this as a full author workflow.

The graph remains a viewer, not a drag-and-drop canvas. This is adequate for the current 21-passage story; dense labels can overlap and authors must use the form to change destinations. On a narrow screen, structure and state require vertical scrolling. Imported drafts must match the currently loaded story ID and version; this prototype has no migration between versions, multi-author conflict handling, or publishing operation. Browser local storage is only local to that browser profile, so JSON download is the portable copy.

The Stage 1 structure questions have working answers for New Town: passages and directed choices, split/rejoin and multiple endings, canonical state inspection, edge reconnection, and map/editor/preview navigation. Stage 2 should turn these experiments into dependable authoring controls and an explicit publish/version workflow.
