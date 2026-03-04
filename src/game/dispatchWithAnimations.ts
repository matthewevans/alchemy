import type { GameAction, GameEvent, PlayerId } from '@engine/types';
import { useGameStore } from './gameStore';
import { usePreferencesStore } from './preferencesStore';
import { useLearningStore } from './learningStore';
import { groupEventsIntoSteps, getPositions, useAnimationStore } from './animationStore';
import type { AnimationStep, BoardSnapshot } from './animationStore';
import { narrateCard } from '@audio/tts';
import { playEffectSound } from '@audio/sounds';
import { useAudioStore } from '@audio/audioStore';
import { maybeBuildLearningChallengeAction } from '../learning/policy';

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
  const { state, humanPlayer, gameId } = useGameStore.getState();
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

  if (state && (action.type === 'CONFIRM_ATTACKERS' || action.type === 'CONFIRM_BLOCKERS')) {
    const prefs = usePreferencesStore.getState();
    const hasReadingWeight = prefs.readingChallengeWeight > 0 || prefs.wordChallengeWeight > 0;
    const hasMathWeight = prefs.mathChallengeWeight > 0;
    const hasEnabledDomain = (prefs.readingChallengesEnabled && hasReadingWeight)
      || (prefs.mathChallengesEnabled && hasMathWeight);
    if (
      prefs.learningChallengesEnabled
      && hasEnabledDomain
      && actingPlayer === humanPlayer
    ) {
      const opportunityIndex = useLearningStore.getState().consumeOpportunity(gameId);
      const learningAction = maybeBuildLearningChallengeAction({
        state,
        action,
        actingPlayer,
        humanPlayer,
        opportunityIndex,
        prefs: {
          learningChallengesEnabled: prefs.learningChallengesEnabled,
          readingChallengesEnabled: prefs.readingChallengesEnabled,
          mathChallengesEnabled: prefs.mathChallengesEnabled,
          readingLevel: prefs.readingLevel,
          mathLevel: prefs.mathLevel,
          learningFrequency: prefs.learningFrequency,
          readingChallengeWeight: prefs.readingChallengeWeight,
          wordChallengeWeight: prefs.wordChallengeWeight,
          mathChallengeWeight: prefs.mathChallengeWeight,
        },
      });

      if (learningAction) {
        const learningEvents = useGameStore.getState().dispatch(learningAction, actingPlayer);
        onLocalAction?.(learningAction, actingPlayer);
        return learningEvents;
      }
    }
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

  // Add a card reveal effect so the player can see what was played.
  // For opponents: always reveal (creatures + spells).
  // For the caster: reveal untargeted spells only (targeted spells show a persistent
  // in-prompt preview instead; creatures appear on the board directly).
  //
  // Reveal is injected into the first animation step so gameplay resolution starts
  // immediately; the UI keeps reveal visible independently.
  const cardPlayedEvent = events.find((e) => e.type === 'CARD_PLAYED');
  if (cardPlayedEvent && cardPlayedEvent.type === 'CARD_PLAYED') {
    const isOpponentPlay = actingPlayer !== humanPlayer;
    const isCasterUntargetedSpell =
      actingPlayer === humanPlayer && events.some((e) => e.type === 'SPELL_RESOLVED');

    if (isOpponentPlay || isCasterUntargetedSpell) {
      const revealEffect: AnimationStep['effects'][number] = {
        type: 'card_reveal',
        cardId: cardPlayedEvent.cardId,
      };
      if (steps.length > 0) {
        steps[0] = {
          ...steps[0],
          effects: [revealEffect, ...steps[0].effects],
        };
      } else {
        steps.push({
          effects: [revealEffect],
          durationMs: 10,
        });
      }
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
