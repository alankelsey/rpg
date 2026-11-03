# Authoring controls progress

Status: local single-author draft controls, not a publishing workflow. This extends the [Stage 1 editor experiment](stage-1-editor-experiment.md).

## Implemented

- Passage title/prose, choice label/destination, passage and choice creation/removal, and ending tone use one in-memory `Story` value.
- Choice rules have forms for stat/item/flag requirements, nested `all`/`any`/`not` conditions, stat costs, stat and item changes, flag changes, locked hints, hidden locked choices, and intentional loops. Existing rule data is preserved when an edge is reconnected. Switching between `all` and `any` preserves the group's children.
- Authors can define initial flags. The flag is then available in condition and effect controls.
- Every change passes through `validateStory`. The map and route simulator use only a valid applied snapshot. Browser-local save and JSON download/import can preserve incomplete drafts, while imported data must pass structural and story/version identity checks.

## Verification

- `npm run build`, `npm test`, and `npm run test:visual` pass on Node 22.
- Chrome checks showed an authored Energy threshold lock a route, then a changed threshold, $100 cost, and +5 Energy effect produce the expected canonical state. Nested `all`/`any`/`not` changes survived JSON download. New initial flags and flag requirements also survived export. The expanded controls did not cause document-wide overflow at 390px.

## Remaining author workflow

- The editor is still attached to the existing New Town story/version. A new story/version creation flow and explicit publication boundary are needed before public authoring.
- Controls refer to currently defined stats and items. Creating or changing stat/item definitions needs a guided form and validation feedback.
- Validation errors are listed but are not linked to the exact field. The author cannot yet simulate multiple representative states or run a bounded explorer from the editor UI.
- Browser-local drafts have no cross-device sync or collaboration. Downloaded JSON is the portable backup; published story files are not changed by the editor.
- Attribution, public credits, ownership, and approval remain separate work before a public author platform.
