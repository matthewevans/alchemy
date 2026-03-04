# Learning Mechanics Research Reference (v2)

Status: Active reference  
Date: March 4, 2026  
Owner: Gameplay + Learning Systems

## 1) Purpose

This document captures the supporting research and implementation rationale for Alchemy's learning challenge system so future design work can reference a stable source of truth without re-running discovery research.

Scope includes:
- What challenge types exist right now.
- How challenge frequency/selection/leveling works.
- Where the word lists, picture vocab, and math templates come from.
- Which evidence sources informed the current design.
- How to extend to higher levels (e.g., multiplication/division, harder words) while staying evidence-aligned.

Out of scope:
- In-game UX copywriting and animation polish details.
- Full curriculum design for external classroom use.

---

## 2) Current Mechanics (Code-Confirmed)

Evidence source: code inspection of `src/engine/*`, `src/learning/*`, `src/game/*`, and `src/components/ui/LearningChallengeOverlay.tsx`.

### 2.1 Challenge lifecycle

Facts (confirmed):
- Learning challenges are first-class engine state (`phase.type = 'learning'`) with typed prompt/reward/resume action.
- Challenge can be started via `START_LEARNING_CHALLENGE`, resolved via `ANSWER_LEARNING_CHALLENGE` or `SKIP_LEARNING_CHALLENGE`.
- On resolution, engine resumes the suspended gameplay action (`ADVANCE_PHASE`, `CONFIRM_ATTACKERS`, `CONFIRM_BLOCKERS`, `CONFIRM_BLOCKER_ORDER`).
- Reward is applied only on correct answer.
- Reward is always temporary (until end of turn), because it modifies existing temporary stat bonus fields.

Primary files:
- `src/engine/types.ts`
- `src/engine/reducer.ts`
- `src/engine/validation.ts`

### 2.2 Trigger points and cadence

Facts (confirmed):
- Challenges are intercepted only at combat confirmation gates:
  - `CONFIRM_ATTACKERS`
  - `CONFIRM_BLOCKERS`
- Interception occurs in `dispatchWithAnimations` before normal dispatch.
- Challenges only trigger for the local human player (not AI).
- Frequency uses opportunity counters per game session:
  - `low`: every 4th opportunity
  - `medium`: every 2nd opportunity
  - `high`: every opportunity

Primary files:
- `src/game/dispatchWithAnimations.ts`
- `src/game/learningStore.ts`
- `src/learning/config.ts`

### 2.3 Reward semantics

Facts (confirmed):
- On attack confirm challenge: reward targets first tentative attacker, `+1 ATK / +0 HP`.
- On block confirm challenge: reward targets first tentative blocker, `+0 ATK / +1 HP`.
- Engine validation enforces reward target ownership and non-zero reward.

Primary files:
- `src/learning/policy.ts`
- `src/engine/validation.ts`

### 2.4 Answer feedback behavior

Facts (confirmed):
- UI shows explicit reward target and stat gain before answering.
- On answer click, selected option shows correct/incorrect state.
- Dispatch of answer action is delayed by 3000 ms to allow visible feedback.

Primary files:
- `src/components/ui/LearningChallengeOverlay.tsx`
- `src/components/ui/LearningChallengeOverlay.test.tsx`

---

## 3) Challenge Types and Levels

## 3.1 Challenge types in production

1. `missing_letter` (reading)
- Prompt shape: `Pick the missing letter: w_rd`
- Options: 4 letters
- Correctness constraint: generator attempts to ensure the masked pattern has a unique valid completion inside the level word bank.

2. `word_to_picture` (reading)
- Prompt shape: `Pick the picture for: word`
- Options: 4 images (1 target + 3 distractors), pulled from internal vocab-to-asset mappings.

3. `addition`, `subtraction`, `multiplication`, and `division` (math)
- Prompt shape: arithmetic expression with unknown or direct equation.
- Options: 4 numeric choices.

Primary files:
- `src/learning/content.ts`
- `src/learning/readingCurriculum.ts`
- `src/learning/mathCurriculum.ts`

## 3.2 Reading levels currently implemented

Facts (confirmed from code):

