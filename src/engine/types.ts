// ─── Identifiers ───

export type PlayerId = 'player1' | 'player2';
export type Tier = 'apprentice' | 'alchemist' | 'archmage';
export type Element = 'fire' | 'water' | 'earth' | 'air' | 'shadow';
export type SpellSpeed = 'sorcery' | 'instant';
export type Keyword =
  | 'swift'
  | 'blast'
  | 'heal'
  | 'draw'
  | 'fury'
  | 'armor'
  | 'deathtouch'
  | 'lifesteal';

// ─── Cards ───

export type CreatureType =
  | 'angel'
  | 'beast'
  | 'dinosaur'
  | 'dragon'
  | 'elemental'
  | 'fairy'
  | 'giant'
  | 'golem'
  | 'human'
  | 'plant'
  | 'witch'
  | 'undead';

export interface CardDefinition {
  id: string;
  name: string;
  type: 'creature' | 'spell';
  element: Element;
  cost: number;
  spellSpeed?: SpellSpeed;
  instantSurcharge?: number;
  attack?: number;
  health?: number;
  creatureType?: CreatureType;
  keywords: Keyword[];
  tier: Tier;
  effectId?: string;
  targetingType?: TargetingType;
  flavor?: string;
  soundId?: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface Permanent {
  permanentId: string;
  cardId: string;
  ownerId: PlayerId;
  attack: number;
  health: number;
  damage: number;
  isTapped: boolean;
  summonedThisTurn: boolean;
  temporaryAttackBonus: number;
  temporaryHealthBonus: number;
  cantAttackThisTurn: boolean;
  armorUsedThisTurn: boolean;
}

// ─── Learning ───

export type LearningDomain = 'reading' | 'math';
export type LearningPromptKind =
  | 'missing_letter'
  | 'word_to_picture'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division';

export interface LearningPromptOption {
  id: string;
  text: string;
  imageId?: string;
}

export interface LearningPrompt {
  id: string;
  domain: LearningDomain;
  kind: LearningPromptKind;
  prompt: string;
  options: LearningPromptOption[];
  correctOptionId: string;
}

export interface LearningReward {
  permanentId: string;
  attackBonus: number;
  healthBonus: number;
}

export interface LearningChallengeMeta {
  cadenceReason: string;
  rewardReason: string;
  selectionReason: string;
  opportunityIndex: number;
  promptBucket: 'reading' | 'word' | 'math';
  effectiveReadingLevel: string;
  effectiveMathLevel: string;
}

export type CombatPriorityWindow = 'post_attackers' | 'post_blockers';

export interface CombatPriorityStackItem {
  stackId: string;
  cardId: string;
  effectId: string;
  casterId: PlayerId;
  selectedTarget: TargetRef | null;
  surchargePaid: number;
}

export interface CombatPriorityPhase {
  type: 'combat_priority';
  window: CombatPriorityWindow;
  confirmedAttackers: string[];
  blockers: Record<string, string>;
  attackerBlockerOrder: Record<string, string[]>;
  priorityPlayer: PlayerId;
  passCount: number;
  stack: CombatPriorityStackItem[];
}

export type LearningResumeAction =
  | { type: 'ADVANCE_PHASE' }
  | { type: 'CONFIRM_ATTACKERS' }
  | { type: 'CONFIRM_BLOCKERS' }
  | { type: 'CONFIRM_BLOCKER_ORDER' };

// ─── Phase (discriminated union) ───

export type CorePhase =
  | { type: 'mulligan'; player: PlayerId }
  | { type: 'draw' }
  | { type: 'energy' }
  | { type: 'play'; postCombat?: boolean }
  | {
      type: 'targeting';
      effectId: string;
      casterId: PlayerId;
      sourceCardId: string;
      validTargets: TargetRef[];
      postCombat?: boolean;
      resumePriority?: CombatPriorityPhase;
      stackOnResolve?: boolean;
      surchargePaid?: number;
    }
  | {
      type: 'battle';
      step: 'declare_attackers';
      tentativeAttackers: string[];
    }
  | {
      type: 'battle';
      step: 'declare_blockers';
      confirmedAttackers: string[];
      tentativeBlockers: Record<string, string>;
    }
  | {
      type: 'battle';
      step: 'order_blockers';
      confirmedAttackers: string[];
      blockers: Record<string, string>;
      attackerBlockerOrder: Record<string, string[]>;
    }
  | {
      type: 'battle';
      step: 'resolving';
      attackers: string[];
      blockers: Record<string, string>;
    }
  | CombatPriorityPhase
  | { type: 'discard'; player: PlayerId; mustDiscard: number }
  | { type: 'end' };

export type Phase =
  | CorePhase
  | {
      type: 'learning';
      player: PlayerId;
      suspendedPhase: CorePhase;
      resumeAction: LearningResumeAction;
      prompt: LearningPrompt;
      reward: LearningReward;
      meta?: LearningChallengeMeta;
    }
  | { type: 'game_over'; winner: PlayerId };

// ─── Stats ───

export interface GameStats {
  damageDealt: number;
  damageReceived: number;
  cardsPlayed: number;
  creaturesPlayed: number;
  spellsCast: number;
  creaturesDefeated: number;
  turnsPlayed: number;
  energySpent: number;
}

export function createEmptyStats(): GameStats {
  return {
    damageDealt: 0,
    damageReceived: 0,
    cardsPlayed: 0,
    creaturesPlayed: 0,
    spellsCast: 0,
    creaturesDefeated: 0,
    turnsPlayed: 0,
    energySpent: 0,
  };
}

// ─── State ───

export interface GameState {
  ruleset: RulesetConfig;
  phase: Phase;
  turn: number;
  activePlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  stats: Record<PlayerId, GameStats>;
}

export interface PlayerState {
  health: number;
  maxEnergy: number;
  currentEnergy: number;
  hand: CardInstance[];
  deck: CardInstance[];
  board: (Permanent | null)[];
  discard: CardInstance[];
  fatigueDamage: number;
  mulliganUsed: boolean;
}

// ─── Actions (discriminated union) ───

export type GameAction =
  | { type: 'KEEP_HAND' }
  | { type: 'MULLIGAN_CARDS'; cardIndices: number[] }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'PLAY_CARD'; cardIndex: number; targetSlot?: number }
  | { type: 'SELECT_TARGET'; targetRef: TargetRef }
  | { type: 'CANCEL_TARGETING' }
  | { type: 'DECLARE_ATTACKER'; permanentId: string }
  | { type: 'UNDECLARE_ATTACKER'; permanentId: string }
  | { type: 'CONFIRM_ATTACKERS' }
  | {
      type: 'ASSIGN_BLOCKER';
      blockerPermanentId: string;
      attackerPermanentId: string;
    }
  | { type: 'REMOVE_BLOCKER'; blockerPermanentId: string }
  | { type: 'CONFIRM_BLOCKERS' }
  | {
      type: 'SET_BLOCKER_ORDER';
      attackerPermanentId: string;
      blockerPermanentIds: string[];
    }
  | { type: 'CONFIRM_BLOCKER_ORDER' }
  | { type: 'PASS_PRIORITY' }
  | {
      type: 'START_LEARNING_CHALLENGE';
      prompt: LearningPrompt;
      reward: LearningReward;
      resumeAction: LearningResumeAction;
      meta?: LearningChallengeMeta;
    }
  | { type: 'ANSWER_LEARNING_CHALLENGE'; optionId: string }
  | { type: 'SKIP_LEARNING_CHALLENGE' }
  | { type: 'DISCARD_CARD'; cardIndex: number }
  | { type: 'CONCEDE' };

