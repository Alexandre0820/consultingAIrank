---
name: ai-consulting-weekly-refresh
description: Refresh the AI consulting action leaderboard by researching the past week's net-new public AI signals for each ranked consulting firm, updating the JSON dataset, and summarizing ranking changes. Use when maintaining the AI咨询行动榜 weekly.
---

# AI Consulting Weekly Refresh

Use this skill when the task is to update the weekly AI consulting leaderboard in this repo.

## Scope

Work inside:

- `data/ai-consulting-leaderboard.json`
- `SCORING_MODEL.md`
- `DATA_SCHEMA.md`
- `static/app.js`

The site is static HTML. In most weekly refreshes, updating the JSON is enough for the page to change.

## Workflow

1. Read `data/ai-consulting-leaderboard.json` and note:
   - `meta.updated_at`
   - company list
   - existing event titles and URLs
2. Research each ranked company for the last 7 days of AI-related public signals.
3. Only add net-new items:
   - published later than the previous `meta.updated_at`
   - not already present in the dataset by title or URL
4. Prefer evidence in this order:
   - company official
   - partner / vendor official
   - mainstream or industry media
5. Add only signals relevant to AI action, such as:
   - partnerships
   - launches / platforms / agent frameworks
   - research reports or AI barometers
   - hiring / organization moves
   - customer proof
   - governance / risk moves
6. Update `meta.updated_at` to the new refresh date and revise `meta.method_note` if the weekly method changed.
7. Recompute ranking outcomes using the existing logic in `static/app.js` or an equivalent local script.
8. Summarize:
   - new additions by company
   - top movers in action ranking
   - any firms with no credible new public AI signal this week

## Research Rules

- If Tavily is available, use Tavily first.
- For weekly refreshes, the source publication date is enough; full cross-verification is optional unless accuracy looks shaky.
- Do not re-add an old event just because a newer article references it.
- If a new media article is only a follow-on mention of a report already in the library, score it lower than the original report.

## Event Writing Rules

Each added event should include:

- `date` in `YYYY-MM-DD` when available
- `type`
- `title`
- `summary`
- `url`
- `source_level`
- `confidence`

Add `discovery_channel`, `verification_status`, and `dimension_tags` when you have enough signal.

Keep summaries concise and analytical. Write what the event says about the firm's AI posture, not just what happened.

## Event Type Heuristics

- `partnership`: ecosystem, vendor, alliance, deployment tie-up
- `platform`: agent network, operating system, internal platform, productized framework
- `research`: report, survey, barometer, index, published point of view
- `organization`: hiring, team build-out, leadership, workforce program
- `client_proof`: deployment outcomes, customer case, measurable impact
- `governance`: trust, monitoring, risk, compliance, lifecycle controls
- `investment`: M&A, venture investment, strategic capital move

## Weekly Ranking Heuristic

Use conservative event scores.

- 85–92: strong new official signal with clear platform, delivery, or client value meaning
- 74–84: meaningful new signal, but narrower scope or media-sourced
- 60–73: useful watch item or secondary evidence

Do not inflate scores just to force rank movement.

## Deliverable Shape

After updating the dataset:

1. report the refreshed action ranking
2. note major movers and why
3. call out evidence gaps or low-confidence additions

