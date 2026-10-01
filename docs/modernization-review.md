# CYOA RPG modernization review

Review date: 2026-09-28. RPG baseline: `84c21f1`. Binary-2048 comparison: local checkout `c992717`.

**Recommendation: proceed with a small replacement of the playable core.** The concept is feasible, and a text-first game can have very low hosting costs. The existing PHP is an unfinished prototype, so extending it would mean repairing fundamental behavior before building the intended game. Preserve the story premise and intended mechanics; implement a versioned story format, a deterministic engine, and an accessible reader with reliable saves.

The full exploration plan describes several products: a game, an authoring tool, a community publishing platform, a bot evaluation service, and a dataset publisher. They are plausible stages, but collectively too broad for an initial near-zero-cost release. Content quality, editorial work, moderation, and durable state will require more attention than rendering scenes.

## Review scope and confidence

Reviewed the RPG README, both existing documents in `docs/`, all PHP/CSS files, repository inventory and relevant history, plus selected Binary-2048 implementation and operational documentation. The RPG has 22 PHP files, two CSS files, and three story scenes. There is no dependency manifest, database migration/schema, or automated test suite; `test.php` and `test2.php` are scratch scripts.

Findings below distinguish source observations, documented production outcomes, and recommendations. PHP is unavailable in this environment, so no PHP runtime or database integration checks were performed. Binary-2048 production claims are attributed to its local records; this review did not probe production, verify credentials, inspect deployed bundles, or audit that entire application. External framework/provider documentation was checked on the review date. Sibling-repository links require Binary-2048 beside this repository.

## 1. What is worth keeping

- **A simple interaction loop:** read a scene, make a choice, see a consequence. This supports a small browser release without real-time infrastructure.
- **The starting premise:** arrival in a new town, limited money, food, lodging, and finding work can produce understandable tradeoffs. The three existing scenes are draft material, not a complete story.
- **Stats influenced by habits:** diet, rest, stress, and reputation could make repeated choices matter. Their effect needs readable feedback and a clear ruleset.
- **The strongest planning ideas:** declarative effects, immutable published story versions, reproducible runs, local play, and author approval of contributions. See [the exploration plan](plan.md), especially sections 4 and 11.
- **Binary-2048 experience:** deployment acceptance, replay verification, explicit storage behavior, and bot evaluation are valuable references. Transfer those lessons selectively rather than importing its entire infrastructure.

A modern PHP implementation is also feasible. The reason to replace this implementation is its missing state model and unfinished behavior. TypeScript is attractive here because one engine can run in the browser, in server verification, and in local bot tooling.

## 2. Concrete problems in the existing code

Severity describes impact if this code is revived or deployed. Dormant code is identified separately from active paths.