// ─── Events (engine output for animation system) ───

export type GameEvent =
  | { type: 'CARD_DRAWN'; player: PlayerId; cardInstance: CardInstance }
  | { type: 'ENERGY_GAINED'; player: PlayerId; newMax: number }
  | {
      type: 'CARD_PLAYED';
      player: PlayerId;
      cardId: string;
      permanentId?: string;
    }
  | { type: 'CREATURE_ENTERED'; permanentId: string; slot: number }
  | { type: 'SPELL_RESOLVED'; cardId: string; targets: TargetRef[] }
  | { type: 'KEYWORD_TRIGGERED'; keyword: Keyword; permanentId: string }
  | { type: 'ATTACKERS_DECLARED'; attackerIds: string[] }
  | {
      type: 'BLOCKERS_DECLARED';
      assignments: Record<string, string>;
    }
  | {
      type: 'DAMAGE_DEALT';
      targetId: string;
      amount: number;
      source: string;
    }
  | {
      type: 'PLAYER_DAMAGED';
      player: PlayerId;
      amount: number;
      source: string;
    }
  | { type: 'CREATURE_HEALED'; permanentId: string; amount: number }
  | { type: 'PLAYER_HEALED'; player: PlayerId; amount: number }
  | { type: 'CREATURE_DIED'; permanentId: string; cardId: string }
  | { type: 'CREATURE_BOUNCED'; permanentId: string; cardId: string }
  | { type: 'CREATURE_TAPPED'; permanentId: string }
  | { type: 'CREATURES_UNTAPPED'; permanentIds: string[] }
  | { type: 'TURN_STARTED'; player: PlayerId; turn: number }
  | { type: 'FATIGUE_DAMAGE'; player: PlayerId; amount: number }
  | { type: 'LEARNING_CHALLENGE_STARTED'; player: PlayerId; promptId: string }
  | {
      type: 'LEARNING_CHALLENGE_RESOLVED';
      player: PlayerId;
      promptId: string;
      correct: boolean;
      rewardApplied: boolean;
    }
  | { type: 'GAME_OVER'; winner: PlayerId };

