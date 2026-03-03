import type { AnimationEffect } from '@game/animationStore';
import { useAudioStore } from './audioStore';
import { playEffectSound } from './sounds';

/**
 * Maps an AnimationEffect to a sound and plays it.
 * Called alongside triggerParticleEffect in AnimationOverlay.
 * Follows the same exhaustive-switch pattern.
 */
export function triggerSoundEffect(effect: AnimationEffect): void {
  const { sfxVolume } = useAudioStore.getState();
  if (sfxVolume === 0) return;

  switch (effect.type) {
    case 'combat_strike':
      playEffectSound('combat_strike', { element: effect.element, soundId: effect.soundId });
      break;
    case 'block_link':
      playEffectSound('block_link', {});
      break;
    case 'damage':
      playEffectSound('damage', { amount: effect.amount });
      break;
    case 'player_damage':
      playEffectSound('player_damage', { amount: effect.amount });
      break;
    case 'death':
      playEffectSound('death', { element: effect.element, soundId: effect.soundId });
      break;
    case 'spell_impact':
      playEffectSound('spell_impact', {
        element: effect.element,
        soundId: effect.soundId,
        spellImpactKind: effect.isHealing ? 'heal' : undefined,
      });
      break;
    case 'heal':
      playEffectSound('heal', { amount: effect.amount });
      break;
    case 'player_heal':
      playEffectSound('player_heal', { amount: effect.amount });
      break;
    case 'bounce':
      playEffectSound('summon', { element: effect.element });
      break;
    case 'summon':
      playEffectSound('summon', { element: effect.element, soundId: effect.soundId });
      break;
    case 'keyword':
      playEffectSound('keyword', {});
      break;
    case 'card_reveal':
    case 'combat_math':
      // No dedicated sound
      break;
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}
