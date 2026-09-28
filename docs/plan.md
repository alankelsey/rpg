# CYOA RPG: Exploration Notes and Planning Inputs

Date: 2026-09-27
Status: exploration only. This document collects facts, options, and open questions so a later session can write the formal plan, RFC, and architecture documents. It makes recommendations but no final decisions.

Inputs read for this document:

- `README.md` and `docs/Choose-your-own-adventure-rpg.md` in this repo (the starter story lives in `scene1.php` through `scene3.php`; the README itself is one line).
- The PHP prototype in this repo (all `*.php` files).
- `../Binary-2048`: README, `docs/*.md`, `lib/binary2048/{leaderboard,run-store,rate-limit}.ts`, `next.config.mjs`, `auth.ts`, `package.json`, `.env.example`, `infra/`.

---

## 1. Product summary (as stated by the owner)

- Browser-based choose-your-own-adventure game. Players read scenes and pick a direction.
- Every choice is measured against the player's current stats.
- Stats are also affected by meta stats (example: eating unhealthy food too often).
- A story creator lets people write and share stories.
- Parts of stories can be proposed by users, voted on, and approved as new paths in existing stories.
- Very few users at launch. Cost must be near zero.
- A later scale plan includes advertising and merch.
- Interest in a RimWorld-style storyteller/director for dynamic stories, and eventually real LLM decisions and LLM content creation.
- New asks for this exploration: let bots play, produce Hugging Face datasets, leaderboards (highest voted stories, authors, most read).

---

## 2. What exists today in this repo

### 2.1 The PHP prototype

The repo is a 2013-era PHP prototype targeting GoDaddy shared hosting with MySQL.

- Flow: `intro.php` collects a name, `scene1.php` posts a radio choice to `index.php`, and `sceneselect.php` includes `scene<N>.php` by number. Scenes are hardcoded HTML.
- Stats: `player.php` declares level, health, strength, kindness as globals with setter/getter functions. Nothing persists. `statstab.php` renders them in the header.
- Sessions: `check_session.php` sets a cookie and does nothing else.
- Database: `connect.php`, `db.php`, `c`, `test.php`, and `player.php` open MySQL connections. None of the queries actually run.
- Design doc: `docs/Choose-your-own-adventure-rpg.md` is a pasted set of notes about RimWorld's AI (ThinkTrees, JobGivers, storyteller incident pools, GOAP contrast) plus an unrelated fragment about video generation and a line about letting non-paying users earn credits through contribution.

### 2.2 The starter story (source material for the seed content)

Extracted from `scene1.php` to `scene3.php`:

- Scene I: You arrive in a small town with $1500 and a blue Jansport backpack. Options: convenience store, hotel, unemployment office.
- Scene II (convenience store): hungry, choose Peanut M&Ms (Energy) or jerky (Health). This is the first meta-stat hook in the original design: food choices feed a diet meta stat.
- Scene III (hotel): a 4-star hotel for $90 or a hostel across the street for $45, or go to the unemployment office.

Implied stats from the prototype: level, health, strength, kindness, money (implicit from $1500 and prices), energy (from the M&Ms option).

### 2.3 Problems to resolve before any new work

- **Plaintext credentials are committed.** `connect.php`, `db.php`, `player.php`, `c`, and `test.php` contain database hostnames, usernames, and passwords, and `.connect.php.swp` is a Vim swap file with the same content. Rotate or confirm the accounts are dead, then purge from history or accept that the history is public. Recommendation for the RFC: archive the PHP prototype under `legacy/` or delete it, keep the story text, and add a `.gitignore` for swap files.
- No build, no tests, no data model, no persistence. Nothing here is reusable as code. The value is the story text and the stat concept.

---

## 3. What Binary-2048 built, and what transfers

Binary-2048 is a Next.js 15 App Router app on AWS Amplify `WEB_COMPUTE` (SSR + API routes as Lambda), with optional MongoDB Atlas and S3 persistence behind a store-selector env var, NextAuth (GitHub, Google), Stripe, AWS WAF, k6 load tests, Playwright, and a large ops script library.

