# Element Balance Rules v1

Status: Draft v1.1
Last updated: March 6, 2026
Owner: Game Design + Engine

## 1) Purpose

This document defines the balance constraints for creating and tuning cards by element and tier.

Goals:
- Preserve clear element identity.
- Prevent runaway card packages from dominating all decks.
- Keep match outcomes skillful and varied under strong AI play.
- Make card tuning holistic (card-level), not decklist-only.

Non-goals:
- This is not a lore/style guide.
- This is not a one-time rebalance plan; it is a standing ruleset.

## 2) Evidence Base

Primary evidence:
- Full-matrix AI simulations use tree-search combat (attacker declarations + combat-aware heuristics).
- Tier-stratified matrix runs (apprentice/alchemist/archmage), `maxSteps=1000`.
- Card-signal extraction uses matchup-controlled regression (card presence deltas vs win-rate deltas).
- `aiActionPolicy.ts` prevents targetless-spell loops that inflate draw rates artificially.

Observed patterns:
- `Divine Light` tends to be the bottom deck across tiers (may shift as the shadow pool expands with Moon Coven).
- High-pressure packages dominate top decks (water/fire at low tiers, mixed air/fire-water at higher tiers).
- Apprentice energy cap of 6 (vs 5) increases draws without reducing spread meaningfully.
- Tree-search AI combat produces longer, more defensive games — draw rates are low and average turns are roughly double what heuristic-only AI produces.

Assumptions:
- Starter-deck matrix is a useful proxy for global health, but not a complete proxy for player-built ladder meta.
- Tree-search combat + strategy selection approximates high-skill play better than heuristic-only AI.
- Wide guardrail bands reflect the exploratory state of the AI combat strategy; bands should tighten as the meta stabilizes.

Confidence:
- High for directional trends.
- Medium for exact numeric thresholds (sample-size dependent).

Potential contradiction signals:
- Large custom-deck simulations that reverse card-signal polarity.
- Human telemetry showing strong divergence from AI matchup results.

## 3) Global Balance Targets (Simulation Gates)

Every balance PR that changes card stats/effects must pass these checks.

Test config:
- AI: tree-search combat (attacker declarations + combat-aware heuristics), strong preset, deterministic seeds.
- Matchup suite: full starter-deck matrix per tier.
- `maxSteps=1000`.
- Minimum sample: 6 games per matchup for fast PR gate; 12+ for full gate; 30+ for release candidate.
- CI: `.github/workflows/balance-gates.yml` (fast, every PR) and `balance-gates-full.yml` (extended).

Gate metrics:
- Draw-rate band by tier:
  - apprentice: 0% to 20%
  - alchemist: 0% to 15%
  - archmage: 0% to 15%
- Average turns:
  - apprentice: 18 to 45
  - alchemist: 25 to 55
  - archmage: 25 to 55
- Tier spread (top deck win rate - bottom deck win rate):
  - apprentice: <= 85 percentage points
  - alchemist: <= 80 percentage points
  - archmage: <= 90 percentage points
  - long-term target: tighten as the meta stabilizes
- Single PR regression cap:
  - no deck may move more than +/-6 percentage points without explicit intent and signoff.

## 4) Card-Signal Tuning Rules

We tune cards holistically using matchup-controlled card signals, not only deck outcomes.

Signal method:
- Use ridge-style regression on per-matchup card-count deltas vs decided win-rate deltas.
- Ignore cards that appear in fewer than 3 decks at that tier.

Intervention thresholds:
- Overpowered candidate:
  - coefficient >= +0.015 in 2+ tiers, and
  - appears in 4+ decks in at least one flagged tier.
- Underpowered candidate:
  - coefficient <= -0.015 in 2+ tiers, and
  - appears in 4+ decks in at least one flagged tier.
- If flagged in only one tier, prefer tier-appropriate support/tuning over immediate direct nerf.

