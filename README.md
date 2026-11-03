# RPG

A browser-based, text-first choose-your-own-adventure RPG. Players pick a story, make choices that are checked against their stats, and can save their place in one story while starting another.

## Status

The playable foundation of Stage 1 is complete. The repository now includes a static Vite + React reader, a TypeScript story engine, local saves, and the complete "New Town" starter adventure. Stage 1 itself remains in progress until the story-structure experiments below are complete and their design decisions are recorded.

"New Town" has 21 passages and four reachable endings. Player decisions affect money, health, energy, kindness, and a hidden diet stat. Locked paths remain visible with an explanation, and the ending screen tracks discovered endings and paths that were unavailable during the run.

Stage 1 experimentation covers:

- A visual branching-structure viewer and editor for passages and choices.
- Connecting and reconnecting choice paths to passage nodes, including branches that split and later rejoin.
- A visual multiple-endings tree that distinguishes good, neutral, and bad outcomes and makes routes to each ending inspectable.
- State tracking that shows how stats, flags, requirements, and effects unlock or block later paths.
- Navigation between the map, passage editor, and playable preview.

The read-only map is the first completed structure experiment. The engine/state gate is also complete: versioned run/save data, inventory and composed requirements, explicit resource costs, deterministic transition events, strict story/save parsing, bounded replay and exploration, immutable story-version loading, cycle/blocked-state diagnostics, and canonical route simulation are implemented and tested. Details are in [docs/engine-state-roadmap.md](docs/engine-state-roadmap.md).

The next Stage 1 gate is a manual desktop/mobile review of the story map and ending-route state preview. After that review, continue with passage/choice editing, reconnecting paths, draft persistence/export, and playable preview against the stable engine contract.

Stage 1 is complete when the engine/state gate and structure experiments work against "New Town," the chosen approach and rejected alternatives are documented, all intended endings remain reachable, save/resume works exactly, and keyboard/mobile play and human playtesting pass. Stage 2 then turns the findings into a dependable private author workflow where another author can validate, preview, and publish a short story without changing engine code.

## Features

- Story-picker landing page with a shortcut to the most recently played story.
- One local save per story, reconstructed from verified choice history.
- Save download and restore for moving progress between browsers.
- Declarative story graphs with versioned scenes, choices, conditions, effects, stats, and flags.
- Visible locked choices, secret choices, stat-change feedback, ending discovery, and replay support.
- A read-only branching flow chart with passage inspection, labeled choices, state rules, and color-coded endings.
- A pure story engine with no browser or UI dependencies.
- Story validation and bounded path exploration that check every published story for broken paths, unreachable endings, and unusable choices.

## Docs

- [docs/plan.md](docs/plan.md): exploration notes, owner decisions (section 1.1), phasing, and open questions.
- [docs/modernization-review.md](docs/modernization-review.md): critique of the plan and the first milestone's acceptance checks.
- [docs/frontend-stack.md](docs/frontend-stack.md): why Vite + React + TypeScript, and the alternatives.
- [docs/scaling-plan.md](docs/scaling-plan.md): rollout stages and what to do if traffic spikes.
- [docs/legacy-prototype.md](docs/legacy-prototype.md): story text and ideas kept from the removed 2013 PHP prototype.
- [docs/RPG and Choose Your Own Adventure Components.docx](docs/RPG%20and%20Choose%20Your%20Own%20Adventure%20Components.docx): source notes for Stage 1 branching, mapping, state, and navigation experiments.
- [docs/stage-1-story-map-viewer.md](docs/stage-1-story-map-viewer.md): scope and review checklist for the first branching-viewer prototype.
- [docs/engine-state-roadmap.md](docs/engine-state-roadmap.md): the next implementation gate before additional editor UI.

## Development

Requires Node 22 (`nvm use` reads `.nvmrc`). The landing page is the story picker; stories live in `src/stories/` and are checked by `npm test` (validation plus an explorer that plays every path).

```sh
npm install
npm run dev        # game at http://localhost:5173, stat-lab at /stat-lab.html
npm test           # engine and validator tests (Vitest)
npm run build      # typecheck and static build to dist/
```

The game engine is in `src/engine/` and has no UI or browser dependencies.

## stat-lab (character and story sandbox)

`stat-lab.html` is a local preview of character stats, origin layers, and story options. It will become part of the game later. It can also generate character portraits and book covers locally with Ollama and ComfyUI; see [docs/image-generation.md](docs/image-generation.md) for setup. Generated output goes to `characters/`, which is not committed.