### 3.1 Lessons that transfer directly

| Pattern | Where in Binary-2048 | Why it matters for the RPG |
|---|---|---|
| Store adapter with `memory` default and `mongo` option, selected by env | `lib/binary2048/leaderboard.ts`, `run-store.ts`, `rate-limit.ts`, `session-store.ts` | Lets the RPG run with zero infra locally and in early prod. Mongo store fails closed with a bounded `serverSelectionTimeoutMS` instead of hanging. |
| Deterministic seed + replay model | `engine.ts`, `replay-*.ts`, `docs/replay-storage-strategy.md` | A playthrough = (story version, seed, choice list). Reproducible, tiny to store, verifiable, and the natural training-data record. |
| Bot API with encoded state, legal actions, and action mask | `docs/bot-api-quickstart.md`, `app/api/games/[id]/encoded` | Same shape works for a story: `legalChoices`, `choiceMask`, encoded stats. |
| LLM adapter that ranks engine-computed candidates instead of simulating rules | `docs/ollama-bot.md`, `scripts/hf-bot.mjs` | For the RPG, the engine computes each choice's stat check result and deltas; the LLM only picks. This is also the safe shape for the storyteller. |
| Benchmark ledger and dataset export with JSONL + Parquet + SHA-256 + manifest | `docs/hf-benchmark-ledger.md`, `scripts/export-model-benchmark-dataset.mjs`, `scripts/export-runs-dataset.mjs` (`hyparquet-writer`) | Reuse the export tooling shape for Hugging Face datasets. Anonymize ids with a salted SHA-256 as `export-runs-dataset.mjs` does. |
| Consent classes for training data | `docs/ml-training-data-policy.md` | `operational_only`, `product_improvement`, `full_research`. The RPG adds an author license class for story text. |
| Rate-limit tiers, API keys hashed in env, WAF as backstop only | `docs/rate-limit-matrix.md`, `lib/binary2048/bot-api-key.ts` | Copy the tier table and the "unknown key does not create a quota identity" rule. |
| LLM safety policy and role isolation | `docs/llm-safety-and-agent-policy.md` | Untrusted story text must never control tools or moderation. Proposer, implementer, reviewer separation applies to LLM-generated story content. |
| Community voting rules | `docs/content-and-community-ops.md` | Rate-limited submissions, time-bounded windows, duplicate suppression, moderator override, winners are not auto-shipped. Directly reusable for path proposals. |
| Monetization posture | `docs/monetization-targets.md`, `ads-decision-and-format-policy.md`, `merch-and-swag-strategy.md`, `economy-and-rewards-policy.md` | Subscription/cosmetic first, rewarded opt-in ads only, external print-on-demand merch, append-only ledger before any value-bearing feature. |
| Bot vs human segmentation for leaderboards | `docs/bot-vs-human-segmentation.md` | Keep separate leaderboard namespaces for bots. |
| Cost guardrails | `docs/mongo-s3-cost-guardrails.md`, `prelaunch-cost-simulation.md`, `aws-budget-template.json` | Budget alarms at 50/80/100%, TTL on guest data, hard caps per endpoint. |

### 3.2 Lessons that do NOT transfer, or transfer with a warning