Tuning size limits per patch (minor tuning policy):
- Stat change: +/-1 attack or +/-1 health (not both) per card.
- Cost change: +/-1 max.
- Effect magnitude: +/-1 damage/heal/draw step max.
- Keyword changes: one keyword add/remove max.
- Spell speed change: sorcery↔instant requires simulation (treat as a new-card-level change, not minor tuning).
- Surcharge change: +/-1 max per card.

## 5) Core Mechanics Evolution Policy

This section defines how core mechanics may change. It does not lock specific one-off design decisions.

### 5.1 Overlapping mechanics policy

When two mechanics overlap (for example, fixed sustain vs combat-linked sustain), choose between:
- keeping them distinct,
- partially converging them, or
- fully merging semantics.

Required decision criteria:
- Tier clarity: does the choice preserve meaningful tier differentiation?
- Counterplay: does the choice reduce or improve interactive play?
- Balance impact: does the choice worsen draw rate, spread, or game-length guardrails?
- Complexity cost: does the choice increase cognitive load beyond target audience comfort?

Required evidence before shipping a semantic change:
- A/B simulation in all tiers.
- Explicit before/after metric deltas against Section 3 guardrails.
- A rollback plan if spread or draw rates regress.

### 5.2 Tier scaffolding policy

Tier scaffolding parameters (for example: energy cap, damage persistence, keyword access, combat tricks) are considered part of the tier contract.

Change policy:
- Any scaffolding change requires a dedicated proposal and A/B simulation across all tiers.
- Card-level tuning is preferred before scaffolding changes unless card tuning cannot achieve the target.
- Scaffolding changes must be documented in release notes with rationale and measured impact.

## 6) Element Identity Rules

Each new card must reinforce its element and respect its forbidden strengths.

### Fire

Primary strengths:
- Burst damage, combat pressure, fast tempo.

Required tradeoffs:
- Lower sustain and lower raw card advantage.

Forbidden strengths:
- Efficient repeatable healing.
- Cheap unconditional draw packages.

Design constraints:
- If a fire card adds draw, it must pay via weaker stats, self-damage, or higher cost.

### Water

Primary strengths:
- Card flow, stabilization, durable tempo reset.

Required tradeoffs:
- Lower burst lethality.

Forbidden strengths:
- Too much cheap draw tempo with no board-cost tradeoff.

Design constraints:
- Draw-heavy cards at low cost must not also provide top-tier board pressure.

### Earth

Primary strengths:
- Durability, board staying power, scaling bodies.

Required tradeoffs:
- Slower tempo and weaker instant reach.

Forbidden strengths:
- Stalling forever without meaningful win conversion.

Design constraints:
- High-cost earth cards must either be above-rate in board impact or include reliable closing pressure.

### Air

Primary strengths:
- Tempo, repositioning, swift pressure, tactical disruption.

Required tradeoffs:
- Lower raw stat efficiency and lower unconditional removal.

Forbidden strengths:
- Pure delay tools with no path to conversion.

Design constraints:
- Tempo cards should advance pressure or card quality, not just reset board state.

### Shadow

Primary strengths:
- Removal, drain, high-risk efficiency.

Required tradeoffs:
- Self-damage, fragility, or setup costs.

Forbidden strengths:
- Premium removal plus premium board stats plus no downside.

Design constraints:
- Shadow power cards must carry a visible cost axis.

## 7) Creature Curve and Budget Heuristics

Use this as the first-pass budget before playtesting.

Current pool baseline (approx average total stats `attack + health`):
- Cost 1: ~3
- Cost 2: ~4 to 5
- Cost 3: ~6
- Cost 4: ~7
- Cost 5: ~9
- Cost 6: ~9 to 10

Budget adjustments:
- Premium upside keyword/effect (`draw`, `deathtouch`, high-impact removal rider): reduce baseline stats by ~1.
- Defensive/utility keyword (`armor`, small `heal` ETB): reduce by ~0 to 1 based on synergy.
- No-keyword vanilla card may sit up to +1 above baseline if it has no immediate value text.

Hard rule:
- Do not exceed baseline by >1 while also granting premium keyword/effect unless there is a compensating downside.