// ─── Targeting ───

export type TargetRef =
  | { type: 'creature'; permanentId: string }
  | { type: 'player'; playerId: PlayerId };

export type TargetingType =
  | { kind: 'creature'; controller: 'own' | 'opponent' | 'any'; filter?: string }
  | { kind: 'player'; who: 'opponent' | 'any' }
  | { kind: 'any' };

// ─── Ruleset ───

export interface RulesetConfig {
  tier: Tier;
  deckSize: number;
  maxCopiesPerCard: number;
  energyCap: number;
  maxHandSize?: number;
  maxBoardSize: number;
  startingHealth: number;
  startingHandSize: number;
  damagePersists: boolean;
  allowCombatTricks: boolean;
  availableKeywords: ReadonlySet<Keyword>;
}

// ─── RNG ───

export type RNG = () => number;

// ─── Engine Result ───

export interface ReducerResult {
  newState: GameState;
  events: GameEvent[];
}

// ─── Validation ───

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

// ─── Helpers ───

export function getOpponent(player: PlayerId): PlayerId {
  return player === 'player1' ? 'player2' : 'player1';
}

export function getCurrentHealth(permanent: Permanent): number {
  return permanent.health + permanent.temporaryHealthBonus - permanent.damage;
}

export function getEffectiveAttack(permanent: Permanent): number {
  return permanent.attack + permanent.temporaryAttackBonus;
}

/** Returns the player who should act in the current phase, or null if no one acts (game over). */
export function getActingPlayer(state: GameState): PlayerId | null {
  const { phase } = state;
  switch (phase.type) {
    case 'mulligan':
      return phase.player;
    case 'discard':
      return phase.player;
    case 'targeting':
      return phase.casterId;
    case 'learning':
      return phase.player;
    case 'battle':
      if (phase.step === 'declare_blockers') return getOpponent(state.activePlayer);
      return state.activePlayer;
    case 'combat_priority':
      return phase.priorityPlayer;
    case 'game_over':
      return null;
    default:
      return state.activePlayer;
  }
}
