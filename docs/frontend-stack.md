# Front-end stack: why Vite + React + TypeScript, and the alternatives

Date: 2026-10-21. Status: working default, chosen by the owner, open to revisiting before the first code lands. Answers [plan.md question 1](plan.md#12-open-questions-for-the-rfc-session).

## What the game needs from a front end

From [plan.md section 1.1](plan.md#11-owner-decisions-2026-10-21) and the [modernization review](modernization-review.md):

- A static site. Players are the owner, then friends, then the public, and traffic will be low. Free static hosting (GitHub Pages, Cloudflare Pages, Netlify) is enough.
- A highly interactive reader: story picker, continue button, scene text, choices, stats panel, one save per story, import/export.
- A game engine in plain TypeScript that runs in the browser, in Node tests, and later in bots and server checks. It must not depend on the UI framework.
- Later: an authoring/character view that grows out of stat-lab, plus accounts and community features behind a separate API.
- No need for server rendering or SEO in the near term.

## Vite is a build tool; React is the UI choice

These are two separate decisions:

- **Vite** runs the dev server (instant start, hot reload) and produces the static production build. It is also the build layer under Astro, SvelteKit, Vitest, and React Router's framework mode, so picking it is low lock-in.
- **React** is how the reader UI is written. This is the choice that's harder to change later.
- **TypeScript** is shared by the engine and the UI, and it lets the story schema be typed once.

## Options compared

| Option | Pros for this game | Cons for this game |
|---|---|---|
| **Vite + React + TS** (default) | Plain static output to any free host. Fast dev loop. Vitest uses the same config, so engine tests need no extra tooling. Huge ecosystem (routing, forms, accessibility libraries). Multi-page builds can serve `stat-lab.html` alongside the game unchanged. Matches the skills used on Binary-2048. | You pick your own router and state approach. No pre-rendering by default, so story pages aren't indexed by search engines (doesn't matter yet). React adds roughly 40–50 KB gzipped, which is fine for a reading game. |
| **Next.js (static export)** | Same framework as Binary-2048. File-based routing. Can pre-render story landing pages for SEO. | Heavier than the game needs. Static export disables server features (route handlers, cookies, middleware), and it's easy to rely on one by accident. More framework churn between major versions. Binary-2048's Amplify problems came from its server mode. |
| **Astro (+ React islands)** | Static by default, built for content sites. Markdown/JSON content collections suit a story list and changelog. Can embed the React reader as one island. | The reader is the whole product and is fully interactive, so Astro mostly wraps one big React app. Two mental models (Astro pages, React components). Worth reconsidering only for public marketing/story pages later. |
| **SvelteKit or Svelte + Vite** | Smaller bundles, less boilerplate, simple reactivity. Static adapter works. | Smaller ecosystem, and a new framework to learn. No existing code in this repo uses it. |
| **Vanilla TS + Vite** (no framework) | stat-lab is already vanilla JS, so nothing new to learn. Smallest output. | You manage DOM updates and UI state by hand. That gets painful once you have a story picker, saves per story, a stats panel, an editor, and accounts. stat-lab's `stat-lab.js` (~22 KB) already shows that pressure. |
| **Preact + Vite** | React API at about a tenth of the size. | Minor compatibility gaps with some React libraries. The size savings don't matter for this game. Can switch later via an alias if needed. |
| **Modern PHP (e.g. Laravel)** | Server rendering, one language, cheap shared hosting. | The engine can't also run in the browser and in bots without a second copy. Rejected in the review. |

## Recommendation

Use Vite + React + TypeScript with these guardrails:

1. Keep the engine and story schema in their own folder (for example `src/engine/`) with no React or browser imports. Test them with Vitest in Node.
2. Use a static build only. Accounts and writes come later through a separate API, so the front end never needs a server runtime.
3. Use hash or path routing for `/` (story picker), `/story/:id` (reader), and later `/stat-lab`. Keep the existing `stat-lab.html` as a separate Vite page until it's integrated.

## When to revisit

- Public story pages need search-engine indexing: add pre-rendering, or put an Astro marketing site in front of the reader.
- The authoring tool grows into a large separate app: consider splitting it into its own Vite entry point or package.
- Server rendering becomes a real requirement: re-evaluate Next.js or React Router framework mode, keeping the engine unchanged.