## 8) Spell Speed and Instant Surcharge Heuristics

Spells have a `spellSpeed` of `sorcery` (default) or `instant`. Instant spells can be cast during the `combat_priority` phase; sorcery spells cannot.

Combat priority is gated by the `allowCombatTricks` ruleset flag:
- **Apprentice / Alchemist** (`allowCombatTricks: false`): Combat resolves immediately after attackers/blockers. No priority windows. Instant spells exist in these decks but can only be cast during main phase at base cost — the `spellSpeed` tag has no mechanical effect.
- **Archmage** (`allowCombatTricks: true`): After attackers are confirmed and after blockers are confirmed, both players receive priority windows. Instant spells cast during priority go on a stack that resolves LIFO. Auto-pass skips the window when neither player has playable instants.

When cast during combat priority, instant spells pay their base cost plus an `instantSurcharge`. During main phase, instants cost their base rate — no surcharge. This creates a timing trade-off: cast early at base cost, or save for combat at a premium.

### Surcharge tiers

| Surcharge | Category | Examples |
|-----------|----------|----------|
| +0 | Utility / buffs | Blazing Speed, Growth, Blessing, Gust, Entangle, Forge Hammer, Primal Roar, Tidal Surge |
| +1 | Burn / targeted damage | Fireball, Lightning Bolt, Dark Bolt, Shadow Strike, Soul Siphon, Starlit Hex, Tar Pit |
| +2 | Hard removal (unconditional destroy) | Doom, Midnight Banish |

### Classification rules for new instant spells

- **+0**: The spell buffs a friendly creature, provides soft disruption (tap, bounce), or grants a keyword. It does not directly remove or damage enemy creatures.
- **+1**: The spell deals direct damage to enemy creatures or players. This includes drain effects.
- **+2**: The spell unconditionally destroys a creature regardless of stats.
- If a spell combines categories (e.g. damage + buff), use the higher surcharge tier.

### Hard rules

- Sorcery-speed spells do not pay surcharges (they cannot be cast during combat).
- A spell's base cost is balanced assuming main-phase timing. The surcharge is the premium for combat-trick flexibility.
- Do not create instant-speed spells with zero surcharge that deal damage or destroy creatures — this underprices combat interaction.

## 9) New Card PR Rubric (Required)

Every new card PR must answer all items:

1. Element fit:
- Which element identity strengths does this card reinforce?
- Which forbidden strengths does it avoid?

2. Tradeoff:
- What explicit cost/downside offsets this power?

3. Curve fit:
- Where is it on the cost/stat/effect budget curve?
- For spells: what is the spell speed? If instant, what surcharge tier and why (see Section 8)?

4. Tier impact:
- Apprentice, alchemist, archmage impact expectation (one sentence each).

5. Simulation deltas:
- Top/bottom deck shifts by tier.
- Draw-rate and avg-turn deltas by tier.
- Card-signal movement for related package cards.

6. Risk callout:
- What would indicate this card is overtuned within one week of testing?

## 10) Balance Iteration Workflow

Use this workflow for every balance pass:

1. Detect:
- Run the matrix suite and card-signal extraction.
- Identify outliers by threshold, not by anecdote.

2. Propose:
- Create a small patch set (minor tuning limits from Section 4).
- State expected direction for draw rate, spread, and weak-archetype recovery.

3. Validate:
- Re-run fast gate and full gate.
- Reject the patch if any tier fails guardrails or if spread worsens materially.

4. Stabilize:
- If metrics pass, retain patch and monitor custom-deck/human telemetry.
- If metrics fail, revert and test next minimal patch.

## 11) Change Control

When this document changes:
- Include sim evidence links/output in PR description.
- Mark each changed threshold as:
  - confirmed by simulation,
  - assumption requiring validation, or
  - speculative experiment.

Versioning:
- Semantic policy versioning: `vMAJOR.MINOR`.
- `MAJOR`: mechanic philosophy changes.
- `MINOR`: threshold/rubric updates without philosophy changes.