| Priority | Evidence | Impact and required direction |
|---|---|---|
| Block public deployment | [statstab.php](../statstab.php), line 21, echoes `fname` directly into HTML. | A reflected-XSS sink exists if rendering reaches this statement. Render names as text, constrain length/type, and apply context-appropriate output encoding. Future authored Markdown also needs safe rendering. |
| Broken progression | [index.php](../index.php), lines 27–30, passes a submitted value to [sceneselect.php](../sceneselect.php), lines 28–43, which constructs an include filename. | There is no current-scene or legal-choice validation. Replace page numbers with stable scene/choice IDs and validate against run state. Unsafe dynamic dispatch is established; arbitrary file traversal or remote code execution was not demonstrated. |
| Broken story branches | [scene1.php](../scene1.php), line 61, targets absent `scene4.php`; [scene2.php](../scene2.php), lines 15–16, gives both foods choice `1`; [scene3.php](../scene3.php), lines 12–14, maps hotel to arrival, hostel to the store, and unemployment to the hotel itself. | Some choices fail, some are indistinguishable, and others loop incorrectly. Re-author explicit transitions and add intended endings. |
| No working persistence | [player.php](../player.php), lines 25–32, builds an INSERT without executing it; lines 48–61 prepare a SELECT without executing, fetching, or returning its result. | Player creation/retrieval is unfinished. There is no evidenced save system to migrate. If an old live database exists, inventory it separately before making migration decisions. |
| No player isolation | [statstab.php](../statstab.php), line 7, and [scene1.php](../scene1.php), line 20, request player `1`. Session startup is commented out; [check_session.php](../check_session.php), line 17, attempts a constant cookie value. | Simply enabling database queries would not create separate players. Explicitly choose local anonymous runs first and authenticated ownership when server saves arrive. |
| No usable stat engine | [player.php](../player.php), lines 11–14, initializes globals; lines 67–147 use `$this` without a class. [statstab.php](../statstab.php), lines 17–20, uses inconsistent variable names. | Stats cannot reliably persist or update. Represent all run state explicitly; make choice application the only gameplay mutation. |
| Promised mechanics are absent | The cash in [scene1.php](../scene1.php), line 49, food benefits in [scene2.php](../scene2.php), and lodging prices in [scene3.php](../scene3.php) are prose/labels. | Currency, purchases, health effects, and energy effects are not implemented. Do not mistake story text for implemented rules. |
| Unsafe dormant patterns | [player.php](../player.php), lines 29–30 and 48–52, concatenates SQL values; line 121 uses assignments in a choice condition. [caption.php](../caption.php), line 3, and [command.php](../command.php), line 7, attempt damage during rendering. | Parameterize future queries, use explicit legal choices, and keep rendering side-effect free. These are latent defects; a live SQL injection exploit was not demonstrated. Refreshing a scene must never apply its effects again. |
| Reproducibility and deployment gaps | Database connections occur during includes; configuration comments reference an absent `.env.example`; scratch files and extensionless [c](../c) sit in the webroot. | Define configuration and migrations if retaining a database. Deploy an explicit public/build directory; extensionless source may be served as text under some server configurations. |
| Reader usability debt | [header.php](../header.php) lacks viewport/language metadata; [scene3.php](../scene3.php), lines 7 and 10, nests forms; choice inputs lack associated labels; [rpg.css](../rpg.css), line 74, fixes caption width at 800px. | Rebuild semantic, responsive markup. Keyboard choice selection, visible focus, readable text, and mobile layout are core requirements for a reading game. |

