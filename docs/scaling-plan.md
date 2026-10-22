# Scaling plan: rollout and what to do if the game goes viral

Date: 2026-10-21. Status: plan. Expected traffic is the owner, then friends, then the public at low volume ([plan.md section 1.1](plan.md#11-owner-decisions-2026-10-21)). This plan makes sure an unexpected spike costs little, keeps the game playable, and doesn't need a rewrite.

Free-tier limits and prices below were not re-verified for this document. Check each provider's current terms before choosing one, and record the date you checked.

## 1. The core idea: the cheapest design is also the one that survives a spike

Milestone 1 has no server. The game is static files on a CDN, the engine runs in the player's browser, and saves live in the browser. With that design:

- Each new player costs only a file download. There is no database, API, or login to overload.
- A CDN serves the same cached files to everyone, so 10 players and 100,000 players use the same setup.
- The only thing that grows with players is **bandwidth**, and text is small.

**Rough bandwidth per new player**, from the current build:

| Asset | Size (gzip) | Notes |
|---|---|---|
| App JavaScript | ~70 KB | React + engine + reader. Cached after the first visit. |
| One story file | ~10–50 KB | Text JSON. Cached forever per version. |
| Art (cover, portraits) | 50–300 KB each | Biggest variable. Depends on format and size. |

At about 0.5 MB per new player, 100,000 new players is roughly 50 GB. Most CDN free tiers handle that; some cap it. That's the main hosting risk, so section 3 picks the host with this in mind.

**What can actually break or cost money in a spike:** anything with a server or a per-use cost. That means account sync, votes and story submissions, image generation, LLM features, and analytics. Every one of these is planned for later, and each needs a limit and an off switch before it ships (section 5).

## 2. Rollout stages

| Stage | Who | What's live | Gate to move on |
|---|---|---|---|
| 0. Owner | You | Static reader, local saves, new-town story | All intended endings reachable; save/resume and story switching work; plays well on phone and keyboard. |
| 1. Friends | Invited links | Same, on the real host and domain | Friends finish a story without help; feedback collected; no data loss reports. |
| 2. Public, soft launch | Anyone with the link | Same, plus several stories | Section 6 checklist done; spike runbook (section 4) tested once. |
| 3. Public, with accounts | Anyone | Account sync, then community features | Each backend feature has quotas, cost alarms, and an off switch, and passes a load test at 10× expected traffic. |

Stages 0–2 don't need a backend. Going viral during them means more bandwidth, not new infrastructure.

## 3. Hosting choice: Cloudflare or AWS

Both can host this game. The deciding question is **what happens when traffic or usage goes past the free allowance**.

| | Cloudflare (Pages + Workers + D1) | AWS (S3 + CloudFront, later Lambda + DynamoDB) |
|---|---|---|
| Static site bandwidth | Static asset requests have historically been free and unmetered on Pages. | CloudFront's always-free tier has historically included a large monthly transfer allowance (on the order of 1 TB); beyond it you pay per GB. |
| Over the free limit | Free-plan Workers and D1 **stop serving** (requests fail) when daily limits are hit. Nothing is billed. | Usage **keeps working and is billed**. Budget alarms notify, possibly hours later; they don't stop spending. |
| Setup for a static site | Connect the GitHub repo, pick the build command. HTTPS and the CDN are automatic. | S3 bucket, CloudFront distribution with origin access control, ACM certificate in us-east-1, DNS (Route 53 hosted zone is about $0.50/month). More pieces, but well understood. |
| Backend later | Workers (JavaScript at the edge) and D1 (SQLite). Smaller ecosystem; D1 limits need graceful degradation. | Lambda, DynamoDB, Cognito, SES. Largest ecosystem; you already have Binary-2048 code and budget templates. |
| Your experience | New platform to learn. | Familiar from Binary-2048. |
| Lock-in | Low for the static site. Workers code is mostly portable JavaScript. | Low for the static site. DynamoDB data models are AWS-specific. |

**Binary-2048's AWS trouble doesn't apply here.** Its problems came from Amplify server rendering talking to MongoDB Atlas (no stable outbound IP, secrets baked into the bundle). A static site on S3 + CloudFront has none of those parts.

**Recommendation:** Cloudflare Pages for the static game, because a viral spike can't turn into a surprise bill and setup is a few clicks. Choose AWS instead if you'd rather stay on a platform you know and plan to build the backend on Lambda + DynamoDB. In that case, add the hard limits from section 5 (rate limits, quotas, off switches) before any backend goes live, since AWS won't stop spending for you.

Either way:

- **Buy a custom domain early** and point it at the host. If you change hosts, you move the files and update DNS, and players' links still work.
- **Saves are tied to the domain.** Browser storage belongs to one origin, so changing domains loses local saves. Settle the domain before the public stages. Save export/import is already in the game for recovery.
- GitHub Pages is fine for stages 0–1 if you want zero setup, but it has a soft bandwidth limit and terms that discourage commercial use.

### 3.1 Prepare hosting now, turn services on later

Yes, both platforms support setting everything up ahead of time with optional services off, at little or no cost while idle.

**Now (stages 0–1):**

1. Register the domain and set up DNS.
2. Deploy the static site from `main` (or a release branch) with preview deploys for other branches. Cloudflare Pages and AWS Amplify Hosting (static mode, not server rendering) both build from GitHub; for plain S3 + CloudFront, use a GitHub Actions workflow.
3. Set long cache headers for `/assets/*` (hashed filenames) and short ones for `index.html`.
4. Add `public/config.json` with every future service listed and set to off, for example `{ "accountSync": false, "submissions": false, "voting": false, "artGeneration": false, "llm": false, "readOnly": false }`. The app reads it at startup and hides anything that's off. Changing a switch is a redeploy of one file, with no rebuild of the game.
5. AWS only: create the budget alarms ($5, $10, $20) from Binary-2048's `aws-budget-template.json` now.

**Defined but not deployed (stage 3 prep):** keep backend infrastructure as code in the repo (`infra/`): Wrangler config for Workers + D1, or AWS CDK/Terraform for Lambda + DynamoDB. Deploy it to a staging environment when a feature is ready, and leave the production switch off until the feature passes its gate in section 2.

**Why not deploy idle backend services to production early:** on-demand Lambda, DynamoDB, Workers, and D1 cost little or nothing when idle, so cost isn't the issue. The issues are attack surface and upkeep. An endpoint that exists can be found and abused even if the app never calls it, and idle infrastructure still needs dependency and permission updates. Turning a feature on should be "deploy the stack, then flip the switch", both rehearsed in staging.

## 4. Spike runbook (what to do when traffic jumps)

**Detect.**
- Turn on the host's built-in analytics (requests, bandwidth). Set an alert at, for example, 5× normal daily traffic if the host supports it.
- Watch for mentions (Reddit, social posts) if you post the game somewhere public.

**Static-only stages (0–2):**
1. Check bandwidth against the free tier. If it's close, compress images harder or swap to smaller versions. Text and JS barely matter.
2. Confirm caching works: hashed asset files and versioned story files should be cached for a long time, so repeat visits cost almost nothing.
3. If the host still can't keep up, move to the recommended CDN host and update DNS. The build output is just files.
4. Put a supporter/donation link on the landing page early, so a spike can pay for itself if needed.

**Stages with a backend (3+):**
1. **Degrade before failing.** Each server feature has an off switch in a static `config.json` that the app reads at load time. The order to turn things off is LLM/image features, then submissions and votes, then account sync. Reading and local saves always keep working.
2. **Read-only mode:** one switch that disables all writes and shows "community features are paused" while the game stays playable.
3. Raise quotas only after checking the cost per extra user. Budget alarms are notifications, not caps ([review section 6](modernization-review.md#near-zero-is-a-target-with-conditions)), so the off switches and hard quotas are what actually limit spending.
4. Afterwards, write down what broke and what it cost, and set new limits from real numbers.

## 5. Design rules to follow now so scaling stays easy

1. **Engine in the browser, saves in the browser** for as long as possible. Server saves (when they arrive) store the choice history and replay it with the engine, which is small and checkable.
2. **Story files are immutable and versioned**, with the version in the URL or filename. That lets the CDN cache them forever, and a run always loads the exact version it was saved against.
3. **No server rendering.** A static build means no per-request compute.
4. **Pre-generated, compressed art only.** Stat-lab's Ollama + ComfyUI generation runs on your machine and cannot serve the public. If players ever generate art, it needs a queue, a per-user daily quota, a hosted model with a known per-image cost, and probably payment or credits.
5. **Every backend feature ships with:** a rate limit per user and per IP, a hard quota, a cost estimate per 1,000 users, a budget alarm, and an off switch.
6. **Community writes are moderated by default.** A viral moment brings spam and bad actors as well as players. Submissions start closed or invite-only, with a moderation queue, and open up only when you can review the volume.
7. **Accounts use a managed auth provider.** Check its free monthly-active-user limit and what happens when you go over before choosing one.
8. **Analytics stay light**: host-level stats or a privacy-friendly counter, not a per-event backend you have to pay for and scale.

## 6. Checklist before the public soft launch (stage 2)

- [ ] Custom domain on the chosen CDN host, HTTPS on.
- [ ] Long cache headers on hashed assets and versioned story files; short cache on `index.html` and `config.json`.
- [ ] Images resized and compressed (WebP/AVIF), lazy-loaded, with a total size budget per story.
- [ ] Save export/import works, so players can recover from cleared storage or a domain change.
- [ ] Host analytics and a traffic or bandwidth alert are on.
- [ ] `public/config.json` feature switches exist (section 3.1), even if only for future features.
- [ ] Supporter/donation link and a simple "about / contact" page.
- [ ] Error reporting that doesn't need a server you run (or none, plus a feedback link).
- [ ] One rehearsal: simulate the runbook (check bandwidth numbers, flip a switch, redeploy) and time it.

## 7. Open items

- Pick the host (Cloudflare Pages recommended; AWS if you prefer the familiar platform) and buy the domain. Verify current free-tier terms and record the date.
- Set a monthly spending ceiling that triggers read-only mode once a backend exists ([plan question 13](plan.md#12-open-questions-for-the-rfc-session) proposes $20).
- Decide whether a spike should trigger fundraising (supporter link) or just cost control.
