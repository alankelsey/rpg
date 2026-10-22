rpg
===
A browser-based, text-first choose-your-own-adventure RPG. Players pick a story, make choices that are checked against their stats, and can save their place in one story while starting another.

## Status

Planning, with a design sandbox. No playable game yet. The next milestone is a complete "new town" starter story running on a TypeScript engine with a static Vite + React reader and local saves.

## Docs

- [docs/plan.md](docs/plan.md): exploration notes, owner decisions (section 1.1), phasing, and open questions.
- [docs/modernization-review.md](docs/modernization-review.md): critique of the plan and the first milestone's acceptance checks.
- [docs/frontend-stack.md](docs/frontend-stack.md): why Vite + React + TypeScript, and the alternatives.
- [docs/scaling-plan.md](docs/scaling-plan.md): rollout stages and what to do if traffic spikes.
- [docs/legacy-prototype.md](docs/legacy-prototype.md): story text and ideas kept from the removed 2013 PHP prototype.

## Development

Requires Node 22 (`nvm use` reads `.nvmrc`).

```
npm install
npm run dev        # game at http://localhost:5173, stat-lab at /stat-lab.html
npm test           # engine and validator tests (Vitest)
npm run build      # typecheck and static build to dist/
```

The game engine is in `src/engine/` and has no UI or browser dependencies.

## stat-lab (character and story sandbox)

`stat-lab.html` is a local preview of character stats, origin layers, and story options. It will become part of the game later. It can also generate character portraits and book covers locally with Ollama and ComfyUI; see [docs/image-generation.md](docs/image-generation.md) for setup. Generated output goes to `characters/`, which is not committed.