| Level | Focus | Missing-letter entries | Unique entries | Picture vocab entries | Mixed mode picture rate |
|---|---|---:|---:|---:|---:|
| `r0` | CVC basics / early decoding | 70 | 70 | 10 | 20% |
| `r1` | Digraphs + blends | 70 | 70 | 10 | 25% |
| `r2` | Long vowels, teams, rimes | 70 | 66 | 10 | 30% |
| `r3` | Multisyllabic + morphology-flavored forms | 70 | 70 | 10 | 35% |
| `r4` | Prefix/suffix patterns + longer multisyllable words | 70 | 70 | 10 | 40% |
| `r5` | Morphology-rich, academic, and domain vocabulary | 70 | 70 | 10 | 45% |

Data origin (confirmed):
- Word lists are manually curated in `READING_CURRICULUM`.
- Picture vocab maps directly to existing in-game card/avatar assets (no external image corpus dependency).

Primary file:
- `src/learning/readingCurriculum.ts`

## 3.3 Math levels currently implemented

Facts (confirmed from code):

| Level | Focus | Answer bounds | Template families |
|---|---|---:|---|
| `m0` | Add/sub within 5 | 0..5 | add-within-5, plus-one, minus-one |
| `m1` | Add/sub within 10 + make-10 strategy | 0..10 | add-within-10, subtract-within-10, make-ten missing addend, doubles |
| `m2` | Add/sub within 20 + bridge/near-doubles | 0..20 | add-within-20, subtract-within-20, bridge-ten, missing addend, near-doubles |
| `m3` | Early 2-digit strategy work | 0..50 | 2-digit ± 1-digit, near tens, across-ten subtraction, missing addend |
| `m4` | Multiplication/division fact families within 100 | 0..100 | multiply facts, divide facts, missing factor, missing divisor |
| `m5` | Two-digit × one-digit and one-digit divisors | 0..200 | 2-digit × 1-digit, integer division, missing factor/divisor |

Primary file:
- `src/learning/mathCurriculum.ts`

## 3.4 Prompt mix weighting

Facts (confirmed):
- Type selection is weighted, not fixed alternation.
- Current persisted defaults:
  - reading missing-letter weight: `5`
  - word-picture weight: `3`
  - math weight: `5`
- Weight range is clamped to `0..10`.
- Setting a weight to `0` effectively disables that bucket, even if domain toggle is on.

Primary files:
- `src/game/preferencesStore.ts`
- `src/learning/policy.ts`
- `src/components/ui/settings/LearningSettings.tsx`

---

## 4) Data Provenance and Trust Model

## 4.1 Provenance summary

1. Engine mechanics provenance
- Source: internal code.
- Confidence: high.
- Verification: unit tests in engine/policy/content/UI test files.

2. Reading content provenance
- Source: internal curated word banks and image vocab mappings.
- Alignment source: foundational reading research + standards progression (see Section 5).
- Confidence: medium-high for alignment, high for implementation fidelity.

3. Math content provenance
- Source: internal template definitions aligned to grade-band standards and intervention guidance.
- Confidence: medium-high for alignment, high for implementation fidelity.

## 4.2 What is fact vs assumption

Facts (confirmed):
- The challenge logic, reward logic, and level definitions described in Sections 2-3 are implemented now.

Assumptions (explicit):
- Alignment to evidence-based progression increases probability of real skill growth.
- In-game challenge frequency + immediate corrective feedback improves retention while preserving flow.

Potential contradiction signals:
- Child progress probes show no measurable gains over 4-8 weeks.
- Engagement drop-off (skip rates spike, session length declines) at higher frequencies.
- Error clustering suggests distractor quality mismatch by level.

---

## 5) Research Basis and Why It Maps to Current Design

## 5.1 Foundational reading progression (K-3)

Claim:
- Early reading challenges should follow explicit, systematic progression from basic decoding to more complex word analysis.

Evidence sources:
- National Reading Panel (2000): systematic phonics supports early word reading outcomes.
- WWC Foundational Skills K-3 (2016, revised 2019): evidence-based recommendations for phonological awareness, phonics/word recognition, and connected text reading.
- CCSS RF progression (K-3): moves from letter-sound/CVC into broader decoding skill demands.

Current mapping:
- `r0 -> r5` ordering in reading curriculum.
- Missing-letter tasks emphasize decoding patterns; word-to-picture supports lexical meaning mapping.

Confidence: medium-high.

## 5.2 Intermediate/advanced decoding and multisyllabic words

Claim:
- Harder reading levels should explicitly include multisyllabic decoding and morphology-aware patterns.