- **Amplify `WEB_COMPUTE` to Atlas connectivity failed in production.** Per `docs/v1-session-handoff-2026-09-24.md`, the first Mongo activation timed out as a CloudFront 504, and a retry with a 5 s bound returned a sanitized 503. Production leaderboards run in per-instance memory today. Root cause is unresolved and tied to Amplify having no stable egress IP (`docs/egress-architecture.md`). The proposed fix (NAT gateway, ~$32/month floor) contradicts the RPG's near-zero cost goal. **Do not adopt Amplify SSR + Atlas as the RPG default without resolving this first.**
- **Amplify `WEB_COMPUTE` bakes secrets into the server bundle** (`next.config.mjs` `env` block) because SSM-sourced vars do not reach the SSR Lambda. That is a workaround, not a pattern to copy.
- **Per-instance memory state is a real hazard on Amplify.** Binary-2048 needed browser recovery snapshots because requests land on different instances. A CYOA has the same problem for in-progress playthroughs. Either persist every choice or hold the full playthrough in the client and submit it at checkpoints.
- **Binary-2048's monthly cost target is $150.** That is the Amplify SSR + Atlas + observability shape. The RPG's stated goal is near zero, so the hosting shape must differ.
- **Compute profile differs.** Binary-2048 is compute-bound (simulations, tournaments, rollouts) and needs concurrency pools and heavy-route degrade switches. The RPG is content-bound and read-heavy. Story content is static per version and can live on a CDN. Only votes, playthrough submissions, and authoring are writes.
- **Replay verification is cheaper here.** No RNG-driven board; a playthrough is verifiable by re-walking the graph with the same seed. Anti-cheat matters far less than in a score leaderboard, because the leaderboards proposed are about stories and authors, not player scores.

---

## 4. Domain model exploration

### 4.1 Core entities

- **Story**: id, title, author, license, tags, content rating, current published version, status (draft, published, archived).
- **StoryVersion**: immutable snapshot of a story graph. Playthroughs and datasets reference a version, never a mutable story.
- **Node** (scene): id, title, body text (Markdown), optional storyteller hooks (allowIncidents, tensionWeight), ending flag and ending type.
- **Choice** (edge): id, from node, to node, label, requirements (stat checks), effects (stat deltas, flags), visibility rule (hidden vs shown-but-disabled when the check fails), optional roll (seeded RNG with success/failure targets).
- **PathProposal**: a user-authored subgraph (one or more nodes and choices) attached to an existing node of a published version. Has a voting window, vote tallies, moderation state, and on approval produces a new StoryVersion.
- **Vote**: voter, target (story or proposal), value, timestamp. One vote per identity per target; identity can be account or a signed guest token with weaker weight.
- **Playthrough**: player (or bot), story version, seed, ordered choice ids, stat snapshots at checkpoints, storyteller incidents that fired, final ending, timestamps, actor type (human, bot, llm-bot), consent class.
- **PlayerProfile** (per story or global): stats, meta stats, flags, unlocked endings.
- **Actor**: human account, guest, or bot API key. Bots carry a model id and version.

### 4.2 Stats, meta stats, and checks

Stats seen in the prototype: health, strength, kindness, level, money, energy. Suggested split:

- **Primary stats**: bounded 0 to 100 (health, strength, kindness, energy) plus money as an unbounded integer.
- **Meta stats**: rolling or cumulative counters that are not shown as primary but modify them. Examples: diet quality (junk meals in the last N meals), sleep debt, stress, reputation per faction. Meta stats produce **modifiers** applied to primary stats or to check difficulty (example: junk diet streak of 3 reduces max energy by 10 and adds +5 difficulty to strength checks).
- **Checks**: `stat >= threshold` (deterministic) or `roll(seed, stat, difficulty)` (seeded, reproducible). The RFC should decide whether deterministic checks are the default; they are simpler to author, easier for bots, and produce cleaner datasets. Seeded rolls can be an opt-in per choice.
- **Effects** are declarative data, not code. This keeps user-authored content safe and lets bots and the storyteller reason about consequences before choosing.

### 4.3 Story graph as data, not pages

The prototype hardcodes one PHP file per scene. The replacement is a JSON (or YAML for authors) graph document validated by a schema. One StoryVersion is one document. This makes stories static assets that can be served from a CDN, cached forever by version hash, and exported to Hugging Face as-is.

Suggested authoring format sketch:

