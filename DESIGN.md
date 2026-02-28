# Alchemy: Game Design Document

A simplified MTG-style card game for kids aged 6-10, built with React/TypeScript/Vite.

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Core Mechanics](#2-core-mechanics)
3. [Turn Structure](#3-turn-structure)
4. [Card Design](#4-card-design)
5. [Card Set](#5-card-set)
6. [UI/UX Design Patterns](#6-uiux-design-patterns)
7. [Technical Architecture](#7-technical-architecture)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Game Overview

**Alchemy** is a 1v1 card battle game designed for children aged 6-10. Players summon creatures and cast spells using energy to reduce their opponent's health from 20 to 0. The game borrows heavily from MTG Arena's interaction design while simplifying mechanics, enlarging touch targets, and removing complexity that would frustrate younger players.

### Design Pillars

- **Accessible**: Big cards, clear icons, minimal text, forgiving interactions
- **Fast**: Games last 5-10 minutes with simplified turn phases
- **Tactile**: Satisfying drag-and-drop, punchy animations, audio feedback
- **Fair**: Smoothed opening hands and auto-energy remove mana screw entirely
- **Social**: Local play first, LAN multiplayer from day 1

---

## 2. Core Mechanics

### Win Condition

Reduce the opponent's health from **20 to 0**.

### Energy System

- Players gain **+1 max energy per turn**, capped at **5**
- Energy **fully refills** at the start of each turn
- No land cards, no color restrictions — energy is automatic
- This eliminates mana screw/flood, the #1 source of frustration in MTG

### Elements

Five elements arranged in a color wheel, inspired by MTG's color pie philosophy. Each element has a distinct mechanical identity and personality. **Energy is generic** — any energy plays any card. Color identity comes through deckbuilding choices and card design, not casting restrictions.

#### The 5 Elements

| Element | Icon | Philosophy | Mechanical Identity |
|---------|------|-----------|-------------------|
| 🔥 **Fire** | Flame | Passion, impulse | Aggressive stats, direct damage spells, Swift creatures |
| 💧 **Water** | Droplet | Knowledge, patience | Card draw, healing, high-health creatures, bounce spells |
| 🌿 **Earth** | Leaf | Growth, endurance | Biggest creatures, buff spells, durable stats |
| ⚡ **Air** | Wind/Star | Order, protection | Swift creatures, shield effects, efficient small creatures |
| 🌑 **Shadow** | Moon | Trickery, sacrifice | Destroy creatures, drain life (damage + heal), power at a cost |

#### Color Wheel

```
         ⚡ Air
        /     \
    💧 Water   🌿 Earth
      |         |
    🌑 Shadow ─ 🔥 Fire
```

**Allied pairs** (adjacent — natural synergies):
Air+Water, Air+Earth, Water+Shadow, Earth+Fire, Shadow+Fire

**Enemy pairs** (non-adjacent — opposing philosophies):
Air vs Shadow, Air vs Fire, Water vs Fire, Water vs Earth, Earth vs Shadow

The color wheel informs card design and starter deck pairings. Allied two-color decks are easier to build (more synergies); enemy-color decks are possible but require more care.

### Card Types

- **Creatures**: Have attack and health values. Can attack and block.
- **Spells**: One-time effects that resolve immediately and go to the discard pile.

### Complexity Tiers

The game supports three rule tiers, allowing progressive complexity as players grow:

#### Tier 1: "Apprentice" (default for beginners, ages 6-7)

| Rule | Setting |
|------|---------|
| Deck size | 20 cards |
| Max copies | 2 per card |
| Creature damage | Persists between turns (what you see = what it has) |
| Spell timing | All sorcery-speed |
| Energy cap | 5 |
| Keywords | 4 (Swift, Blast, Heal, Draw) |
| Card pool | Starter cards only |

#### Tier 2: "Alchemist" (intermediate, ages 8-9)

| Rule | Setting |
|------|---------|
| Deck size | 30 cards |
| Max copies | 3 per card |
| Creature damage | Heals at end of turn (MTGA-style: HP turns red when damaged, resets to white/full at end of turn) |
| Spell timing | All sorcery-speed |
| Energy cap | 7 |
| Keywords | 6 (+ Fury, Armor) |
| Card pool | Starter + intermediate cards |

#### Tier 3: "Archmage" (advanced, ages 10+)

| Rule | Setting |
|------|---------|
| Deck size | 30 cards |
| Max copies | 4 per card |
| Creature damage | Heals at end of turn |
| Spell timing | Combat tricks allowed (instant-speed spells during blocking) |
| Energy cap | 10 |
| Keywords | 8+ (+ Deathtouch, Lifesteal, etc.) |
| Card pool | Full card pool |

The engine implements this as a `RulesetConfig` object — tiers are data, not code branches. Each rule toggle is a simple config value the state machine reads.

### Keywords

#### Tier 1 Keywords (4)

| Keyword | Effect | Icon | Type |
|---------|--------|------|------|
| **Swift** | Can attack the turn it is played (haste) | Lightning bolt | Passive |
| **Blast** | When played, deals 1 damage to all enemy creatures | Explosion | ETB trigger |
| **Heal** | When played, restore 2 health to your hero | Heart | ETB trigger |
| **Draw** | When played, draw 1 card | Card with plus | ETB trigger |

#### Tier 2 Keywords (+2)

| Keyword | Effect | Icon | Type |
|---------|--------|------|------|
| **Fury** | Deals damage twice in combat (double strike lite) | Double sword | Passive |
| **Armor** | Prevents the first 1 damage received each turn | Shield badge | Passive |

#### Tier 3 Keywords (+2 or more)

| Keyword | Effect | Icon | Type |
|---------|--------|------|------|
| **Deathtouch** | Destroys any creature it damages in combat | Skull | Passive |
| **Lifesteal** | When this creature deals damage, heal your hero for the same amount | Vampire fang | Passive |

All ETB keywords trigger immediately when played — no stack or response window needed. Tier 2 introduces persistent passive abilities (Fury, Armor) which add ongoing decisions.

### Combat: Defender Chooses Blockers

- Attacker taps creatures to send them into battle (tapped creatures cannot block next turn)
- Defender assigns blockers — each blocker can block one attacker
- Unblocked attackers deal damage to the defending player's health
- Blocked creatures deal damage to each other simultaneously
- A creature dies when its health reaches 0
- Creatures untap automatically at the start of their controller's turn

### Creature Damage

- **Tier 1 (Apprentice)**: Damage persists between turns. A 2/5 that takes 3 damage stays at 2/2. Simpler mental model for young players.
- **Tier 2+ (Alchemist/Archmage)**: Damage heals at end of turn (MTG-style). HP number displays in red when damaged, animates back to white and resets to full at end of turn.

### Board Limits

- **Max creatures per player**: 5
- **Max hand size**: 7 (discard down at end of turn)
- **Deck size**: 20 (Tier 1) or 30 (Tier 2-3)
- **Max copies per card**: 2 (Tier 1), 3 (Tier 2), 4 (Tier 3)
- **Starting hand**: 5 cards

### Mulligan

**Partial redraw**: After drawing your opening hand, you may select any number of cards to shuffle back into your deck and draw that many replacements. You get one mulligan opportunity.

### Opening Hand Smoothing

The draw algorithm guarantees at least **1-2 cards costing 1-2 energy** in the opening hand. This prevents the feel-bad of an unplayable opening.

---

## 3. Turn Structure

```
Draw Phase → Energy Phase → Play Phase → Battle Phase → End Phase
```

### Draw Phase

- Draw 1 card from your deck (first player skips draw on turn 1)
- If deck is empty, take 1 fatigue damage (increases by 1 each time)

### Energy Phase

- Max energy increases by 1 (cap varies by tier: 5/7/10)
- Current energy refills to max

### Play Phase

- Play any number of creatures and spells from hand, if you have enough energy
- ETB keyword effects (Blast, Heal, Draw) trigger immediately when a card is played
- No priority passing, no response windows — simplicity over depth

### Battle Phase

- Attacker taps (selects) creatures to send into battle
- Defender assigns blockers
- Damage resolves simultaneously
- Creatures with 0 or less health are destroyed

### End Phase

- **Tier 2+**: All creature damage heals (HP resets to max)
- If hand exceeds 7 cards, discard down to 7
- "Your turn" passes to opponent

**Key simplification vs MTG**: No untap step (creatures auto-untap), no upkeep, no second main phase, no instant-speed responses (Tier 1-2). One play phase, one battle phase. This cuts a 7-phase MTG turn down to 5 simple steps.

---

## 4. Card Design

### Card Layout

```
┌──────────────────────┐
│ [Energy Cost]  [Name]│
│                      │
│   ┌──────────────┐   │
│   │              │   │
│   │  [Card Art]  │   │
│   │              │   │
│   └──────────────┘   │
│ [Element Badge]      │
│ [Keyword Icons]      │
│                      │
│ [Card Text]          │
│                      │
│ [Attack] ⚔️  ❤️ [HP] │
└──────────────────────┘
```

### Design Principles for Kids

- **Large, readable numbers**: Energy cost (top-left), attack (bottom-left), health (bottom-right) at minimum 24pt equivalent
- **Keyword icons over text**: Each keyword has a distinct, colorful icon. Hovering/tapping shows a tooltip
- **Minimal card text**: Most cards need zero rules text beyond their keyword icons
- **Whimsical art style**: Illustrated, friendly creatures — no gore, no horror
- **Element color coding**: Fire (red/orange), Water (blue/teal), Earth (green/brown), Air (purple/white)

### Board Card (Condensed)

When on the battlefield, cards show a condensed form:
- Art thumbnail
- Attack / Health numbers prominently displayed
- Keyword icons
- Tap state (rotated 15 degrees when attacking or exhausted)
- Damage markers (red numbers overlaid when health is reduced)

---

## 5. Card Set

50 cards total: 10 per element (7 creatures + 3 spells each).

### Fire Cards

| # | Name | Type | Cost | ATK | HP | Keywords | Effect |
|---|------|------|------|-----|-----|----------|--------|
| F1 | Ember Sprite | Creature | 1 | 1 | 2 | Swift | — |
| F2 | Flame Fox | Creature | 1 | 2 | 1 | — | — |
| F3 | Lava Hound | Creature | 2 | 2 | 3 | — | — |
| F4 | Fire Dancer | Creature | 2 | 1 | 2 | Blast | — |
| F5 | Magma Golem | Creature | 3 | 3 | 4 | — | — |
| F6 | Phoenix Chick | Creature | 4 | 3 | 3 | Swift | — |
| F7 | Dragon Whelp | Creature | 5 | 5 | 4 | Blast | — |
| F8 | Fireball | Spell | 2 | — | — | — | Deal 3 damage to a target creature |
| F9 | Eruption | Spell | 3 | — | — | — | Deal 2 damage to all enemy creatures |
| F10 | Blazing Speed | Spell | 1 | — | — | — | Give a creature Swift until end of turn |

### Water Cards

| # | Name | Type | Cost | ATK | HP | Keywords | Effect |
|---|------|------|------|-----|-----|----------|--------|
| W1 | Tide Sprite | Creature | 1 | 1 | 2 | Draw | — |
| W2 | Shell Crab | Creature | 1 | 0 | 4 | — | — |
| W3 | River Otter | Creature | 2 | 2 | 2 | Draw | — |
| W4 | Coral Guardian | Creature | 2 | 1 | 4 | — | — |
| W5 | Storm Turtle | Creature | 3 | 2 | 5 | Heal | — |
| W6 | Frost Serpent | Creature | 4 | 4 | 3 | — | — |
| W7 | Tidal Whale | Creature | 5 | 3 | 6 | Heal | — |
| W8 | Splash | Spell | 1 | — | — | — | Draw 2 cards |
| W9 | Tidal Wave | Spell | 4 | — | — | — | Return all enemy creatures to their owner's hand |
| W10 | Healing Rain | Spell | 2 | — | — | — | Restore 4 health to your hero |

### Earth Cards

| # | Name | Type | Cost | ATK | HP | Keywords | Effect |
|---|------|------|------|-----|-----|----------|--------|
| E1 | Pebble Pup | Creature | 1 | 1 | 3 | — | — |
| E2 | Vine Crawler | Creature | 1 | 2 | 1 | Swift | — |
| E3 | Mushroom Guard | Creature | 2 | 1 | 4 | Heal | — |
| E4 | Boulder Bear | Creature | 2 | 3 | 2 | — | — |
| E5 | Treant Sapling | Creature | 3 | 2 | 5 | — | — |
| E6 | Crystal Stag | Creature | 4 | 3 | 5 | Draw | — |
| E7 | Mountain Giant | Creature | 5 | 4 | 6 | — | — |
| E8 | Entangle | Spell | 1 | — | — | — | Target creature cannot attack next turn |
| E9 | Earthquake | Spell | 3 | — | — | — | Deal 2 damage to ALL creatures |
| E10 | Growth | Spell | 2 | — | — | — | Give a creature +2/+2 until end of turn |

### Air Cards

| # | Name | Type | Cost | ATK | HP | Keywords | Effect |
|---|------|------|------|-----|-----|----------|--------|
| A1 | Breeze Fairy | Creature | 1 | 1 | 1 | Swift, Draw | — |
| A2 | Cloud Kitten | Creature | 1 | 1 | 2 | — | — |
| A3 | Wind Hawk | Creature | 2 | 3 | 1 | Swift | — |
| A4 | Storm Sprite | Creature | 2 | 2 | 2 | Blast | — |
| A5 | Thunder Ram | Creature | 3 | 3 | 3 | — | — |
| A6 | Sky Drake | Creature | 4 | 4 | 3 | Swift | — |
| A7 | Tempest Eagle | Creature | 5 | 5 | 5 | — | — |
| A8 | Gust | Spell | 1 | — | — | — | Return a target creature to its owner's hand |
| A9 | Lightning Bolt | Spell | 2 | — | — | — | Deal 3 damage to any target (creature or hero) |
| A10 | Tailwind | Spell | 3 | — | — | — | All your creatures gain Swift until end of turn |

### Shadow Cards

| # | Name | Type | Cost | ATK | HP | Keywords | Effect |
|---|------|------|------|-----|-----|----------|--------|
| S1 | Sneaky Cat | Creature | 1 | 2 | 1 | Swift | — |
| S2 | Bat Swarm | Creature | 2 | 2 | 2 | Blast | — |
| S3 | Shade Wolf | Creature | 2 | 3 | 1 | — | — |
| S4 | Ghost Knight | Creature | 3 | 3 | 3 | — | When played, destroy a creature with 2 or less HP |
| S5 | Nightmare Steed | Creature | 3 | 2 | 4 | — | — |
| S6 | Vampire Lord | Creature | 4 | 4 | 3 | — | When this deals damage to the hero, heal your hero the same amount |
| S7 | Shadow Dragon | Creature | 5 | 5 | 5 | — | When played, sacrifice one of your other creatures |
| S8 | Dark Bolt | Spell | 1 | — | — | — | Deal 2 damage to a creature, take 1 damage yourself |
| S9 | Life Drain | Spell | 3 | — | — | — | Deal 3 damage to opponent, heal 3 |
| S10 | Doom | Spell | 4 | — | — | — | Destroy any creature |

### Balance Notes

- **1-cost creatures**: 1-2 ATK, 1-3 HP — expendable early plays
- **2-cost creatures**: 1-3 ATK, 2-4 HP — solid early game with possible keywords
- **3-cost creatures**: 2-3 ATK, 3-5 HP — midgame workhorses
- **4-cost creatures**: 3-4 ATK, 3-5 HP — strong with keywords
- **5-cost creatures**: 3-5 ATK, 4-6 HP — big finishers, max energy
- **Spells**: Vary from 1-4 cost, effects scale accordingly
- Each element has a playstyle lean: Fire (aggressive/damage), Water (defensive/card draw/healing), Earth (durable/buffing), Air (fast/evasive/versatile), Shadow (removal/drain/risk-reward)

### Starter Decks

#### Mono-Element Decks (5)

| Deck | Element | Playstyle |
|------|---------|-----------|
| **Inferno** | 🔥 Fire | Hit fast, burn everything |
| **Tidepool** | 💧 Water | Heal, draw cards, outlast |
| **Deepwood** | 🌿 Earth | Big creatures, grow stronger |
| **Stormfront** | ⚡ Air | Fast creatures, efficient trades |
| **Nightfall** | 🌑 Shadow | Destroy threats, drain life |

#### Multi-Element Decks (5 allied-pair decks)

| Deck | Elements | Playstyle | Theme |
|------|----------|-----------|-------|
| **Tsunami** | 💧+⚡ Water/Air | Card draw + speed | Overwhelm with card advantage and swift attackers |
| **Ancient Grove** | ⚡+🌿 Air/Earth | Protection + big creatures | Shield your giants until they take over |
| **Wildfire** | 🌿+🔥 Earth/Fire | Ramp into burn | Grow creatures, then set everything ablaze |
| **Hellfire** | 🔥+🌑 Fire/Shadow | All-out aggression | Burn and destroy everything in your path |
| **Deep Dark** | 🌑+💧 Shadow/Water | Drain and outlast | Life drain + healing makes you unkillable |

Mono decks use 20 cards from a single element (Tier 1: use duplicates to fill). Multi-element decks use ~10-12 cards from each element. Tier 2+ decks are 30 cards and can include more variety.

---

## 6. UI/UX Design Patterns

This section documents how MTG Arena handles each interaction pattern and how Alchemy adapts it for kids aged 6-10.

### 6.1 Board Layout

**How MTGA Does It**

- The battlefield occupies the center of the screen with a subtle perspective tilt (roughly 60% of vertical space for the active player, 40% for opponent)
- Player's lands appear in a row near the bottom, creatures in a row above lands, toward the center
- Opponent's layout mirrors this from the top — their creatures face yours across a central dividing line
- Identical permanents stack to save space
- Enchantments and artifacts appear to the right of lands
- Graveyard, exile, and library are accessible via small icons on the left side
- Each set features a unique themed battlefield (game board skin) with ambient animations and clickable interactables
- Player avatars sit at the center of the phase strip with life totals displayed below

**Alchemy Adaptation**

- **Mirrored layout**: Player's creatures on the bottom half, opponent's on the top half, meeting at a central "battle line"
- **No lands**: The land row is replaced by an energy meter (large, glowing orbs that fill/deplete)
- **5 creature slots**: Five clearly defined card slots per player, visually marked even when empty (subtle dashed borders or pedestals). This prevents board clutter and makes positioning obvious
- **Discard pile**: A single pile icon per player, tappable to fan out and review. No exile zone (unnecessary complexity)
- **Deck**: Visible card-back stack with card count overlay
- **Hero avatars**: Larger than MTGA, centered at the top and bottom edges of the board, with oversized health numbers (48pt+)
- **Themed boards**: Elemental-themed backgrounds (volcano, ocean, forest, sky) chosen based on deck composition or randomized

```
┌─────────────────────────────────────────────┐
│  [Opponent Avatar]  ❤️ 20    [Opponent Hand] │
│  [Opp Deck] [Opp Discard]                   │
│                                              │
│    [Opp Creature Slots: 5 positions]         │
│                                              │
│  ──────────── Battle Line ────────────────   │
│                                              │
│    [Your Creature Slots: 5 positions]        │
│                                              │
│  [Your Deck] [Your Discard]                  │
│  [Your Avatar] ❤️ 20  ⚡ 3/3  [Phase]       │
│                                              │
│         [Your Hand: fanned cards]            │
└─────────────────────────────────────────────┘
```

### 6.2 Card Play Interactions

**How MTGA Does It**

- Cards can be played by **dragging** from hand to battlefield or by **double-clicking**
- When dragging a spell forward (without releasing), the auto-tapper highlights which lands it plans to tap — this serves as a preview
- Playable cards in hand glow with a **blue outline/aura** when you have enough mana to cast them
- Cards smoothly animate from hand to the battlefield or stack
- The undo key (Z) can reverse mana tapping before a spell resolves
- On mobile, tap-and-drag from hand to field; tap-and-hold to inspect

**Alchemy Adaptation**

- **Drag to play**: Drag a card from your hand upward onto the battlefield. A "drop zone" highlights when the card enters the valid play area
- **Tap to play (mobile-friendly alternative)**: Tap a card in hand to select it (it rises and glows), then tap an empty creature slot on the board. Second tap confirms. This two-tap pattern has larger touch targets than drag-and-drop
- **Playable cards glow green**: Cards you can afford pulse with a green border glow (green = go, more intuitive for kids than blue)
- **Unplayable cards dim**: Cards that cost more than your current energy appear slightly desaturated
- **Energy preview**: When dragging a card, the energy orbs dim to show how many will be spent. If you release back to hand, they refill
- **No undo needed**: Since there is no mana tapping complexity, plays are straightforward. A brief "cancel" window (0.5s) after release allows pulling back
- **Play animation**: Card flies from hand to the battlefield slot with a satisfying element-themed particle burst (flames for fire, bubbles for water, leaves for earth, sparkles for air)
- **ETB keyword effects animate immediately**: Blast shows a shockwave, Heal shows green healing particles on the hero, Draw shows a card flying from the deck

### 6.3 Combat Flow

**How MTGA Does It**

- Combat has 5 sub-phases: Beginning of Combat, Declare Attackers, Declare Blockers, Damage, End of Combat
- A **sword icon** represents the Declare Attackers phase, a **shield** represents Declare Blockers, an **explosion** represents Damage
- Attacker clicks creatures to send them into combat — they slide forward and become highlighted
- A **red/orange arrow** connects attacking creatures to the defending player
- Defender clicks their creatures, then clicks the attacker they want to block — an arrow appears connecting blocker to attacker
- Multiple creatures can block a single attacker
- A "Confirm" button (or Enter key) locks in attack/block choices
- The phase bar illuminates orange to show the current step
- Damage numbers appear briefly during the damage step

**Alchemy Adaptation**

- **Simplified to 2 steps**: Declare Attackers and Declare Blockers. No beginning/end of combat sub-phases.
- **Attacker selection**: Player taps/clicks creatures to toggle them as attackers. Selected creatures slide forward toward the battle line and glow with a **red/orange aura** and a **sword icon** overlay. A large "Attack!" button appears to confirm.
- **Blocker assignment**: Defending player sees attacking creatures approaching. They drag their creatures to match up against attackers (or tap their creature, then tap the attacker to assign). **Colored arrows** connect blockers to the creatures they are blocking. Unblocked attackers show an arrow pointing at the defending hero.
- **Single blocker per attacker**: Unlike MTGA, we limit to one blocker per attacker to keep the math simple for kids. No damage assignment order complexity.
- **Damage resolution**: Animated simultaneously. Numbers fly off creatures showing damage dealt. Creatures shake on impact. Dying creatures shatter/dissolve with element-themed particles. Health numbers on the hero pulse red and decrement with a satisfying thud sound.
- **Auto-confirm timer**: If the defender takes no action for 8 seconds, a gentle "time running out" animation plays. After 12 seconds, combat proceeds with no blockers.
- **Visual storytelling**: Creatures physically lunge toward each other during the damage step, making combat feel impactful rather than abstract

### 6.4 Phase and Turn Indicators

**How MTGA Does It**

- A **phase ladder/strip** sits above the player's cards with icons for each phase: untap, main 1, combat (subdivided), main 2, end step
- The current phase is illuminated with an **orange flare**
- When it is the opponent's turn, the phase ladder fades out
- Priority is indicated by a **glowing halo** around the active player's avatar — a larger flare when priority switches between players
- A "Your Turn" / "Opponent's Turn" indicator appears at turn transitions
- Phase stops can be set by clicking phase icons (orange = your turn, blue = opponent's turn)

**Alchemy Adaptation**

- **5 simple phase icons** displayed horizontally at the bottom center: 🂠 Draw, ⚡ Energy, 🃏 Play, ⚔️ Battle, 🏁 End
- Active phase highlighted with a **bright golden glow** and subtle bounce animation
- Completed phases dim to gray, upcoming phases stay white
- **Large "YOUR TURN" / "THEIR TURN" banner** splashes across the screen at turn transitions with a whoosh sound and dissolves after 1.5 seconds
- **No priority system**: Since there are no instant-speed responses, there is no need for priority passing. The game simply advances through phases
- The active player's avatar has a **glowing golden ring** during their turn
- Phase transitions are accompanied by distinct sound cues (a chime for draw, an energy "charge up" sound, a battle horn for combat)

### 6.5 Targeting

**How MTGA Does It**

- When a spell requires a target, valid targets gain a **glowing highlight** (typically orange/amber)
- Invalid targets are dimmed or unchanged
- The player clicks a valid target to select it
- An arrow or targeting reticle connects the spell to its target
- A confirm button finalizes the choice
- If the spell targets a player (face damage), the player's avatar highlights as a valid target

**Alchemy Adaptation**

- When a targeting spell is played, the game enters **targeting mode**:
  - A prompt appears: "Choose a target!" with a clear description of what the spell does
  - Valid targets **pulse with a bright highlight border** and grow slightly (scale 1.05x)
  - Invalid targets dim and become non-interactive
  - The card being played hovers above the board, connected to the cursor/finger by a **glowing beam/arrow** in the card's element color
  - Tapping/clicking a valid target selects it with a satisfying "lock on" sound
  - A brief confirmation: the spell card flies toward the target and the effect resolves
- **Hero targeting**: When a spell can target a hero (e.g., Lightning Bolt), the hero avatar also pulses as a valid target
- **Cancel**: A visible "Cancel" button lets the player back out of targeting mode
- **Forgiveness**: If the player taps an invalid target, a gentle "nope" sound plays and nothing happens (no penalty, no confusion)

### 6.6 Hand Management

**How MTGA Does It**

- Cards in hand are displayed in a **fan/arc** along the bottom of the screen
- The hand periodically "tucks" to show more battlefield, and re-expands when interacted with
- Hovering over a card in hand brings it forward and fully on-screen with larger art and readable text
- On mobile, tapping the hand area fans cards out
- Right-clicking a card zooms to a full-size preview with flavor text
- Players can rearrange hand order freely (in paper; Arena sorts automatically)
- Opponent's hand shows as face-down cards with a card count
- When a card is drawn, it animates from the deck to the hand with a brief reveal

**Alchemy Adaptation**

- **Fan display**: Cards fan in an arc along the bottom. With 5-7 cards, spacing is generous enough to see each card's art and cost without overlap issues
- **Hover/tap to inspect**: Hovering (desktop) or tapping (mobile) a card in hand zooms it to a **large preview** (roughly 40% of screen height) in the center-left of the screen with all stats readable. Keyword icons show tooltip explanations
- **Playable glow**: Affordable cards glow green at their border
- **Draw animation**: New cards slide from the deck into the hand with a sparkle trail and a light "whoosh" sound
- **Hand tuck**: The hand auto-tucks (cards sink to show only top edges) during the opponent's turn or during combat when you are the attacker. Tapping the hand area or hovering brings them back
- **Opponent's hand**: Shows face-down cards with a count badge. Cards glow briefly when drawn (so the player sees the opponent received a card)
- **Max hand reminder**: At 6/7 cards, a subtle amber border appears on the hand area. At 7/7, a warning: "Hand full! You will discard at end of turn."
- **Discard interaction**: If over hand limit at end of turn, cards rise and a prompt says "Choose a card to discard." Tapping a card sends it to the discard pile with a dissolve animation

### 6.7 Visual Feedback

**How MTGA Does It**

- **Damage**: Damage numbers appear briefly over creatures/players when damage is dealt
- **Health changes**: Life total numbers pulse and change color (red when decreasing, green when healing)
- **Creature death**: Creatures shatter, dissolve, or explode depending on the card's animation set
- **Spell effects**: Each spell has unique VFX — fireballs streak across the board, healing spells radiate green light, board wipes wash over everything
- **Card draw**: Card slides from deck into hand with a flip reveal
- **Mana/resource changes**: Lands tap (rotate 90 degrees) with a brief glow when used
- **Turn start**: The screen subtly flashes when it becomes your turn
- **Combat**: Attacking creatures slide forward, blocking creatures slide into position
- **Stack**: Spells on the stack display as hovering cards in a column

**Alchemy Adaptation**

- **Damage numbers**: Large, bold floating numbers (+2, -3) in red (damage) or green (healing) that pop up and fade out over 1 second. Use Framer Motion's spring animation for a satisfying bounce
- **Health changes**: Hero health display pulses red when taking damage (number animates counting down), pulses green when healing (number animates counting up). Screen edges briefly flash red when your hero takes damage
- **Creature death**: Creature card shatters into element-themed particles (fire: embers, water: bubbles, earth: leaves/pebbles, air: feathers/sparkles). A brief "poof" or crash sound
- **Creature summoning**: Card appears with an element-themed entrance — fire: erupts from flames, water: splashes up, earth: grows from the ground, air: swirls in from wind
- **Spell resolution**: The spell card flies to its target, impacts with a particle burst, then dissolves. Area spells (Eruption, Earthquake) show a wave of particles sweeping across affected creatures
- **Energy spend**: Energy orbs crack/dim when spent, refill with a satisfying glow-up at start of turn
- **Low health warning**: Below 5 health, the hero portrait cracks and glows red with a heartbeat-like pulse
- **Victory/defeat**: Winner gets a triumphant fanfare with their creatures celebrating. Loser gets a gentle "Good game!" message — never punishing or shaming

### 6.8 Sound Design

**How MTGA Does It**

- **Ambient soundscapes**: Each battlefield theme has unique ambient audio (jungle sounds, crackling fire, ocean waves)
- **Land-specific sounds**: Playing a Swamp triggers crickets, Mountain triggers crackling lava, Forest triggers birdsong
- **Card play**: A satisfying "thwack" when a card hits the battlefield
- **Combat**: Clashing metal sounds during the damage step
- **Turn transitions**: Subtle chime when it becomes your turn
- **Timer/rope**: An escalating burning sound as the rope timer counts down
- **Spell effects**: Unique audio per spell type — fire crackles, water splashes, nature growth sounds
- **Background music**: Atmospheric orchestral tracks that shift in intensity during combat
- **Emotes**: Player avatars can play voice lines and emotes

**Alchemy Adaptation**

- **Element-themed ambience**: Subtle background audio matching the battlefield theme. Low volume, not distracting
- **Card play sounds**: A satisfying "pop" or "whomp" when a card is played, with element-specific coloring (fire: sizzle, water: splash, earth: thud, air: whoosh)
- **Combat sounds**: A "clash" sound when creatures fight, a "shatter" when one dies, a "thump" when the hero takes damage
- **Turn chime**: A friendly, musical chime when it becomes your turn — clear enough to grab attention, gentle enough not to startle
- **Phase sounds**: Each phase transition has a subtle unique cue (draw: card shuffle, energy: power-up sparkle, play: open/ready sound, battle: horn/drum, end: gentle wind-down)
- **UI sounds**: Button clicks, card hover (subtle tick), targeting lock-on, cancel
- **Victory/defeat**: Triumphant trumpet fanfare for winning, gentle "aww" sound with encouragement for losing
- **Volume control**: Master, music, and SFX sliders. Default SFX volume slightly louder than music so game state changes are always audible
- **No voice acting initially**: Keeps scope manageable. Creature sound effects (growls, chirps, etc.) can come later

### 6.9 Timers and Turn Management

**How MTGA Does It**

- A **rope timer** appears as a burning fuse around the player's avatar when they take too long on a single action (roughly 30 seconds of inactivity)
- Playing quickly earns **timeout extensions** (3 fast turns = 1 extension), indicated by an hourglass icon with a number
- Letting the rope burn out consumes an extension; running out of extensions causes automatic priority pass
- Repeated roping can result in auto-concession (anti-griefing)
- The opponent can see the rope burning
- Auto-pass and phase stops allow experienced players to speed through non-critical phases
- No overall match timer — individual action timers only

**Alchemy Adaptation**

- **Generous turn timer**: 45 seconds per turn (the entire turn, not per action). Kids need more time to think
- **Visual timer**: A **sand timer / hourglass** animation near the active player's avatar. The sand visually drains. Last 10 seconds: sand turns orange, then red with a gentle pulsing
- **No rope punishment**: When the timer runs out, the turn simply ends (auto-pass to battle phase if in play phase, auto-pass with no blockers if in block phase). No timeout extensions to track
- **Gentle timer nudge**: At 15 seconds remaining, a friendly "Hurry up!" text with a waving character animation (not threatening)
- **Auto-advance**: Phases with no possible actions auto-advance instantly (e.g., battle phase when you have no creatures to attack with)
- **No AFK detection complexity**: If a player times out 3 turns in a row, the game offers their opponent a "claim victory" option
- **AI takeover option**: For local play against AI, there is no timer at all (untimed mode available in settings)

### 6.10 Mobile/Touch Adaptations

**How MTGA Does It**

- Mouse clicks become **taps**, scrolls become **swipes**
- Cards are played by **tap-and-drag** from hand to battlefield
- **Tap-and-hold** inspects a card (equivalent to hover on desktop)
- Hand periodically **tucks** for battlefield visibility, tap to expand
- Player avatar: tap-and-hold to toggle full control mode
- Blocking: tap creature, then tap attacker to assign — or tap-and-drag from blocker to attacker
- Battlefield adjustments for mobile: slightly larger avatars, repositioned UI elements, adjusted card sizes
- Performance options: ability to disable animations for lower-end devices

**Alchemy Adaptation**

Our game targets touch-first design since kids primarily use tablets and phones:

- **Minimum touch targets**: 48x48px for all interactive elements (Apple HIG recommends 44pt; we go slightly larger for kids)
- **Card interaction**: Tap to select/inspect, drag to play, two-tap as alternative (tap card, tap slot)
- **Fat finger forgiveness**: Drop zones and hit areas extend 8px beyond visual boundaries
- **Pinch to zoom**: On battlefield cards to inspect them
- **Swipe gestures**: Swipe through hand cards, swipe up to play, swipe sideways to browse
- **Orientation**: Landscape only (matches card game table orientation)
- **Responsive scaling**: Cards and UI elements scale with screen size. Minimum supported: 7" tablet
- **Reduced animations option**: Toggle in settings for lower-end devices (replaces particle effects with simple fades)
- **One-handed playability**: Critical buttons (confirm, cancel, end turn) positioned within thumb reach on standard phone sizes
- **No hover states on mobile**: All hover interactions have equivalent tap/long-press behaviors
- **Desktop enhancements**: On desktop, add hover previews, right-click zoom, keyboard shortcuts (Space = end turn, Enter = confirm, Escape = cancel)

---

## 7. Technical Architecture

### Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 19 + TypeScript | UI components, strict typing |
| Build | Vite | Fast dev server, HMR, bundling |
| State | Zustand (w/ subscribeWithSelector) | Game state management — granular selectors prevent re-render cascades |
| Styling | Tailwind CSS 4 | Utility-first styling, responsive design |
| Animation | Framer Motion | Card animations, drag/drop (replaces @dnd-kit), layout transitions via `layoutId` |
| Networking | PeerJS (WebRTC, lazy-loaded) | Peer-to-peer LAN multiplayer, no server needed |
| Audio | Howler.js | Cross-browser audio, sprite sheets, volume control |
| Testing | Vitest + React Testing Library + fast-check | Unit, integration, and property-based tests |

**Note**: @dnd-kit was evaluated and rejected — it conflicts with Framer Motion's drag gesture ownership on touch devices. Framer Motion's built-in `drag` is used exclusively.

### Architecture Principles

1. **Engine/UI separation**: `src/engine/` is pure TypeScript with ZERO React imports. Every function is `(state, action, rng) → { newState, events[] }`. This enables testing without rendering, deterministic replay, and network portability.

2. **Deterministic state via seeded PRNG**: All random operations (shuffle, draw) use a seeded pseudo-random number generator (mulberry32). `Math.random()` is never used in the engine. Both LAN peers share the same seed, guaranteeing identical state from identical actions.

3. **Event-driven animation bridge**: The engine returns `GameEvent[]` alongside state updates (CARD_PLAYED, DAMAGE_DEALT, CREATURE_DIED, etc.). These events drive the animation system without coupling game logic to presentation.

4. **Authoritative/Display state split**: `authoritativeState` updates immediately on dispatch (for engine, network, AI). `displayState` lags behind, advancing step-by-step as animations complete. This prevents "creature vanishes before death animation plays."

5. **Open/closed extensibility**: Keywords and card effects use registries. Adding a new keyword or card means adding a file, never modifying existing ones. RulesetConfig is data, not code branches.

6. **Lockstep networking**: Both LAN peers run identical engines with the same seed. They exchange only `GameAction` messages. State is identical by construction — no authority, no state broadcast needed.

### Project Structure

```
src/
├── engine/                     # Pure TypeScript — ZERO React dependency
│   ├── types.ts                # Phase (discriminated union), GameState, CardDefinition,
│   │                           #   Permanent, PlayerState, GameAction, TargetRef,
│   │                           #   GameEvent, SpellEffect, PlayerId
│   ├── ruleset.ts              # RulesetConfig type + TIER_CONFIGS constant
│   ├── elements.ts             # Element type + ELEMENT_META registry
│   ├── prng.ts                 # Seeded PRNG (mulberry32)
│   ├── reducer.ts              # gameReducer(state, action, rng) → { newState, events }
│   ├── validation.ts           # validateAction() + enumerateLegalActions()
│   ├── combat.ts               # Combat resolution (pure functions)
│   ├── deck.ts                 # Shuffle, draw, opening hand smoothing
│   ├── ai.ts                   # AI move selection (consumes enumerateLegalActions)
│   ├── keywords/
│   │   ├── registry.ts         # KeywordHandler type + KEYWORD_REGISTRY
│   │   ├── tier1.ts            # Swift, Blast, Heal, Draw
│   │   ├── tier2.ts            # Fury, Armor
│   │   └── tier3.ts            # Deathtouch, Lifesteal
│   ├── effects/
│   │   ├── registry.ts         # EffectFn type + EFFECT_REGISTRY
│   │   └── index.ts            # All card effects registered
│   └── cards/
│       ├── registry.ts         # registerCard(), getCard(), getCardsByElement/Tier
│       ├── fire.ts
│       ├── water.ts
│       ├── earth.ts
│       ├── air.ts
│       └── shadow.ts
│
├── game/                       # Bridge: engine ↔ React
│   ├── gameStore.ts            # Zustand store wrapping engine reducer
│   │                           #   authoritativeState + displayState
│   ├── animationStore.ts       # Animation event queue (separate store)
│   ├── uiStore.ts              # Ephemeral UI state (hover, drag, tap-mode)
│   ├── selectors.ts            # Pure selector functions → view models (BoardSlotVM, etc.)
│   ├── useGameActions.ts       # SOLE dispatch interface for components
│   └── GameProvider.tsx        # Context: SlotRefContext, GameThemeContext
│
├── network/                    # LAN multiplayer (lazy-loaded via dynamic import)
│   ├── peer.ts                 # PeerJS connection lifecycle
│   ├── protocol.ts             # WireMessage types, protocolVersion field
│   ├── actionLog.ts            # Append-only action log + replay for reconnection
│   └── useNetworkGame.ts       # Hook: received actions → dispatch
│
├── components/
│   ├── board/
│   │   ├── Board.tsx
│   │   ├── CreatureSlot.tsx
│   │   ├── BattleLine.tsx
│   │   └── EnergyMeter.tsx
│   ├── card/
│   │   ├── HandCard.tsx        # Full card in hand
│   │   ├── BoardCard.tsx       # Condensed card on battlefield
│   │   ├── CardPreview.tsx     # Zoomed inspect overlay
│   │   └── CardBack.tsx
│   ├── hand/
│   │   └── Hand.tsx
│   ├── combat/
│   │   ├── AttackerPhase.tsx   # Interaction container
│   │   ├── BlockerPhase.tsx    # Interaction container
│   │   └── CombatLayer.tsx     # SVG arrow overlay (sibling of board)
│   ├── hero/
│   │   ├── HeroAvatar.tsx
│   │   └── HealthDisplay.tsx
│   ├── phase/
│   │   ├── PhaseStrip.tsx
│   │   ├── TurnBanner.tsx
│   │   └── Timer.tsx
│   ├── effects/
│   │   └── EffectLayer.tsx     # Portal-based, reads animationStore
│   ├── targeting/
│   │   └── TargetingOverlay.tsx
│   ├── layout/
│   │   ├── OrientationGate.tsx # Landscape-only enforcement
│   │   └── GameAnnouncer.tsx   # aria-live for accessibility
│   └── ui/
│       ├── Button.tsx
│       └── Tooltip.tsx
│
├── hooks/
│   ├── useDragCard.ts          # Framer Motion drag (NOT @dnd-kit)
│   ├── useTargeting.ts
│   ├── useAnimation.ts
│   └── useAudio.ts
│
├── audio/
│   └── registry.ts             # Sound key → file mapping
│
├── assets/
│   ├── cards/
│   ├── ui/
│   └── audio/
│
├── App.tsx
├── main.tsx
└── index.css                   # Tailwind directives + CSS custom properties
```

### Core Types (Engine)

```typescript
// ─── Identifiers ───

type PlayerId = 'player1' | 'player2';
type Tier = 'apprentice' | 'alchemist' | 'archmage';
type Element = 'fire' | 'water' | 'earth' | 'air' | 'shadow';
type Keyword = 'swift' | 'blast' | 'heal' | 'draw' | 'fury' | 'armor' | 'deathtouch' | 'lifesteal';

// ─── Cards ───

interface CardDefinition {
  id: string;              // "F1", "S4", etc.
  name: string;
  type: 'creature' | 'spell';
  element: Element;
  cost: number;            // 1-10
  attack?: number;         // creatures only
  health?: number;         // creatures only
  keywords: Keyword[];
  tier: Tier;              // minimum tier required
  effectId?: string;       // references EFFECT_REGISTRY
  targetingType?: TargetingType;
  flavor?: string;
}

interface Permanent {
  permanentId: string;     // unique per game instance (uuid)
  cardId: string;          // references CardDefinition.id
  ownerId: PlayerId;
  attack: number;          // base + buffs
  health: number;          // base (max) health
  damage: number;          // damage taken (current HP = health - damage)
  isTapped: boolean;
  summonedThisTurn: boolean;
  temporaryAttackBonus: number;
  temporaryHealthBonus: number;
  cantAttackThisTurn: boolean;
  armorUsedThisTurn: boolean;
}

// ─── Phase (discriminated union — makes illegal states unrepresentable) ───

type Phase =
  | { type: 'mulligan'; player: PlayerId }
  | { type: 'draw' }
  | { type: 'energy' }
  | { type: 'play' }
  | { type: 'targeting'; effectId: string; casterId: PlayerId; sourceCardId: string; validTargets: TargetRef[] }
  | { type: 'battle'; step: 'declare_attackers'; tentativeAttackers: string[] }
  | { type: 'battle'; step: 'declare_blockers'; confirmedAttackers: string[]; tentativeBlockers: Record<string, string> }
  | { type: 'battle'; step: 'resolving'; attackers: string[]; blockers: Record<string, string> }
  | { type: 'discard'; player: PlayerId; mustDiscard: number }
  | { type: 'end' }
  | { type: 'game_over'; winner: PlayerId };

// ─── State ───

interface GameState {
  ruleset: RulesetConfig;
  phase: Phase;
  turn: number;
  activePlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
}

interface PlayerState {
  health: number;
  maxEnergy: number;
  currentEnergy: number;
  hand: CardInstance[];    // cards in hand (with instance IDs)
  deck: CardInstance[];    // draw pile
  board: (Permanent | null)[];  // 5 slots
  discard: CardInstance[];
  fatigueDamage: number;   // escalates: 1, 2, 3...
  mulliganUsed: boolean;
}

interface CardInstance {
  instanceId: string;      // unique per game instance
  cardId: string;          // references CardDefinition.id
}

// ─── Actions (discriminated union) ───

type GameAction =
  | { type: 'KEEP_HAND' }
  | { type: 'MULLIGAN_CARDS'; cardIndices: number[] }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'PLAY_CARD'; cardIndex: number; targetSlot?: number }
  | { type: 'SELECT_TARGET'; targetRef: TargetRef }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'DECLARE_ATTACKER'; permanentId: string }
  | { type: 'UNDECLARE_ATTACKER'; permanentId: string }
  | { type: 'CONFIRM_ATTACKERS' }
  | { type: 'ASSIGN_BLOCKER'; blockerPermanentId: string; attackerPermanentId: string }
  | { type: 'REMOVE_BLOCKER'; blockerPermanentId: string }
  | { type: 'CONFIRM_BLOCKERS' }
  | { type: 'DISCARD_CARD'; cardIndex: number }
  | { type: 'CONCEDE' };

// ─── Events (engine output for animation system) ───

type GameEvent =
  | { type: 'CARD_DRAWN'; player: PlayerId; cardInstance: CardInstance }
  | { type: 'ENERGY_GAINED'; player: PlayerId; newMax: number }
  | { type: 'CARD_PLAYED'; player: PlayerId; cardId: string; permanentId?: string }
  | { type: 'CREATURE_ENTERED'; permanentId: string; slot: number }
  | { type: 'SPELL_RESOLVED'; cardId: string; targets: TargetRef[] }
  | { type: 'KEYWORD_TRIGGERED'; keyword: Keyword; permanentId: string }
  | { type: 'ATTACKERS_DECLARED'; attackerIds: string[] }
  | { type: 'BLOCKERS_DECLARED'; assignments: Record<string, string> }
  | { type: 'DAMAGE_DEALT'; targetId: string; amount: number; source: string }
  | { type: 'PLAYER_DAMAGED'; player: PlayerId; amount: number; source: string }
  | { type: 'CREATURE_HEALED'; permanentId: string; amount: number }
  | { type: 'PLAYER_HEALED'; player: PlayerId; amount: number }
  | { type: 'CREATURE_DIED'; permanentId: string; cardId: string }
  | { type: 'CREATURE_TAPPED'; permanentId: string }
  | { type: 'CREATURES_UNTAPPED'; permanentIds: string[] }
  | { type: 'TURN_STARTED'; player: PlayerId; turn: number }
  | { type: 'FATIGUE_DAMAGE'; player: PlayerId; amount: number }
  | { type: 'GAME_OVER'; winner: PlayerId };

// ─── Targeting ───

type TargetRef =
  | { type: 'creature'; permanentId: string }
  | { type: 'player'; playerId: PlayerId };

type TargetingType =
  | { kind: 'creature'; controller: 'own' | 'opponent' | 'any'; filter?: string }
  | { kind: 'player'; who: 'opponent' | 'any' }
  | { kind: 'any' };

// ─── Ruleset ───

interface RulesetConfig {
  tier: Tier;
  deckSize: number;
  maxCopiesPerCard: number;
  energyCap: number;
  maxHandSize: number;
  maxBoardSize: number;
  startingHealth: number;
  startingHandSize: number;
  damagePersists: boolean;
  allowCombatTricks: boolean;
  availableKeywords: ReadonlySet<Keyword>;
}
```

### Engine API Contract

The engine exposes a single pure function as its public API:

```typescript
// engine/reducer.ts
function gameReducer(
  state: GameState,
  action: GameAction,
  rng: () => number
): { newState: GameState; events: GameEvent[] }
```

Validation is separate:

```typescript
// engine/validation.ts
function validateAction(state: GameState, action: GameAction): { valid: true } | { valid: false; reason: string }
function enumerateLegalActions(state: GameState): GameAction[]
```

`enumerateLegalActions` is the single source of truth for what is legal. It is used by:
- The validator (to reject illegal actions)
- The AI (to pick from legal actions)
- The UI (to highlight playable cards, valid targets, valid blockers)

### Game-UI Bridge (Zustand)

```typescript
// game/gameStore.ts — wraps engine reducer in Zustand
interface GameStore {
  authoritativeState: GameState;  // engine truth — always current
  displayState: GameState;        // what UI renders — lags during animations
  actionLog: GameAction[];        // append-only for replay/reconnection
  rng: () => number;              // seeded PRNG
  dispatch: (action: GameAction) => void;
  advanceDisplayState: () => void; // called when animation step completes
}

// dispatch() flow:
// 1. Validate action
// 2. Apply to authoritativeState via gameReducer
// 3. Append to actionLog
// 4. Enqueue GameEvents into animationStore
// 5. displayState catches up as animations complete
// 6. For LAN: broadcast action to peer
```

Three separate Zustand stores with strict boundaries:
- **gameStore**: Engine state (serializable, network-transmittable)
- **animationStore**: Animation event queue (ephemeral, local-only)
- **uiStore**: UI interaction state (hover, drag, tap-mode — ephemeral, local-only)

### Networking Model (Lockstep via PeerJS)

```
Player A                          Player B
┌──────────────┐  actions only   ┌──────────────┐
│ Game Engine   │ ──────────────→ │ Game Engine   │
│ (seeded PRNG) │ ←────────────── │ (same seed)   │
│              │                  │              │
│ UI Layer     │                  │ UI Layer     │
└──────────────┘                  └──────────────┘
       ↕ PeerJS WebRTC Data Channel ↕
```

- Players share a seed at connection time
- Both run identical deterministic engines
- Only `GameAction` messages flow over the wire (JSON serialized)
- State is identical by construction (same seed + same actions = same state)
- Action log enables reconnection via replay
- `protocolVersion` field guards against version mismatch
- Host/guest distinction only for: who goes first, room code generation
- No cheating prevention (kids' LAN game — out of scope)

---

## 8. Implementation Phases

### Phase 1: Core Engine (Week 1-2)

**Goal**: Playable game in the console/tests with no UI.

- [ ] Define TypeScript types for all game entities (Card, Player, GameState, Action)
- [ ] Implement the card set (40 cards with all stats and effects)
- [ ] Build the game state machine (phase transitions, turn management)
- [ ] Implement card drawing, energy system, hand management
- [ ] Implement playing creatures and spells from hand
- [ ] Implement keyword resolution (Swift, Blast, Heal, Draw)
- [ ] Implement combat resolution (declare attackers, declare blockers, damage)
- [ ] Implement targeting for spells
- [ ] Implement mulligan and opening hand smoothing
- [ ] Implement win condition detection (health <= 0, deck-out fatigue)
- [ ] Write comprehensive unit tests for all game rules
- [ ] Simple AI opponent (random valid plays)

### Phase 2: Board and Cards (Week 3-4)

**Goal**: Render the game board and display cards. Static UI, no interactions.

- [ ] Set up Vite + React + TypeScript + Tailwind project
- [ ] Create Zustand game store connecting to the engine
- [ ] Build the Board component with creature slots and battle line
- [ ] Build the Card component (full and condensed views)
- [ ] Build the Hand component with fan layout
- [ ] Build the HeroAvatar and HealthDisplay components
- [ ] Build the EnergyMeter component
- [ ] Build the PhaseStrip component
- [ ] Render a full game state statically
- [ ] Responsive layout for tablet and desktop

### Phase 3: Interactions (Week 5-6)

**Goal**: Drag and drop cards, play creatures and spells, full game loop playable.

- [ ] Implement card drag-and-drop from hand to board (Framer Motion)
- [ ] Implement tap-to-play alternative
- [ ] Implement playable card highlighting (green glow)
- [ ] Implement the targeting system (overlay, valid target highlighting, target beam)
- [ ] Implement combat UI (attacker selection, blocker assignment, combat arrows)
- [ ] Wire up all interactions to the game engine via Zustand actions
- [ ] Implement turn/phase advancement controls
- [ ] Implement end-of-turn discard UI
- [ ] Implement mulligan UI at game start
- [ ] Play a full game vs AI with functional UI

### Phase 4: Polish and Feedback (Week 7-8)

**Goal**: Visual and audio feedback that makes the game feel alive.

- [ ] Add card play animations (element-themed entrance effects)
- [ ] Add combat animations (creature lunge, damage, death particles)
- [ ] Add floating damage numbers
- [ ] Add health change animations (pulse, screen flash)
- [ ] Add energy spend/refill animations
- [ ] Add turn banner ("YOUR TURN!")
- [ ] Add timer visualization
- [ ] Integrate sound effects (Howler.js)
- [ ] Add background music
- [ ] Add card hover/inspect preview
- [ ] Victory and defeat screens
- [ ] Settings menu (volume, animation toggle)

### Phase 5: Multiplayer (Week 9-10)

**Goal**: Two players on the same LAN can play against each other.

- [ ] Set up PeerJS connection management
- [ ] Implement room code creation and joining
- [ ] Implement action broadcasting and synchronization
- [ ] Add connection status indicators
- [ ] Handle disconnection and reconnection
- [ ] Test on multiple devices (tablet, phone, desktop)
- [ ] Add a simple lobby/matchmaking screen

### Phase 6: Content and Testing (Week 11-12)

**Goal**: Card art, balance testing, and user testing with kids.

- [ ] Commission or generate card art for all 40 cards
- [ ] Balance testing and stat adjustments
- [ ] User testing with target audience (kids 6-10)
- [ ] Accessibility review (color contrast, text size, touch targets)
- [ ] Bug fixes and performance optimization
- [ ] Deck builder UI (simple: pick 20 from 40)
- [ ] Tutorial / guided first game

---

## Appendix: MTGA Research Sources

- [MTG Arena In-Match Screen Guide](https://www.hipstersofthecoast.com/2018/03/how-to-play-mtg-arena-the-in-match-screen/)
- [Playing a Match - MTG Arena Zone](https://mtgazone.com/playing-a-match/)
- [Arena Hot Keys and Interface Guide - MTG Arena Zone](https://mtgazone.com/arena-hot-keys-and-interface-guide-simplify-your-game-with-these-easy-tricks/)
- [MTG Arena Match Playing Peculiarities Guide](https://mtgaassistant.net/Article/MTG-Arena-Match-Playing-Peculiarities-Guide)
- [Beginner's Guide to MTGA - Hotkeys and Interface](https://sites.google.com/view/beginners-guide-to-mtga/hotkeys-and-using-the-interface)
- [MTG Arena Mobile FAQs](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-mobile-faqs-2021-01-28)
- [MTG Arena Mobile Hands-On - TechRadar](https://www.techradar.com/news/mtg-arena-mobile-hands-on-with-phone-sized-fantasy-card-battles)
- [Card Games UI Design of Fairtravel Battle](https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/)
- [Legends of Runeterra - 10 Design Choices](https://nerdlab-games.com/048-legends-of-runeterra-10-exceptional-design-choices-and-what-we-can-learn-from-them/)
- [MTG Arena UX Redesign - Julian Tomlin](https://medium.com/@tempestfunk/i-was-given-a-design-challenge-to-do-a-redesign-of-the-ux-for-the-main-menu-hud-or-any-other-c8a9e84112)
- [Updated Phase Ladder - MTG Arena Pro](https://mtgarena.pro/news/updated-phase-ladder/)
- [UI/UX Design Tips for Child-Friendly Interfaces](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)
- [Designing for Kids - Ungrammary](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps)
- [Design for Kids Physical Development - NN/g](https://www.nngroup.com/articles/children-ux-physical-development/)
- [Framer Motion Drag Docs](https://motion.dev/docs/react-drag)
- [Framer Motion Gestures](https://www.framer.com/motion/gestures/)