Evidence sources:
- CCSS RF.3.3.c: decode multisyllable words.
- CCSS RF.4.3 and RF.5.3: combine phonics, syllabication, and morphology for unfamiliar words.
- WWC Providing Reading Interventions (Grades 4-9, 2022): strong evidence recommendation to build decoding for complex multisyllabic words.
- Goodwin & Ahn (2010): morphological interventions show positive literacy effects for struggling readers.

Current mapping:
- `r3-r5` include longer multisyllable words, explicit affix patterns, and domain vocabulary growth.

Confidence: medium.

## 5.3 Arithmetic fluency and strategy progression

Claim:
- Math prompts should progress from within-5/10 fluency to within-20 strategy, then multiplication/division fluency and early multi-digit operations.

Evidence sources:
- CCSS K.OA, 1.OA.C.6, 2.OA.B.2, 3.OA, 4.NBT.B.
- WWC Math Intervention (Elementary, 2021): strong evidence for systematic instruction and fluency-building timed activities.

Current mapping:
- `m0 -> m5` template progression and answer bounds.

Confidence: medium-high.

## 5.4 Retrieval practice, feedback, and spacing

Claim:
- Frequent low-stakes retrieval with corrective feedback and spacing improves long-term retention.

Evidence sources:
- Roediger & Karpicke (2006): testing effect improves delayed retention over restudy.
- Butler & Roediger (2008): feedback strengthens positive effects of multiple-choice and reduces lure-related harms.
- Cepeda et al. (2006): distributed practice has robust retention benefits; interval matters relative to retention horizon.

Current mapping:
- Challenges appear at spaced combat checkpoints.
- Immediate answer feedback is shown before resolving gameplay.
- Frequency settings (`low/medium/high`) act as spacing controls.

Confidence: medium-high.

---

## 6) Implemented Higher Levels (Science-Aligned)

The following levels are now implemented in production code and can be used immediately.

## 6.1 Implemented math levels

### `m4` (Grade 3 bridge): multiplication/division within 100

Standards anchor:
- CCSS 3.OA.A-C (especially 3.OA.C.7 fluency within 100).

Implemented template families:
- Basic multiplication facts: `a × b = ?`
- Basic division facts: `ab ÷ a = ?`
- Missing factor: `a × ? = ab`
- Missing divisor: `ab ÷ ? = b`

Implementation notes:
- Answer bounds: `0..100`
- Distractor deltas widened for fact-family confusions (`±1, ±2, ±3, ±4, ±6, ±8, ±10, ±12`)

### `m5` (Grade 4 bridge): two-digit x one-digit and one-digit divisors

Standards anchor:
- CCSS 4.NBT.B.5, CCSS 4.NBT.B.6.

Implemented template families:
- Two-digit by one-digit multiplication: `34 × 3 = ?`
- Exact one-digit divisor division: `144 ÷ 6 = ?`
- Missing factor with larger products: `? × 7 = 140`
- Missing divisor with two-digit quotient: `168 ÷ ? = 24`

Implementation notes:
- Answer bounds: `0..200`
- Distractor deltas widened for near/far alternatives (`±1..±20` curated set)

## 6.2 Implemented reading levels

### `r4` (Grade 3-4 bridge): multisyllabic + affix patterns

Standards anchor:
- CCSS RF.3.3.c, RF.4.3.

Implemented content profile:
- 70-word missing-letter bank emphasizing:
  - multisyllable decoding (`volcano`, `adventure`, `calendar`)
  - prefix/suffix families (`preview`, `misread`, `uncover`, `happiness`, `agreement`)
  - derivational/adverbial patterns (`carefully`, `brightly`, `quietly`)
- 10-item picture vocab mapped to existing game assets with longer target words.

### `r5` (Grade 4-5 bridge): morphology-rich and academic/domain vocabulary

Standards anchor:
- CCSS RF.4.3, RF.5.3 and WWC Grades 4-9 decoding guidance.

Implemented content profile:
- 70-word missing-letter bank emphasizing:
  - derivational morphology (`construction`, `prediction`, `transformation`)
  - advanced academic vocabulary (`knowledge`, `observation`, `perimeter`, `quadrilateral`)
  - science/social studies vocabulary (`ecosystem`, `migration`, `population`)
- 10-item picture vocab mapped to advanced card/avatar words (`archangel`, `leviathan`, `stegosaurus`, etc.).

## 6.3 Data source notes for r4/r5 and m4/m5

Facts (confirmed):
- The concrete level banks and templates are authored in:
  - `src/learning/readingCurriculum.ts`
  - `src/learning/mathCurriculum.ts`
