import { CARD_REGISTRY } from '@engine/cards';
import { KEYWORD_REGISTRY } from '@engine/keywords';
import { EFFECT_REGISTRY } from '@engine/effects';

/** Check if TTS is supported in this browser. */
export function isTTSAvailable(): boolean {
  return 'speechSynthesis' in window;
}

/** Cancel any in-progress narration. */
export function cancelNarration(): void {
  if (isTTSAvailable()) {
    speechSynthesis.cancel();
  }
}

/** Speak arbitrary text aloud (e.g. tutorial tips). */
export function narrateText(text: string): void {
  if (!isTTSAvailable()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}

/** Speak a card's name, stats, and abilities aloud. */
export function narrateCard(cardId: string, useEasyRead: boolean): void {
  if (!isTTSAvailable()) return;

  const card = CARD_REGISTRY[cardId];
  if (!card) return;

  // Cancel any previous narration
  speechSynthesis.cancel();

  const parts: string[] = [card.name];

  if (card.type === 'creature') {
    parts.push(`${card.attack} attack, ${card.health} health`);
  }

  if (card.cost > 0) {
    parts.push(`costs ${card.cost} energy`);
  }

  for (const kw of card.keywords) {
    const kwDef = KEYWORD_REGISTRY[kw];
    const desc = useEasyRead && kwDef.easyDescription
      ? kwDef.easyDescription
      : kwDef.description;
    parts.push(`${kwDef.name}: ${desc}`);
  }

  if (card.effectId) {
    const effect = EFFECT_REGISTRY[card.effectId];
    if (effect) {
      const desc = useEasyRead && effect.easyDescription
        ? effect.easyDescription
        : effect.description;
      parts.push(desc);
    }
  }

  const utterance = new SpeechSynthesisUtterance(parts.join('. '));
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  speechSynthesis.speak(utterance);
}
