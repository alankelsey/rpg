# CYOA RPG: Story Builder and Author Credits

Status: design ideas and proposed behavior, not a finalized schema or implemented feature.

This document captures the discussion about story length, guided authoring, decision effects, public attribution, and future collaboration. It supplements the related documents below. Complete the playable story core and the Stage 1 structure experiments before expanding into a public authoring platform.

## Related documents

- [Rewards, collectibles, and recognition](https://docs.google.com/document/d/1AC51R4HiWgWd0O8kYdHCZP0PTcb1K1I1i-iHzQY8GTc): earned and purchased cosmetics, reader themes, art/printed editions, ranks, and awards. Planned repo file: `rewards.md`; use a relative link after export.

- [Project exploration plan](plan.md): broad product ideas and planning inputs; proposals rather than final decisions.
- [Modernization review](modernization-review.md): core engine, validation, saves, versioned publication, and implementation sequence. Prefer its corrections where it conflicts with the older exploration plan.
- [Mini-games and interactive story design](minigames.md): challenge and puzzle nodes, stat assists, cutscenes, assets, and outcome routing. Use these contracts when adding challenge controls to the builder described here.
- [Original research notes](Choose-your-own-adventure-rpg.md): historical inspiration, not an authoritative architecture specification.

Relative links assume these Markdown files are kept together, for example in the repository's `docs/` directory. The three original reference files were supplied separately and are not copied into Drive by this task.

## 1. Story length and player expectations

Authors should be able to create both short stories and long adventures. Players should be able to identify and browse these formats before starting.

- **Short story:** a compact adventure with a focused arc and a small set of meaningful decisions and endings.
- **Long adventure:** a larger story that may contain chapters, smaller arcs, recurring characters, and consequences carried across chapters.

Keep length labels separate from genre, maturity tags, and challenge difficulty. A short story can still be difficult or have many branches.

Provide an estimated playthrough or reading-time range when enough information is available. Total manuscript word count is insufficient because a reader usually sees only one path. Explain whether an estimate includes optional branches and mini-games. Avoid promising precise times before playtesting.

Long adventures should provide clear chapter boundaries and stopping points. Chapter transitions must preserve the same versioned run state, inventory, stats, and flags as ordinary scene transitions.

## 2. Guided story builder

Provide an approachable guided mode that helps authors create a coherent story with an opening, buildup, arc, and ending. The goal is a consistent level of completeness while leaving room for different storytelling styles.

| Story piece | Guiding prompt | Intended result |
|---|---|---|
| Premise | Who is the player, what do they want, and what stands in the way? | A clear starting situation and motivation. |
| Opening | What draws the player into the situation? | An understandable first scene and initial choices. |
| Buildup | What obstacles, discoveries, and decisions increase the stakes? | Progression with meaningful consequences. |
| Turning point | What changes the player's understanding or options? | A development that changes the direction of the story. |
| Climax | What consequential decision or challenge resolves the central conflict? | A payoff connected to earlier choices. |
| Ending | What happened because of the player's decisions? | Resolution, consequences, and an explicit end to the run. |

These are prompts rather than mandatory scene types or a rigid formula. A short story may combine several pieces in one scene. A long adventure may have chapter arcs within an overall arc. Mystery, exploration, and experimental stories may organize these pieces differently.

### Proposed authoring flow

1. Choose short story or long adventure and write the premise.
2. Outline the major story pieces and intended endings.
3. Draft scenes and connect choices to their destinations.
4. Add requirements, effects, and later consequences to decisions.
5. Preview paths using sample characters.
6. Resolve validation errors and review guidance before publishing.

Allow authors to move between guided and freeform views without losing content. Stage 1 experiments with a graph viewer/editor, passage connections, multiple-ending visualization, state inspection, and navigation using "New Town." Stage 2 should carry forward the useful findings without assuming the experimental UI is production-ready. Suggestions should be optional; the basic guided workflow does not require an LLM or paid inference.

## 3. Decisions, requirements, and stat effects

Each decision should expose a simple effects panel. Authors configure declarative data using supported operations, rather than writing executable code. For mini-game outcomes and stat assists, see [the challenge contract and difficulty sections](minigames.md#4-story-nodes-and-engine-contract).

| Control | Examples | Purpose |
|---|---|---|
| Requirements | Minimum stat, enough money, required item, known clue, existing flag. | Decide whether a choice is available. |
| Immediate effects | Spend money, change Energy, receive an item. | Apply the direct consequence of an accepted choice. |
| Later consequences | Set a flag, unlock a route, influence an ending. | Remember choices and make them matter later. |
| Player feedback | Explain a resource change or mark a consequence as intentionally hidden. | Help readers understand outcomes without revealing every secret. |

Use stat names and effect operations from the actual engine. Validate types, bounds, unknown references, and unsupported operations. Costs and rewards apply once through the canonical engine; rendering or refreshing a scene must not repeat them.

### Example: lodging decision

A player chooses a cheaper hostel instead of a hotel. The decision spends the authored amount of money, may affect rest according to the story's rules, and records a flag used in a later encounter. The preview shows the resulting state and the later scenes that reference the flag.

This is an authoring example, not a new engine schema or a fixed balance decision. Existing story data should define the real currency units, stat names, and effects.

### Author preview and consistency checks

- Preview choices with sample stat, money, inventory, and flag states.
- Show unavailable choices and the unmet requirements to the author.
- Reject missing destinations and unsupported effects.
- Warn about scenes with no valid exit, unreachable intended endings, and repeatable reward farming.
- Distinguish intentional loops and failure endings from broken progression.
- Encourage visible consequences and payoffs for major choices without mandating a particular narrative style.

Structural validation does not prove that every ending is playable. Use important path fixtures, bounded exploration, and human playtesting together.

## 4. Author identity and public credits

Clearly attribute authors when needed while supporting their preferred public identity.

### Public display options

- **Real name:** a name the author chooses to publish publicly.
- **Pen name:** a chosen public writing identity.
- **Anonymous:** a public credit such as "Anonymous" without exposing the account's private identity.

Separate private account identity, internal ownership, and public attribution. Use a stable internal author ID for permissions and contribution records. Changing a display name must not transfer ownership or erase contribution history.

Publishing under a real name should be an explicit choice. Do not automatically expose account email, login-provider name, or other private profile details. Anonymous publication means anonymous to readers; it does not remove the platform's ownership or moderation records.

### Credits and attribution placement

Show public author credit on the story listing and story details, with a fuller credits view when appropriate. Support roles such as writing, editing, artwork, audio, and playtesting.

Keep story authorship separate from third-party asset credits. Anonymous or pen-name publication does not waive required attribution for imported material. Retain the applicable permissions and license evidence separately from the chosen public display name. See the [shared asset and licensing workflow](minigames.md#8-shared-assets-and-licensing-workflow) for asset metadata and credits.

Decide whether changing an author's public name updates older published credits or only new releases. Until that policy is chosen, preserve published attribution with the story version and record ownership separately.

## 5. Collaboration after the basics

Collaborative stories are a later feature. First make single-author drafting, preview, validation, versioned publication, and attribution dependable.

Future collaboration could include invitations, writing and editing roles, proposed scenes or branches, owner approval, and contributor credits. Keep proposed changes separate from the published story until approved and validated.

Approvals should bind to exact content and the target story version. Editing or rebasing a proposal requires renewed review. Do not let multiple contributors silently overwrite each other, and define who can publish or remove content.

Record scene/branch contribution provenance when content is created so later collaboration does not require reconstructing authorship. Public contributor display should honor each contributor's chosen identity and relevant attribution obligations. Private history and public credits serve different purposes.

## 6. Suggested implementation sequence

1. Complete the Stage 1 structure experiments against the existing versioned playable adventure: branching viewer/editor, choice-to-passage connections, multiple-endings tree, state tracking, and map/editor/preview navigation. Record the chosen approach and confirm reliable save/resume behavior.
2. Turn those findings into a private single-author workflow with length label, guided outline, passage and choice editing, effects controls, map, and preview.
3. Add public author display preferences and story credits before public submissions.
4. Expand long adventures with chapters when the content requires them.
5. Add collaboration only after ownership, publishing, versioning, and contributor attribution work reliably.

Acceptance should include creating a short complete story without changing engine code, creating a chaptered story without losing state, previewing later consequences, validating intended endings, and publishing with each public identity option without leaking private account information.

## 7. Open design decisions

- How short and long formats are labeled and filtered; whether suggested lengths are useful.
- How playthrough-time estimates are calculated and displayed.
- Which guided prompts are shown by default and how authors dismiss them.
- Which stat/effect operations are available in the first authoring UI.
- Where full credits appear and how attribution changes affect existing versions.
- How collaborator roles, approvals, and conflict resolution will work later.

## Codex handoff

Suggested repository location: `docs/story-builder-and-author-credits.md`.

```text
Read this document alongside the project plan and modernization review.
Inspect the actual engine and story schema before implementing authoring controls.
Keep the first milestone focused on a private single-author workflow.
Preserve declarative effects, versioned content, stable ownership, and public-name privacy.
Defer collaborative editing until the basic workflow and attribution are dependable.
```

This document records design direction. It does not change the repository or establish automatic synchronization between Google Drive and Git.
