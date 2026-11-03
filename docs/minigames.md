# RPG Mini Games and Interactive Story Design

Design proposal for CYOA RPG • Phone brainstorming and Codex handoff

Status: proposed extension, not an implemented feature or finalized architecture. Based on the mini-game discussion and the supplied plan.md, modernization-review.md, and Choose-your-own-adventure-rpg.md. Where those notes conflict, follow the modernization review’s narrower playable-core direction.

## Related documents

- [Rewards, collectibles, and recognition](https://docs.google.com/document/d/1AC51R4HiWgWd0O8kYdHCZP0PTcb1K1I1i-iHzQY8GTc): earned and purchased cosmetics, reader themes, art/printed editions, ranks, and awards. Planned repo file: `rewards.md`; use a relative link after export.

- [Story builder and author credits](story-builder-and-author-credits.md): short and long formats, guided arcs, decision-effects controls, public author identity, and deferred collaboration. Use it for the author-facing workflow around the node contracts in this document.
- [Project exploration plan](plan.md): broad planning inputs and proposed features.
- [Modernization review](modernization-review.md): corrections, playable-core priority, engine and save contracts. Prefer its corrections where it conflicts with the older plan.
- [Original research notes](Choose-your-own-adventure-rpg.md): historical inspiration rather than a finalized architecture.
- [Phone-friendly Google Doc](https://docs.google.com/document/d/1l8qvwx1UxrJ2R_1Q71QOaV0TWWBoE1Jwya6TfaTxmNA): the earlier formatted version of this mini-game proposal.

Relative links assume these Markdown files live together in `docs/`. The original three reference files were supplied separately and are not copied into Drive by this task. These copies are not automatically synchronized.

## 1. Purpose and boundaries

Keep the core experience: read a scene, make a choice, see a consequence. Mini-games and puzzles should add meaningful story interactions. Cutscenes should provide brief entertainment without interrupting reading or hiding essential information.

Start with simple original browser implementations and free assets. Paid assets can be considered later. A text-only adventure must remain valid. Authors choose whether to include challenges; players receive clearly explained alternatives where skill or accessibility would otherwise block progress.

## 2. Three interaction categories

### Skill challenges

Snake and Simon test player reflexes, planning, or memory. Character stats also affect the challenge through visible assists or bounded parameter changes. Proposed outcomes are perfect, success, partial_success, failure, and skipped. Each game declares which outcomes it supports, and each authored node provides a route for every supported outcome.

### Persistent puzzles

Keypads, passwords, word guesses, symbol sequences, and combination locks test information or deduction. A clue discovered later can unlock an earlier section of the story. Persist clues, attempts, and solved state separately from transient interface state.

### Interactive cutscenes

Short browser-rendered sequences use backgrounds, sprites, text, CSS transforms, optional Canvas effects, and sound. They are presentation around the story. Full, reduced-motion, and automatic-skip settings must lead to equivalent story state and retain a readable summary of essential events.

## 3. Initial mini-game set

### Snake

Use an ASCII-style or simple grid appearance first. Story uses include a chase, avoiding obstacles, or an abstract hacking challenge. Configure target score, board size, speed, obstacles, and allowed attempts. Difficulty should change a small number of understandable parameters. Provide keyboard controls and mobile buttons or swipes. High Dexterity might slow movement or grant one collision recovery; these are proposals to playtest.

### Simon-style sequence memory

Configure sequence length, playback speed, rounds, and available replays. Illustrative tiers: easy 4 steps, normal 7, hard 12, expert 18 with faster playback. Tune through playtesting rather than treating these numbers as a specification. Intelligence could grant a replay; Perception could give a brief hint. Use distinct labels or shapes as well as colors and optional tones.

### Hangman / word guess

Use a simple word-guess engine for passwords, clues, or dialogue discoveries. Configure answer, hint, accepted variants, case normalization, and mistake limit. Character knowledge or Perception can reveal a letter or clue. Define how spaces, punctuation, repeated guesses, and unsupported characters behave. Avoid requiring unrelated trivia to finish the main story; use an alternate route or authored clue.

### Keypad / code entry

A player encounters a locked basement door, later discovers a receipt marked 4827, and returns to enter the code. A different route might reveal only _8_7. A journal can preserve discovered clues, while a high Intelligence assist can remind the player of a clue already acquired. Configure answer matching, hints, attempt cost, and the unlocked flag or route.

Allow remembered answers from another playthrough by default for secrets. If a particular puzzle requires in-world discovery, declare that prerequisite explicitly. Returning to the lock needs an authored route or navigation mechanism. A downloaded client-side story cannot keep answers secret from inspection.

### Later reusable engine: top-down maze

After the small set works, consider a maze engine with interchangeable tiles and sprites for buildings, forests, tunnels, or spaceship corridors. Defer platforming, rhythm, complex combat, and a large registry until the story demonstrates a need.

## 4. Story nodes and engine contract

Proposed node kinds: narrative, choice, challenge, puzzle, cutscene, and ending. These are conceptual types; adapt them to the actual schema after inspecting the repository. A narrative node may already contain choices, so avoid redundant classes merely to match this list.

Story authors select a registered game and configure bounded data. They do not upload executable JavaScript. A registry supplies each game’s configuration schema, supported outcomes, renderer, deterministic simulation or result-validation rules, and version identifier. Story progression and effects remain in the canonical engine; rendering never grants rewards.

Illustrative authoring shape—not a validated schema:

```text
{"id":"alley_chase","type":"challenge","game":"snake","gameVersion":1,
 "config":{"difficulty":"normal","targetScore":12,"maxAttempts":3},
 "statAssist":"dexterity",
 "routes":{
   "success":{"next":"escaped","effects":[{"setFlag":"escaped_guard","value":true}]},
   "failure":{"next":"caught","effects":[{"changeStat":"energy","amount":-10}]},
   "skipped":{"next":"alternate_escape","effects":[]}
 }}
```

All route targets, effects, and stat names must resolve in the real story. This excerpt deliberately illustrates a single node rather than a complete adventure. An alternate path can use an ordinary RPG check or a narrative consequence; label that policy clearly before play.

## 5. Difficulty, character stats, and rewards

Separate authored base difficulty, character modifiers, and accessibility preferences. Character modifiers can change sequence length, speed, hint count, or mistake allowance within documented limits. Show the resulting assist or penalty before starting. Sleep debt, stress, energy, diet, or injuries may influence challenges when the story’s rules support those variables.

For illustration, a challenge rated 7 might receive -2 from Dexterity, +1 from low Energy, and +2 from injury, producing 8. A rating is only a convenient author input; each game still needs an explicit bounded mapping to its own parameters.

Difficulty and rewards must not create repeatable stat farming. Record completed challenges and reward claims. Replays for fun can be available without granting the same story reward again. Partial success can open a costly or imperfect route rather than forcing repeated failures. Define attempt costs and exhaustion behavior in the story.

Accessibility options should preserve a meaningful route through the story. Do not secretly treat assist use as cheating. If rankings are introduced later, declare how different modes are compared.

## 6. Persistence, replay, and trust

Extend the existing reproducible-run goal to pin story, rules, game, and asset versions. Persist node, attempt identifier, seed, resolved configuration, clue/solved flags, claimed rewards, and resume state. For a real-time game, define deterministic ticks and record normalized inputs or a sufficient verifiable transcript. A seed and final score alone cannot reproduce player actions.

Commit each accepted result once through the engine, with an idempotent completion identifier. Refresh, retry, duplicate completion, and skip must not double-apply effects. Record gameplay-affecting stat assists and mode choices. Purely cosmetic frame timing need not affect the run.

Decide each game’s interruption policy before release: exact resume, paused checkpoint, or restart of the current uncommitted attempt. Display it clearly and preserve previously committed progress. A restart must not erase committed attempt costs.

Local play can accept local results. Competitive rewards or shared rankings require a separate trust design and server validation when justified. Replaying legal inputs validates mechanics; it does not establish that a human played. Keep bot observation-only play separate from full-information QA access.

## 7. Skippable browser cutscenes

Example sequence: a dark street appears, rain begins, a light flickers, a sprite enters, headlights pass, and the reader returns to the next scene. Start with a short fixed sequence and a text summary. Essential dialogue remains readable at the player’s pace.

Use a small allowlisted timeline vocabulary such as showBackground, showActor, moveActor, fade, playSound, and showText. Authors supply data, asset identifiers, durations, and positions. No arbitrary script evaluation. Pause and skip controls should work immediately; sound begins only after an appropriate user interaction.

Complete, skip, and automatic-skip call the same engine transition once. Cutscene completion must not depend on a sound file loading or an animation callback firing. Reduced-motion mode substitutes static frames or gentle transitions. A missing optional asset falls back to readable text.

## 8. Shared assets and licensing workflow

Use a shared asset catalog for story backgrounds, mini-game tiles/sprites, cutscenes, UI, and audio. Start with original text, shapes, and simple artwork. Kenney, OpenGameArt, and Fab are candidate sources from the discussion; this document does not approve any particular asset or certify its current license.

Proposed preference: original work, then assets with an explicitly verified CC0 license, then attribution-based assets whose terms fit the release. Consider paid or marketplace-licensed assets later. Review share-alike, copyleft, platform-specific, and unclear terms before importing. Check the actual asset’s license, including browser distribution of downloadable files.

For every imported asset, retain creator, source URL, license name/version, a license copy or proof, required credit, modifications, and allowed distribution context. Free price alone is not a license. Track fonts and audio as well as artwork. Keep software, story, and asset licensing separate.

```text
{"asset":"town-night-background.webp","creator":"VERIFIED_CREATOR",
 "sourceUrl":"VERIFIED_SOURCE_URL","license":"VERIFIED_LICENSE",
 "licenseEvidence":"licenses/town-night.txt","modified":true,
 "credit":"REQUIRED_CREDIT_IF_ANY"}
```

The capitalized values above are schema placeholders for future asset records, not an imported asset. Build a credits page from real catalog entries. Use appropriately sized browser images and sprite sheets; defer heavy animations and video until useful.

## 9. Creator experience

An author selects a game, base difficulty, stat assists, hints, attempts, and outcome routes. Preview should show the effective configuration for sample characters and expose unreachable routes or missing assets. Keypad tools should connect clue scenes to locks and show whether a return path exists.

Eventually a graph editor can connect narrative, challenge, puzzle, cutscene, and ending nodes. Begin with repository-authored validated data and preview tools; a visual editor is a later usability improvement. Scene composition can later reuse backgrounds, actors, positions, audio, and the same small timeline vocabulary.

## 10. Experimental delivery sequence

First complete the versioned new-town story, stat effects, endings, accessible reader, and reliable local save/import/export described in the modernization review. Then add one keypad with a later clue and return path. Next add Simon to exercise player skill plus character assists, followed by Snake. Add word guess and one skippable cutscene once those contracts hold. The exact order can change through playtesting.

Acceptance: every declared outcome routes correctly; malformed configs and missing targets are rejected; keyboard and narrow-screen play work; clues and solved locks survive refresh; committed effects happen once; interruption follows the documented policy; deterministic fixtures reproduce challenge outcomes; and skipped cutscenes preserve story state and essential information.

Use one small adventure to demonstrate fun, failure, retry, a later clue, a stat assist, and a skip path. Keep richer assets, the maze, public authoring, live AI, and a broad challenge library deferred until they improve that experience.

## 11. Codex handoff and open decisions

Suggested repository destination: docs/minigames.md, with cutscenes and asset policy split into their own Markdown files only when useful. Keep the repository version as the implementation source of truth and this Google Doc as the phone-friendly design surface. This task creates the Doc; it does not establish automated synchronization or change the repository.

```text
Read docs/minigames.md and the existing architecture documents.
Inspect the actual repository before choosing types or dependencies.
Implement the smallest approved milestone with a complete story fixture.
Keep gameplay effects in the canonical engine and preserve versioned saves.
Report what changed, how it was checked, and remaining limitations.
```

Decisions to confirm before implementation: default skip consequences; whether individual locks require discovered clues; exact stat names and modifier bounds; restart versus exact resume per game; maximum attempts and reward policy; and the first challenge’s role in the completed new-town story. The examples here are proposals, not automatic approval of every mechanic.