Use [OWASP's output-encoding and sanitization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) for both display names and later user-authored content. Declarative gameplay effects do not make embedded HTML, links, or media safe automatically.

**Credential status needs accurate wording.** [plan.md](plan.md), line 52, describes credentials and a swap file as currently committed. Current connection files use `getenv('DB_…')`; `.gitignore` already excludes swap files, and no swap file is currently tracked. Earlier commit `263aa91` contains literal connection configuration, and `.connect.php.swp` remains in history. Confirm old credentials were revoked or the accounts retired before reusing any service. Removing current literals or ignoring files does not remove history. Rotation status was not verified; no secret values are reproduced here.

## 3. Binary-2048 lessons and gotchas

### Correct the stale production assumption

[plan.md](plan.md), lines 80–83 and 288–298, still treats Binary-2048's Mongo leaderboard activation as unresolved. The current [V1 handoff](../../Binary-2048/docs/v1-session-handoff-2026-09-24.md), dated September 27 despite its filename, records successful shared Mongo leaderboard persistence, including a write before forced cold start and read afterward, at lines 39–97. Its documented deployed baseline is `1172b19`, distinct from the reviewed local checkout.

The earlier 504 and bounded 503 failures did happen according to that record. Later changes addressed failed initialization retry, credentials, and network access. Fixed egress and restricted allowlisting remain deferred; broad temporary access is still documented. The correct lesson is to test the complete deployed storage path and document network tradeoffs. It is not evidence that Amplify plus Atlas cannot work, nor evidence that every Binary-2048 store has equivalent durability.

### Patterns to carry forward carefully

| Binary-2048 evidence | RPG gotcha to avoid | Recommendation |
|---|---|---|
| [V1 handoff](../../Binary-2048/docs/v1-session-handoff-2026-09-24.md), lines 41–53 and 88–97: awaited shared leaderboard operations, stable retries, explicit outage UI, cold-start acceptance. | A successful response or warm-instance read can conceal lost saves. | Report a server save as complete only after durable commit. Test resume after a new process/deployment, and distinguish unavailable storage from missing data. |
| [session-store.ts](../../Binary-2048/lib/binary2048/session-store.ts), lines 62–98: asynchronous writes behind a synchronous interface, swallowed persistence errors, and cache-miss reads returning null while hydration runs. | Copying an adapter by name can import different guarantees from the leaderboard implementation. | Use awaited asynchronous save/load contracts. Test failed writes, cache misses, concurrent tabs, and retries. Reuse interface ideas, not this implementation verbatim. |
| [V1 handoff](../../Binary-2048/docs/v1-session-handoff-2026-09-24.md), lines 62–78: timeout bounds and clearing a failed cached initialization. | One transient database failure can poison a warm instance; long timeouts become edge 504s. | Bound connection/operation time, allow recovery after transient initialization failures, and return useful sanitized errors. |
| [next.config.mjs](../../Binary-2048/next.config.mjs), lines 19–50, places auth/admin/recovery secrets and a Mongo URI in Next's `env` configuration. | A comment calling this a server-bundle workaround is not a security boundary. | Keep secrets out of build-time client-substitutable configuration. Use supported server-only runtime delivery and inspect client artifacts with nonsecret sentinel values. No actual deployed leak was established in this review. |
| [Production authenticated acceptance](../../Binary-2048/docs/production-authenticated-acceptance-2026-09-13.md), line 81, records a bridge secret missing from the SSR runtime bundle despite branch configuration. | Local builds and configured dashboard variables do not prove deployed auth works. | Exercise actual login, ownership, save, and resume on the intended deployed revision. Verify runtime configuration without printing secrets. |
| [Replay format](../../Binary-2048/lib/binary2048/replay-format.ts), lines 4–17, records ruleset, engine version, seed, configuration, and initial grid. | A seed alone does not reproduce changing rules, content, or external model decisions. | Pin all rule/content dependencies, keep replay fixtures, and record external decisions and outputs needed to reconstruct a run. |
| [Rate limiter](../../Binary-2048/lib/binary2048/rate-limit.ts), lines 151–166, can fall back from Mongo to per-instance memory; [bot segmentation policy](../../Binary-2048/docs/bot-vs-human-segmentation.md) distinguishes automated activity. | Bot traffic can overwhelm writes and fabricate popularity; fallback counters cannot enforce a deployment-wide quota. | Keep local QA bots early, use shared enforced quotas for public writes, and separate automated activity. Choose explicit failure behavior for paid inference and rewards. Set limits from RPG payload/work costs rather than copying Binary's request counts. |
| [V1 handoff](../../Binary-2048/docs/v1-session-handoff-2026-09-24.md), lines 22–37 and 101–110: preserving active play during setup, deliberate replay controls, debug UI disabled by default. | Menus, diagnostics, and restart behavior can damage the reading experience. | Opening settings must preserve a run. Make restart deliberate, expose simple save/replay controls, and keep developer diagnostics out of normal gameplay. |
| [Tutorial/mobile acceptance](../../Binary-2048/docs/tutorial-mobile-acceptance-2026-09-24.md), lines 39–48: hidden-tab timers and modal focus needed fixes; physical-device checks remain distinct from automation. | A passing desktop browser test does not prove mobile reading, background/resume, or assistive navigation works. | Test actual phone scrolling, browser Back, background/resume, focus containment/return, and scene announcements. Avoid timed narrative advancement by default. |

The secret-handling concern is supported by [Next.js's `env` documentation](https://nextjs.org/docs/pages/api-reference/config/next-config-js/env): configured values are substituted into JavaScript bundles at build time. [Amplify's runtime environment guidance](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html) also warns against putting sensitive credentials in deployment artifacts and describes IAM access for AWS resources. Choose the supported mechanism for the selected host; do not assume a variable lacking `NEXT_PUBLIC_` is protected when explicitly placed in `next.config` `env`.

## 4. Product and architecture critique

### Prove that the choices matter

Start with one finished short story, provisionally 12–20 scenes and two or three endings. Let early choices affect later dialogue, opportunities, relationships, or endings. A store where every option only increases a different number will not establish the narrative appeal.

Not every choice needs a stat gate. Include expressive choices and tradeoffs where neither option is universally best. Clearly distinguish guaranteed costs, uncertain consequences, and intentionally hidden information. Explain habit penalties through feedback; unexplained reductions can feel arbitrary. Keep progression per run initially so one story cannot grant resources that break another author's balance.

Branch growth is a content problem as well as an engine problem. Ten decisions with three independent alternatives create 59,049 possible choice sequences. Use reconverging branches and flags to make consequences persist without requiring unique prose for every sequence. Track editorial coverage of those flags. Reader completion, understanding of consequences, and desire to replay are better early signals than total scene count.

### Define the state contract before choosing the database

Use a pure engine operation such as `applyChoice(storyVersion, runState, choiceId)`. It should validate the choice, evaluate checks, apply costs/effects once, advance to the next scene, and return an outcome. Rendering, storage, and model calls belong outside that operation.

A replayable run needs more than the plan's `(story version, seed, choices)` tuple:

- Immutable story ID/version and content hash, schema version, and engine/rules version.
- Initial state, including stats, flags, inventory, and any imported profile values.
- Defined RNG algorithm/seed if randomness is supported, plus a stable ordering of random draws.
- Ordered accepted choice events and a state revision; snapshots are acceleration aids, not the only record of what happened.
- Later, pinned director/incident-pool versions and recorded model selections or generated text actually shown to the player.

Start with deterministic thresholds. If randomness arrives, separate narrative rolls from cosmetic randomness and pin the contract. A hosted LLM is an external decision source; providing a seed does not make its behavior reproducible.

For cloud saves, `stateHash` is useful for comparison but is not authorization or retry protection. Bind a run to its owner, require an expected revision, commit the event and resulting state atomically, and deduplicate requests by an idempotency key. A double-click, lost response, or second browser tab must not spend money twice or silently overwrite progress. Local-only saves should state their scope clearly and support export/import because browser storage can be cleared.

### Validate playable states, not just graph shape

The sample graph in [plan.md](plan.md), lines 118–141, is illustrative but references `hotel`, `jobs`, and `street` nodes it does not define. Turn it into a complete validated fixture before using it as a format specification.

The validator and local explorer should catch missing targets, duplicate IDs, unknown stats/operators, impossible prerequisites, states with no legal exit, unintended loops, and repeatable resource farming. Allow intentional loops and failure endings, but mark them explicitly. Bound story size, text length, effect count, expression depth, numeric values, and replay length. Money should be an integer in a defined unit with a safe range, not literally unbounded.

Use a closed declarative expression language; never evaluate uploaded JavaScript/PHP or arbitrary expressions. Structural reachability does not prove an ending is attainable with the required inventory and stats. Preserve hand-authored fixtures for important endings and supplement them with bounded state exploration. Large state spaces will still require playtesting.

### Versioning must cover edits, approvals, and removal

Pin existing saves to their original story version. A path proposal needs a base version/hash, stable attachment IDs, author attribution, and explicit requested changes. An approval must refer to the exact proposal content. Rebase or edits invalidate that approval; publish the resulting version atomically after validation and review. Two accepted proposals may conflict even when each is valid independently.

Votes should inform editorial decisions. They should not automatically publish a branch or grant rights to modify an author's existing scenes. Keep author approval and moderator removal powers explicit. Avoid rewarding raw node counts, which encourages splitting scenes into meaningless fragments.

Immutable content identifiers do not require keeping withdrawn content publicly available forever. Define a tombstone/withdrawal mechanism, cache invalidation, and a player-facing explanation when a saved story becomes unavailable. Do not silently migrate an old run onto rewritten rules.

### Keep the director and LLMs optional

The original [research note](Choose-your-own-adventure-rpg.md) contradicts itself: line 1 calls RimWorld GOAP-based, while line 3 says it uses ThinkTrees instead. [plan.md](plan.md), line 158, should not endorse this as a verified summary. Treat the material as design inspiration; the RPG does not need to reproduce RimWorld's internal architecture. The video-generation fragment is unrelated to the game design.

An authored incident selector can come later at author-approved insertion points. Define how it returns to the original scene, respects location/time/characters, avoids nesting itself, and observes cooldowns. A persistent emergency must not repeatedly inject the same event forever. Summing money and unrelated stats into a single “wealth” number, as proposed at plan line 173, needs normalization and a tested design purpose.

Begin any LLM work with offline draft suggestions. Require schema validation and editorial review before publication. Ranking an allowed candidate list is safer than letting a model mutate state, but it still needs timeout/fallback behavior and output validation. Story text must never grant tool access or authority. Live per-turn generation adds latency, cost, continuity, and replay problems before the basic game has proved enjoyable.

## 5. Bots, rankings, and datasets: separate the promises

**Bots:** local random/explorer bots can help validate the first engine. A public API, key management, hosted inference, tournaments, and a Python engine mirror can wait. Keep one canonical implementation initially; a second language needs shared replay fixtures to prevent rule drift.

**Information access:** plan lines 209–212 expose predicted check results and the full story graph. That is a deliberate design choice, not a neutral API detail. It can reveal hidden outcomes and endings. Separate observation-only play from full-information solver/QA access and label benchmarks accordingly. A fully downloaded client-side story cannot promise spoiler secrecy.

**Trust:** server replay proves that a trajectory obeys rules. It does not prove a human read the story. Neither a signed guest token nor a self-declared `actorType` establishes one person. Initially exclude guests and declared bots from governance votes; use server-controlled identities, deduplication, quotas, and conservative ranking definitions. Distinguish starts, qualified-read estimates, and completions. Avoid presenting any of them as verified human readership.

**Dataset rights:** plan line 239's “None (bot-generated)” licensing dependency is incorrect as a blanket assumption. Bot records can contain story text, prompts, provider output, and derived content. Capture source attribution, author permissions, consent purpose/policy version, and export eligibility before collecting data intended for publication. Keep gameplay access, internal analytics, and public research sharing as separate choices; operational-only should be the initial default until those choices are implemented.

**Privacy:** salted IDs are pseudonyms, not a guarantee of anonymity. Names, free text, timestamps, and distinctive trajectories can remain identifying. Export minimized fields, filter consent at export time, and define how removal requests affect future exports and retained snapshots.

**Licensing and withdrawal:** requiring CC BY or CC BY-SA while offering a platform dataset opt-out needs clear wording: excluding content from this project's exports does not retract reuse rights already granted by an open license. Creative Commons describes its licenses as irrevocable subject to their terms, and original component licenses continue to apply in collections. Decide the content and software licenses separately before public submissions. [Creative Commons FAQ](https://creativecommons.org/faq/)

The plan's assertion that published Hub versions cannot be changed retroactively is too absolute. The Hub supports history-changing/removal operations; the practical limit is that downloaded copies cannot reliably be recalled. Define a takedown and retraction process rather than promising either perfect deletion or permanent availability. [Hugging Face storage/history guidance](https://huggingface.co/docs/hub/storage-limits)

**Research quality:** votes are community feedback, not automatically clean pairwise training preferences. Exposure, popularity, time online, and moderation affect them. Split evaluation data by story family/version lineage rather than randomly splitting steps from the same stories across train/test. Record model/provider versions, what the bot could observe, prompts, failures/fallbacks, and the content/rules versions used. A “good ending” score is only one authored objective, not a general measure of narrative intelligence.

## 6. Hosting, cost, and scope feasibility

### Recommended starting architecture

Build a static reader with a small TypeScript engine and repository-authored JSON stories. Vite + React is a reasonable default for this scope; [Vite supports static production output and React/TypeScript templates](https://vite.dev/guide/). Next.js static export is also reasonable if team familiarity matters, but do not accidentally rely on runtime route handlers, cookies, or other server features in the exported site. Auth and writes would live in a separate backend. [Next.js static-export limitations](https://nextjs.org/docs/app/guides/static-exports)

Keep story schema/validation and the engine independent of UI and hosting. Save locally after accepted choices and offer a portable run export. Author initial content in the repository and publish only validated story versions. Add account sync when users actually need cross-device continuity; make that a durable feature from its first release.

When backend work is justified, pick one service boundary and one primary database. On AWS, a small API with DynamoDB is a credible option; alternatively, evaluate Workers with D1 if changing providers is acceptable. Choose based on concrete access patterns: saves by owner, stories by publication status/tags, one vote per identity/target, proposals by version/status, and moderation queues. Do not start by implementing multiple production adapters or a universal storage abstraction.

| Option | Feasibility for this project | Main caveat |
|---|---|---|
| Static reader + local saves | High for the first release | No automatic account sync; saves need export/recovery and pinned content. |
| Static reader + small API + DynamoDB | High after a storage/auth spike | Design indexes and conditional writes; keep large story blobs outside database records. DynamoDB items have a 400 KB limit. [AWS constraints](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html) |
| Workers + D1 | Plausible low-cost backend | Free-plan daily limits can make queries fail; design indexed queries and graceful degradation. [D1 pricing/limits](https://developers.cloudflare.com/d1/platform/pricing/) |
| Amplify SSR + Atlas | Technically feasible; optional, with more operational decisions | Binary's latest records show it can work, but runtime secrets, network access, and durable store semantics need explicit acceptance. |
| Modern PHP + a managed database | Feasible if maintaining PHP is a team preference | Still requires replacing routing, state, auth, rendering, and data-access logic. The current prototype offers little implementation savings. |

Avoid treating Cloudflare KV as interchangeable with D1: KV's eventual consistency and lack of transaction-style atomic updates make it a poor sole authority for vote uniqueness or competing save writes. It is better suited to cacheable content/configuration. [Cloudflare KV consistency guidance](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

### Near zero is a target with conditions

The plan's dollar figures are preliminary estimates, not a budget. A small static release can fit free allowances, while domains, backups, builds, logs, API usage, and storage growth can still cost money. Community management and writing also consume time even when the cloud bill is tiny.

One specific correction: DynamoDB's 25 RCU/25 WCU allowance refers to provisioned capacity; it should not be used as an on-demand request allowance. Recheck account eligibility, region, capacity mode, and all included services before choosing a configuration. [AWS DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/)

Budget alarms are notifications, not hard spending caps. AWS documents notification delays and possible spending beyond the threshold before an alert arrives. Use alarms alongside enforced quotas, bounded payloads/compute, retention limits, and switches that disable costly optional features. A safe degraded mode would preserve static reading and local saves while pausing public writes or inference. [AWS Budgets behavior](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)

For sizing, 1,000 runs at 40 turns produce 40,000 step events. Checkpointing every five turns reduces checkpoint calls to roughly 8,000, but increases unsynced progress unless events are also durably queued. Snapshot size, retention, bot volume, and model tokens matter as much as request count. This is illustrative workload arithmetic, not a hosting quote.

### Practical delivery sequence

These are planning judgments, not estimates derived from team velocity. For one experienced developer working with supplied, modest-length prose, a local playable MVP is plausibly a few focused weeks. A public authoring/community service is additional months of engineering and ongoing operations. Content production and part-time availability can dominate elapsed time.

| Stage | Deliverable | Gate before expanding |
|---|---|---|
| 1. Complete one adventure | One finished story, versioned schema, pure engine, stat effects/checks, explicit endings, static reader, local save/import/export. | Intended endings are demonstrably reachable; keyboard/mobile play and exact save/resume work; playtesters understand the consequences and want to continue. |
| 2. Private author workflow | Validation feedback, preview, bounded explorer bot, attribution, versioned publishing from files or a simple form. | A second author can finish and publish a short story without changing engine code. No graph-canvas editor is required yet. |
| 3. Durable accounts and publishing | Managed authentication, owner-bound saves, asynchronous store, atomic retries, backups/restore, initial moderation/removal tools. | Restart/deploy/outage/retry checks pass; ownership is enforced; real deployed login/save/resume works; permissions and consent are recorded. |
| 4. Small community pilot | Proposals tied to exact versions, author/moderator approval, limited voting, defined read metrics. | Conflicts, duplicate votes, removal, and abuse reports have an owner and tested workflows. Submission volume fits moderation capacity. |
| 5. Optional experiments | Director incidents, public bots, reviewed dataset exports, offline LLM drafting. | Each has a specific user/research objective, cost ceiling, measurement plan, and independent off switch. |

Defer payments, contribution credits, merch revenue sharing, live generated scenes, and paid inference until engagement justifies them. The plan's “no pay-to-win exists in a CYOA” is not inherently true; paid resources or influence could create it. Define the intended fairness policy before adding an economy. Do not reward voting with tradable credits before abuse and accounting rules exist.

## 7. Corrections to carry into the next formal plan

1. Update credential wording and Binary-2048 persistence status to match the reviewed state. Preserve the distinction between code, historical incidents, documented acceptance, and live verification.
2. Remove the suggestion that per-instance memory is suitable for authoritative early-production data (plan line 65); it conflicts with the warning at line 82. Memory is fine for development/demo execution. Browser-local saves are a separate, explicit product mode.
3. Expand the replay/state contract and define exactly what players and bots can observe before designing exports or APIs.
4. Capture author permissions and purpose-specific player consent when collection/publishing begins, rather than waiting until the dataset phase.
5. Make the sample story valid and complete; replace the conflicting RimWorld notes with clearly labeled inspiration and independently verified references if needed.
6. Replace copied quotas, old infrastructure prices, and model cost/latency anecdotes with a dated workload model and measurements for this game's actual content.
7. Name the initial audience, intended session length, editorial owner, and moderation capacity. Start with one measurable proof of enjoyable play, then reassess the larger platform.

## 8. Acceptance checks that matter most

Use tests that protect the contracts and observed failure boundaries:

- **Engine:** fixed inputs reproduce fixed outcomes in browser and Node; illegal choices fail; costs/effects apply once; important stat/flag combinations reach intended endings.
- **Content:** dangling references and unsupported effects reject publication; intentional loops are explicit; bounded exploration reports blocked states and exploitable repeat rewards.
- **Saves:** refresh restores the exact version/state; export/import round-trips; missing/withdrawn versions produce a clear response; opening settings does not erase progress.
- **Reader:** names and authored markup cannot execute scripts; every choice is usable by keyboard and on a narrow screen; focus moves predictably when a scene changes.
- **Server, when introduced:** another owner cannot access a run; duplicate requests do not double-apply effects; concurrent tabs cannot silently overwrite; acknowledged saves survive replacement of the serving process; storage errors are visible and retryable.
- **Publishing, when introduced:** approvals bind to exact content; stale proposals require renewed review; rollback/removal and backup restoration are exercised.
- **Deployment:** check the expected revision and real auth/write/read behavior, including unavailable dependencies. A green build or generic health response is insufficient acceptance.

The immediate next implementation milestone should be a complete versioned “new town” adventure with one meaningful resource tradeoff, one later consequence, multiple endings, and reliable local save/resume. That is small enough to validate the product while establishing the engine and content contracts the larger ambitions depend on.
