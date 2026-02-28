import { useGameStore } from '@game/gameStore';
import { useUIStore } from '@game/uiStore';
import { CARD_REGISTRY } from '@engine/cards';
import type { GameAction } from '@engine/types';
import { HandCard } from '@components/card';

export function PlayerHand() {
  const humanPlayer = useGameStore((s) => s.humanPlayer);
  const hand = useGameStore((s) => s.state?.players[s.humanPlayer].hand ?? []);
  const legalActions = useGameStore((s) => s.legalActions);
  const dispatch = useGameStore((s) => s.dispatch);
  const selectedHandIndex = useUIStore((s) => s.selectedHandIndex);
  const selectHandCard = useUIStore((s) => s.selectHandCard);
  const hoverCard = useUIStore((s) => s.hoverCard);

  const playableIndices = new Set(
    legalActions
      .filter((a): a is Extract<GameAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD')
      .map((a) => a.cardIndex),
  );

  const handleCardClick = (index: number) => {
    if (selectedHandIndex === index) {
      // Second tap on same card — check if it's an untargeted spell we can auto-play
      const cardInstance = hand[index];
      const cardDef = CARD_REGISTRY[cardInstance.cardId];
      if (cardDef.type === 'spell' && playableIndices.has(index)) {
        const spellAction = legalActions.find(
          (a): a is Extract<GameAction, { type: 'PLAY_CARD' }> =>
            a.type === 'PLAY_CARD' && a.cardIndex === index && a.targetSlot === undefined,
        );
        if (spellAction) {
          dispatch(spellAction, humanPlayer);
          selectHandCard(null);
          return;
        }
      }
      selectHandCard(null);
    } else {
      if (playableIndices.has(index)) {
        selectHandCard(index);
      }
    }
  };

  const cardCount = hand.length;
  const maxFanAngle = 12;
  const fanStep = cardCount > 1 ? (maxFanAngle * 2) / (cardCount - 1) : 0;

  return (
    <div className="relative flex flex-col items-center">
      {/* Fan layout — cards peek from bottom, hover/select lifts them */}
      <div
        className="relative flex items-end justify-center"
        style={{ height: 'calc(var(--card-height) * 0.55)' }}
      >
        {hand.map((cardInstance, index) => {
          const angle = cardCount > 1 ? -maxFanAngle + fanStep * index : 0;
          const isPlayable = playableIndices.has(index);
          const isSelected = selectedHandIndex === index;

          return (
            <div
              key={cardInstance.instanceId}
              className="transition-transform duration-200"
              style={{
                transform: `rotate(${angle}deg)`,
                marginLeft: index === 0 ? 0 : 'calc(var(--card-width) * -0.45)',
                zIndex: isSelected ? 50 : index,
                transformOrigin: 'bottom center',
              }}
            >
              <HandCard
                cardInstance={cardInstance}
                isPlayable={isPlayable}
                isSelected={isSelected}
                onClick={() => handleCardClick(index)}
                onHover={(hovering) => hoverCard(hovering ? cardInstance.cardId : null)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