- New levels were generated by extending the same existing pipeline:
  - deterministic prompt generation
  - unique missing-letter completion guard
  - bounded 4-option distractor generation

Assumptions (explicit):
- Word selection aligns to standards-aligned skill bands but is not imported from a licensed external word-list corpus.
- For formal efficacy reporting, external benchmark probes should still be used.

## 6.4 Non-negotiable extension rules

1. Keep one clearly correct answer for each prompt.
2. Maintain deterministic generation path for reproducibility/debugging.
3. Keep level scope tight (avoid mixing too many new constructs in one level).
4. Add tests for ambiguity, answer inclusion, and deterministic generation for each new level.
5. Update this doc with provenance/source links whenever new level families are added.

---

## 7) Validation and Measurement Plan (for “does this help my child?”)

Recommended minimum measurement loop:

1. Baseline probe (5 minutes each domain)
- Reading: 10 decoding items at configured level.
- Math: 10 arithmetic items at configured level.

2. In-game exposure tracking
- Challenge attempts, correct rate, skip rate, response latency.

3. Weekly probe
- Re-test with novel but level-matched items.

4. Success criteria (example)
- Reading: +15-20% accuracy in 4 weeks with stable or lower latency.
- Math: +15-20% accuracy in 4 weeks with stable or lower latency.
- Engagement: skip rate not increasing week-over-week.

Note:
- These thresholds are implementation heuristics, not externally validated benchmarks.

---

## 8) Source Index (Primary References)

Reading foundations and progression:
- National Reading Panel (2000), *Teaching Children to Read*  
  https://www.nichd.nih.gov/sites/default/files/publications/pubs/nrp/Documents/report.pdf
- WWC Practice Guide, *Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade* (2016; revised 2019)  
  https://ies.ed.gov/ncee/WWC/PracticeGuide/21/Published
- CCSS ELA Foundational Skills:
  - K RF.3: https://www.thecorestandards.org/ELA-Literacy/RF/K/3/
  - 1 RF.3: https://www.thecorestandards.org/ELA-Literacy/RF/1/3/
  - 2 RF.3: https://www.thecorestandards.org/ELA-Literacy/RF/2/3/
  - 3 RF.3.c: https://www.thecorestandards.org/ELA-Literacy/RF/3/3/c/
  - 4 RF.3: https://www.thecorestandards.org/ELA-Literacy/RF/4/3/
  - 5 RF.3: https://www.thecorestandards.org/ELA-Literacy/RF/5/3/
- Goodwin, A. P., & Ahn, S. (2010), *A meta-analysis of morphological interventions*  
  https://pubmed.ncbi.nlm.nih.gov/20799003/

Math progression and intervention:
- CCSS Math:
  - K.OA: https://www.thecorestandards.org/Math/Content/K/OA/
  - 1.OA.C.6: https://www.thecorestandards.org/Math/Content/1/OA/C/6/
  - 2.OA.B.2: https://www.thecorestandards.org/Math/Content/2/OA/B/2/
  - 3.OA: https://www.thecorestandards.org/Math/Content/3/OA/
  - 4.NBT: https://www.thecorestandards.org/Math/Content/4/NBT/
- WWC Practice Guide, *Assisting Students Struggling with Mathematics: Intervention in the Elementary Grades* (2021)  
  https://ies.ed.gov/ncee/wwc/PracticeGuide/26

Learning science for challenge cadence and feedback:
- Roediger, H. L., & Karpicke, J. D. (2006), *Test-enhanced learning*  
  https://pubmed.ncbi.nlm.nih.gov/16507066/
- Butler, A. C., & Roediger, H. L. (2008), *Feedback enhances... multiple-choice testing*  
  https://pubmed.ncbi.nlm.nih.gov/18491500/
- Cepeda, N. J., et al. (2006), *Distributed practice in verbal recall tasks*  
  https://pubmed.ncbi.nlm.nih.gov/16719566/

---

## 9) Quick “If We Add Levels Tomorrow” Checklist

1. Add level enum and settings UI option.
2. Add level curriculum/templates in `src/learning/readingCurriculum.ts` or `src/learning/mathCurriculum.ts`.
3. Add ambiguity tests and deterministic generation tests.
4. Add doc update in this file: level definition + standards references + provenance note.
5. Run `pnpm test`, `pnpm lint`, `pnpm build` before merge.
