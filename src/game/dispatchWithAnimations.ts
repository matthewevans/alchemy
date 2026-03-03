import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import { useGameStore } from './gameStore';
import { usePreferencesStore } from './preferencesStore';
import { groupEventsIntoSteps, getPositions, useAnimationStore, STEP_DURATIONS } from './animationStore';
import type { AnimationStep, BoardSnapshot } from './animationStore';
import { narrateCard } from '@audio/tts';
import { playEffectSound } from '@audio/sounds';
import { useAudioStore } from '@audio/audioStore';

type LocalActionHandler = (action: GameAction, actingPlayer: PlayerId) => void;

export function dispatchWithAnimations(
  action: GameAction,
  actingPlayer: PlayerId,
  onLocalAction?: LocalActionHandler,
): GameEvent[] {
  // Read positions before dispatch so dying creatures still have entries.
  const positions = getPositions();

  // Snapshot permanentId → cardId before dispatch so we can resolve
  // the attacking creature's element even after it dies in combat.
  const { state, humanPlayer } = useGameStore.getState();
  const cardIdMap = new Map<string, string>();
  let preDispatchBoard: BoardSnapshot | null = null;
  if (state) {
    for (const player of Object.values(state.players)) {
      for (const perm of player.board) {
        if (perm) {
          cardIdMap.set(perm.permanentId, perm.cardId);
        }
      }
    }
    preDispatchBoard = {
      player1: [...state.players.player1.board],
      player2: [...state.players.player2.board],
    };
  }

  const events = useGameStore.getState().dispatch(action, actingPlayer);

  onLocalAction?.(action, actingPlayer);

  // Narrate played card via TTS
  const { narrationEnabled, easyReadMode } = usePreferencesStore.getState();
  if (narrationEnabled) {
    const played = events.find((e) => e.type === 'CARD_PLAYED');
    if (played?.type === 'CARD_PLAYED') narrateCard(played.cardId, easyReadMode);
  }

  const steps = groupEventsIntoSteps(events, positions, cardIdMap);

  // Immediate cues that are not reliably represented by animation effects.
  const { sfxVolume } = useAudioStore.getState();
  const canPlayImmediateSfx =
    sfxVolume > 0
    && typeof window !== 'undefined'
    && 'AudioContext' in window;
  if (canPlayImmediateSfx) {
    if (events.some((e) => e.type === 'CARD_DRAWN')) {
      playEffectSound('ui', { soundId: 'sfx_card_draw' });
    }

    const summonEffects = steps.flatMap((s) => s.effects).filter((e) => e.type === 'summon');
    const creatureEnterCount = events.filter((e) => e.type === 'CREATURE_ENTERED').length;
    if (creatureEnterCount > summonEffects.length) {
      const missingCount = creatureEnterCount - summonEffects.length;
      for (let i = 0; i < missingCount; i += 1) {
        playEffectSound('summon', { soundId: 'sfx_summon_creature' });
      }
    }
  }

  // Prepend a card reveal step so the player can see what was played before effects resolve.
  // For opponents: always reveal (creatures + spells).
  // For the caster: reveal untargeted spells only (targeted spells show a persistent
  // in-prompt preview instead; creatures appear on the board directly).
  const cardPlayedEvent = events.find((e) => e.type === 'CARD_PLAYED');
  if (cardPlayedEvent && cardPlayedEvent.type === 'CARD_PLAYED') {
    const isOpponentPlay = actingPlayer !== humanPlayer;
    const isCasterUntargetedSpell =
      actingPlayer === humanPlayer && events.some((e) => e.type === 'SPELL_RESOLVED');

    if (isOpponentPlay || isCasterUntargetedSpell) {
      const revealStep: AnimationStep = {
        effects: [{ type: 'card_reveal', cardId: cardPlayedEvent.cardId }],
        durationMs: STEP_DURATIONS.cardReveal,
      };
      steps.unshift(revealStep);
    }
  }

  if (steps.length > 0) {
    // Preserve pre-dispatch board when deaths occur so dying creatures
    // remain visible during combat animations preceding the death step.
    const hasDeaths = steps.some((s) => s.effects.some((e) => e.type === 'death'));
    if (hasDeaths && preDispatchBoard) {
      useAnimationStore.getState().setBoardSnapshot(preDispatchBoard);
    }

    // Initialize display health overlay so player HP updates per-step during animations
    // instead of jumping to the final value immediately.
    const hasHealthEffects = steps.some((s) =>
      s.effects.some((e) => e.type === 'player_damage' || e.type === 'player_heal'),
    );
    if (hasHealthEffects && state) {
      useAnimationStore.getState().setDisplayHealth({
        player1: state.players.player1.health,
        player2: state.players.player2.health,
      });
    }

    // Initialize creature damage overlay so creature health updates per-exchange
    // during combat animations instead of jumping to the final value immediately.
    const hasCreatureDamage = steps.some((s) =>
      s.effects.some((e) => e.type === 'damage' || e.type === 'heal'),
    );
    if (hasCreatureDamage && state) {
      const creatureDamage: Record<string, number> = {};
      for (const player of Object.values(state.players)) {
        for (const perm of player.board) {
          if (perm) creatureDamage[perm.permanentId] = perm.damage;
        }
      }
      useAnimationStore.getState().setDisplayCreatureDamage(creatureDamage);
    }

    useAnimationStore.getState().enqueueSteps(steps);
  }

  return events;
}