```json
{
  "storyId": "new-town",
  "version": 3,
  "start": "arrive",
  "stats": { "health": 100, "strength": 10, "kindness": 10, "energy": 50, "money": 1500 },
  "nodes": {
    "arrive": {
      "text": "You are standing on a curb in a small town...",
      "choices": [
        { "id": "store", "label": "Convenience store", "to": "store" },
        { "id": "hotel", "label": "Hotel", "to": "hotel" },
        { "id": "jobs", "label": "Unemployment office", "to": "jobs", "requires": { "energy": { "gte": 20 } } }
      ]
    },
    "store": {
      "text": "You're hungry...",
      "choices": [
        { "id": "mnms", "label": "Peanut M&Ms", "to": "street", "effects": { "energy": 15, "money": -3, "meta.junkMeals": 1 } },
        { "id": "jerky", "label": "Jerky", "to": "street", "effects": { "health": 5, "money": -6, "meta.goodMeals": 1 } }
      ]
    }
  }
}
```

### 4.4 Versioning and merged community paths

Treat a story like a repository. Published versions are immutable. A PathProposal is a branch that attaches at a node. Approval creates a new version whose graph includes the proposal. Requirements to explore in the RFC:

- Attachment rules: proposals may add new choices to an existing node, or add a new node between existing ones. Editing existing text should be a separate, author-only flow.
- Author controls: the story author decides whether their story accepts proposals, and whether approval is by vote threshold, by author, or both.
- Voting window and threshold, minimum reads before voting opens, and anti-brigading (one vote per verified identity, guest votes weighted low or excluded).
- Moderation before publication: text safety scan, schema validation, reachability check (no dead ends unless flagged as an ending), stat sanity (no effect exceeding configured bounds).
- Attribution: every node records its author. Leaderboards for authors count nodes merged and reads through those nodes.

---

## 5. RimWorld-style storyteller for a CYOA

`docs/Choose-your-own-adventure-rpg.md` correctly summarizes RimWorld: pawns run a top-down ThinkTree (emergencies first, then priorities), and a separate Storyteller (Cassandra, Phoebe, Randy) runs a periodic loop that watches colony wealth and recent incident history and picks from a weighted pool of positive, neutral, and catastrophic incidents to hold a target tension curve. RimWorld deliberately avoids GOAP for performance and player predictability.

Mapping to this game:

### 5.1 Two layers, same as RimWorld

1. **Authored spine**: the story graph written by humans (and later LLMs). Deterministic. This is the ThinkTree's "work priorities" analogue: it is what the player asked for.
2. **Storyteller director**: runs between authored nodes at points the author marked as interstitial (`allowIncidents: true`). It inspects the player's state and recent history and may inject an **incident node** from a pool before continuing to the authored target.

### 5.2 Storyteller evaluation loop (per turn)

Evaluate top-down, first match wins, exactly like a ThinkTree:

1. **Emergencies**: health at 0 routes to the story's death or hospital node; money below 0 routes to a debt incident. Authors declare these fallback nodes per story, with global defaults.
2. **Meta-stat triggers**: junk diet streak, sleep debt, or stress crossing a threshold forces a themed incident (RimWorld's mental break analogue). These are the "meta stats affect stats" mechanic surfaced as narrative rather than only as hidden numbers.
3. **Pacing**: a storyteller profile with a tension curve. Tension rises with time since last incident and with player "wealth" (sum of stats and money, the RimWorld wealth analogue used to scale difficulty). Profiles to explore: Classic (rising then relief), Chill (rare, mostly positive), Random (uniform).
4. **Incident selection**: weighted draw from the pool filtered by story tags, current node tags, player state, and cooldowns. Seeded so it is reproducible from the playthrough record.
5. **Fallthrough**: no incident, continue to the authored target node.

### 5.3 Incident pool

Incidents are small authored subgraphs (one to three nodes) with tags (`town`, `travel`, `food`, `money`), prerequisites, weights per storyteller profile, and effects. They are shareable content like stories, so users can author them and the same vote-and-approve flow applies. Start with a global pool of about 20 to prove the loop.

### 5.4 Where LLMs enter, in order of risk

1. **Text variation** (lowest risk): given an incident template and the player state, rewrite the incident text for tone. Output goes through schema and safety validation. Cacheable per (incident, state bucket).
2. **Incident selection** (low risk): the engine computes the eligible incidents and their predicted effects; the LLM ranks them. Same pattern as Binary-2048's Ollama adapter ranking engine-computed candidate boards. Deterministic fallback when the model fails or times out (Binary-2048 `inference-gate.ts`).
3. **Incident generation** (medium risk): the LLM proposes new incident subgraphs as data. They enter the PathProposal queue like any user content and are voted and moderated. Never published directly.
4. **Free-form narration** (highest risk and cost): the LLM writes scenes on the fly. Defer. Cost scales per turn, results are not reproducible, and it breaks the dataset model. If explored, treat generated nodes as candidates that get frozen into a version.

Cost note: options 1 and 2 can run offline or on demand with small hosted models; Binary-2048 measured roughly $0.007 per hosted call on Hugging Face Inference Providers and about 1 s per decision for a local `qwen3:8b` on Apple Silicon. Batch and cache; do not put an LLM call on the hot path of every player turn at launch.

### 5.5 Playthrough chronicle

RimWorld generates "tales" from what happened. The RPG equivalent is a chronicle: an auto-generated summary of a playthrough (choices, incidents, stat arcs, ending). It is a shareable artifact, a natural marketing surface, and a labelled dataset row.

---

## 6. Bots playing the game

### 6.1 Why

- Content QA: reachability, dead ends, unreachable endings, stat-check impossibility, balance (how often does a random walker die at node X).
- Storyteller tuning: run thousands of seeded playthroughs per profile and inspect tension and death rates.
- Dataset generation: trajectories with states, legal choices, chosen choice, outcome.
- LLM benchmarking: which model reaches the "good" endings, survives, or maximizes a target stat under a fixed seed. This mirrors Binary-2048's seeded and curated tracks.
- Marketing: a "bring your own bot" story API is a differentiator, as it was for Binary-2048.

### 6.2 API shape (mirrors Binary-2048)

- `POST /api/playthroughs` with `{ storyId, version?, seed?, storyteller? }` returns an id and initial state.
- `GET /api/playthroughs/:id` returns node text, stats, meta stats, modifiers, `legalChoices`, `choiceMask`, and for each legal choice the engine-computed check result and predicted effects. Also a `stateHash` for optimistic concurrency.
- `POST /api/playthroughs/:id/choose` with `{ choiceId, stateHash }` returns the next state, any incident that fired, and `done` plus ending info.
- `GET /api/playthroughs/:id/export` returns the compact record: story version, seed, storyteller profile, choice ids, incident ids. Re-walkable and verifiable server-side.
- `GET /api/stories/:id/versions/:v` returns the full graph for offline bots. Bots can then run the engine locally. Publish the engine as a small npm package (and mirror in Python) so offline runs match server behavior.

Identity and limits: `x-api-key` with hashed keys in env, per-key quotas, IP fallback, `RateLimit-*` headers, `Retry-After`. Start with Binary-2048's tier table (guest 120, authed 600, paid 1800 per 5 minutes) and a low bot quota for playthrough creation.

### 6.3 Built-in bots

- Random walker (baseline, seeded).
- Greedy stat maximizer (picks the choice with best predicted delta on a target stat).
- Explorer (prefers unvisited edges, for coverage runs).
- LLM bot adapter (Ollama local and Hugging Face hosted) that receives the candidate list with predicted effects and returns a choice id via JSON-schema constrained output, with fallback to the greedy bot and a fallback counter. Copy the structure of `scripts/ollama-bot.mjs` and `scripts/hf-bot.mjs`.

### 6.4 Bot fairness

Bots never appear in human leaderboards. Bot playthroughs count toward "most read" only in a separate bot namespace (or not at all) or they will inflate author rankings. Store `actorType` on every playthrough and vote; bots cannot vote.

---

## 7. Hugging Face datasets

### 7.1 Candidate datasets

| Dataset | Rows | Primary use | Licensing dependency |
|---|---|---|---|
| Story graphs | one row per published StoryVersion (full JSON) | Interactive fiction generation, graph reasoning | Author must grant a redistribution license at publish time |
| Playthrough trajectories | one row per step: state, legal choices with predicted effects, chosen choice, actor type, outcome | Imitation learning, decision benchmarks | Player consent class; anonymized actor id |
| Path proposals with votes | proposal text and graph, vote counts, approval outcome, sibling proposals at the same node | Preference data (pairwise proposals at the same attachment node are DPO-shaped) | Author license and voter anonymity |
| Storyteller incident logs | state before, eligible incidents, selected incident, profile, tension value | Director model training | Same as trajectories |
| LLM bot benchmark ledger | per run: model, provider, seed, story version, ending, survival, tokens, latency, fallbacks, full decision trace | Model comparison, reproducible eval | None (bot-generated) |
| Chronicles | playthrough summary text paired with the trajectory | Summarization and narration training | Derived from trajectories |

### 7.2 Export shape

Reuse Binary-2048's shape: canonical JSONL per split, derived Parquet, SHA-256 checksums, `manifest.json` with schema version, a dataset card (README with license, consent classes, and fields), and `null` for anything not captured rather than a guessed value. Anonymize ids with a salted hash. Publish under a versioned repo on the Hub; never overwrite a published version.

### 7.3 Decisions needed before any export

- Author license on submission: recommend requiring CC BY 4.0 or CC BY-SA 4.0 for published stories and proposals, shown at submit time, with the option to opt out of dataset inclusion (story stays playable, excluded from export).
- Player consent class default. Recommend `product_improvement` for authenticated players with opt-out, `operational_only` for guests unless they opt in, per Binary-2048's policy shape.
- Minimum age and content rating; user-generated text in a public dataset needs a moderation gate before export, not only before publication.
- Deletion: exports must be regenerated without a user's rows on account deletion; already-published Hub versions cannot be changed retroactively, which the consent text must state.

---

## 8. Leaderboards

Requested: highest voted stories, authors, most read. All are aggregations over votes and playthroughs; none require anti-cheat at Binary-2048's level, but they do need anti-spam.

### 8.1 Boards and definitions

- **Top stories by votes**: net votes (up minus down) with a time-decayed variant ("trending") and an all-time variant. Consider a Wilson lower-bound or Bayesian average so a story with 2 votes does not outrank one with 200.
- **Top authors**: sum of story net votes plus merged-proposal votes, and reads through authored nodes. Separate "most merged contributions" board for people who mostly write paths into others' stories.
- **Most read**: distinct playthroughs started, distinct completed, completion rate, endings discovered. Humans only by default, bots in a separate namespace.
- **Optional later**: player boards per story (best ending reached, fewest turns) if the game wants competitive play. Not requested now.

### 8.2 Computation

At launch volume, compute on read with an index. As volume grows, materialize hourly with a scheduled job into a `leaderboard_snapshots` collection keyed by board and period, exactly the shape Binary-2048 uses for `leaderboard_entries` with a filter-sort index. Keep both paths behind a store adapter.

### 8.3 Anti-spam

- One vote per verified identity per target, votes on own content excluded.
- Reads count once per identity per story per day.
- Guest votes either excluded or weighted at 0.1 with a signed guest token.
- Rate limits on vote and playthrough-create endpoints.
- Author boards exclude self-reads.

---

## 9. Hosting and data architecture options (cost first)

Constraint: near-zero cost at launch, a credible path to scale. The owner has Amplify and Mongo experience.

### 9.1 Options

| Option | Shape | Est. monthly at launch | Notes |
|---|---|---|---|
| A. Amplify SSR (`WEB_COMPUTE`) + Atlas M0 | Same as Binary-2048 | $20 to $75 plus Atlas free tier | Known Amplify-to-Atlas connectivity failure in Binary-2048 prod; no stable egress; secrets baked into bundle. Highest cost floor of the options. Not recommended as the RPG default. |
| B. Static site (Amplify Hosting static or GitHub Pages) + Lambda function URLs or API Gateway HTTP + DynamoDB | AWS, serverless, IAM-authenticated data (no IP allowlists) | About $0 to $2 (Route 53 hosted zone $0.50 plus domain) | Always-free tiers: Lambda 1M requests, DynamoDB 25 GB and 25 RCU/WCU. Story JSON on S3/CloudFront. Avoids the Atlas egress problem entirely. Document model fits DynamoDB single-table if access patterns are designed up front. |
| C. Static site + Lambda + Atlas M0 | AWS compute, Mongo data | About $0 to $2 | Keeps Mongo familiarity. Lambda has the same no-fixed-IP issue unless in a VPC with NAT (~$32/month), so Atlas allowlist stays broad. Acceptable early with strong credentials, per Binary-2048's egress decision. |
| D. Cloudflare Pages + Workers + D1 (or KV) | Non-AWS, free tier generous | $0 | Best cost floor, global edge, no egress issue. Diverges from the owner's AWS tooling and from Amplify experience. |
| E. Next.js on Amplify static export + client-side engine + tiny API | Hybrid of A and B | About $0 to $2 | Keep Next.js and React but export statically; the story engine runs in the browser; the API is only for auth, votes, submissions, and playthrough checkpoints. |

### 9.2 Observations

- The story engine is small and deterministic. Running it in the browser removes almost all server compute and makes offline play and bot SDKs trivial. Server re-walks submitted playthroughs to verify them when they matter (leaderboard reads, datasets).
- Story content is immutable per version, so it is a perfect CDN asset. The only dynamic reads are leaderboards, proposal lists, and user profiles.
- DynamoDB removes the network-allowlist class of problems because authorization is IAM. Mongo keeps the document model the owner knows and the M0 tier is free. The RFC should weigh familiarity against the unresolved Atlas connectivity risk. If Mongo is chosen, the store adapter pattern from Binary-2048 with `memory` default keeps development free of any database.
- Auth: NextAuth with GitHub and Google worked for Binary-2048. For option B, Cognito is free to 10,000 monthly active users but is heavier to integrate; a JWT-based approach with GitHub or Google OAuth through a single Lambda is lighter. Guests need a signed anonymous token for playthrough continuity and low-weight votes.
- Search and discovery are out of scope for this document but will need a place (a simple tag index is enough early).

### 9.3 Recommended starting point for the RFC to evaluate

Option B or E: static front end, browser-side engine, serverless API, DynamoDB or Atlas M0 behind a store adapter, story versions as immutable JSON on S3 behind CloudFront. Add budget alarms at $5, $10, and $20 from day one using Binary-2048's `aws-budget-template.json` as a base. Reserve Amplify SSR for a later phase if server rendering becomes necessary for SEO of story pages (static pre-rendering of published stories covers most of that need).

---

## 10. Monetization path (from Binary-2048, adjusted)

- Phase 0 (launch): nothing. Keep costs at zero.
- Phase 1: optional supporter subscription (ad-free, cosmetic themes, author perks like more drafts or custom story art slots). No pay-to-win exists in a CYOA, so this is simpler than Binary-2048.
- Phase 2: rewarded, opt-in ads only, gated by Binary-2048's decision gate (net revenue at least $100/month and bounded retention impact). Consider ads only on interstitial pages, never mid-scene.
- Phase 3: external print-on-demand merch; stories or characters that win votes could become merch designs with author revenue share, which needs the append-only ledger from `economy-and-rewards-policy.md` first.
- Contribution credits: `docs/Choose-your-own-adventure-rpg.md` suggests non-paying users earn credits by writing, moderating, voting quality, and playtesting. This fits a credit ledger and is worth a section in the RFC.

---

## 11. Phasing sketch for the formal plan

1. **Engine and format**: story schema, validator, deterministic engine (TypeScript, browser and Node), stats and meta stats, checks and effects. Convert the starter story. Unit tests. No server.
2. **Play**: static site that loads a story version and plays it. Local save. Chronicle at the end.
3. **Accounts, persistence, submissions**: auth, playthrough checkpoint API, story publishing, versioning.
4. **Community paths**: proposals, voting windows, moderation queue, merge to new version, author attribution.
5. **Leaderboards**: votes, reads, authors, snapshots.
6. **Bots**: public playthrough API, API keys, built-in bots, coverage and balance reports.
7. **Storyteller**: incident pool, profiles, tension loop, meta-stat triggers, seeded reproducibility.
8. **Datasets**: consent and license capture, export tooling, dataset cards, first Hub publication.
9. **LLM**: text variation and incident ranking with cached, validated outputs; LLM bot benchmark ledger.
10. **Monetization**: only after retention data exists.

---

## 12. Open questions for the RFC session

1. Framework: keep Next.js for consistency with Binary-2048, or a lighter static stack (Vite + React) since SSR is not required?
2. Data store: DynamoDB (IAM, no allowlist) versus Atlas M0 (familiar, unresolved egress issue)?
3. Auth provider: NextAuth-style OAuth on a Lambda, Cognito, or a third-party free tier?
4. Are stat checks deterministic by default, with seeded rolls opt-in?
5. Who approves proposals: vote threshold, story author, moderators, or a combination configurable per story?
6. Required license for published user content (CC BY 4.0 versus CC BY-SA 4.0 versus CC0) and whether dataset inclusion is opt-in or opt-out.
7. Content rating and minimum age policy, and what moderation is automated at launch.
8. Should the engine be published as an npm package and a Python mirror for offline bots?
9. Guest votes: excluded, or low-weight with a signed token?
10. Do bot playthroughs ever count toward "most read"?
11. Storyteller scope for v1: meta-stat triggers only, or the full tension loop?
12. Which LLM provider path first: local Ollama for development, Hugging Face Inference Providers for hosted runs (Binary-2048's measured costs apply), or Claude via the API for higher-quality content generation?
13. Cost ceiling that triggers a stop: propose a hard $20/month alarm and a documented degrade switch.
14. What to do with the PHP prototype and committed credentials.

---

## 13. Reference index

Binary-2048 files worth opening when writing the RFC (paths relative to `../Binary-2048`):

- Architecture and cost: `docs/egress-architecture.md`, `docs/production-egress-decision.md`, `docs/v1-session-handoff-2026-09-24.md` (Mongo activation failure, lines 43 to 82), `docs/monetization-targets.md`, `docs/mongo-s3-cost-guardrails.md`, `docs/prelaunch-cost-simulation.md`, `docs/aws-budget-template.json`.
- Store adapters: `lib/binary2048/leaderboard.ts`, `lib/binary2048/run-store.ts`, `lib/binary2048/rate-limit.ts`, `lib/binary2048/replay-artifact-store.ts`.
- Bots and LLM: `docs/bot-api-quickstart.md`, `docs/ollama-bot.md`, `docs/hugging-face-benchmark-latest.md`, `docs/hf-benchmark-ledger.md`, `docs/curated-challenge-corpus.md`, `scripts/ollama-bot.mjs`, `scripts/hf-bot.mjs`, `lib/binary2048/inference-gate.ts`, `lib/binary2048/model-registry.ts`.
- Datasets: `docs/ml-training-data-policy.md`, `docs/ml-pipeline.md`, `scripts/export-runs-dataset.mjs`, `scripts/export-model-benchmark-dataset.mjs`.
- Policy: `docs/llm-safety-and-agent-policy.md`, `docs/content-and-community-ops.md`, `docs/economy-and-rewards-policy.md`, `docs/ads-decision-and-format-policy.md`, `docs/merch-and-swag-strategy.md`, `docs/bot-vs-human-segmentation.md`, `docs/rate-limit-matrix.md`.
- Ops: `.github/workflows/*.yml`, `docs/dev-environment.md`, `docs/github-pages.md` (static landing page pattern).

RimWorld references summarized in `docs/Choose-your-own-adventure-rpg.md`: ThinkTrees (top-down priority evaluation), JobGivers, Storyteller incident pools weighted by colony wealth and recent history, and the rationale for avoiding GOAP.
