import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { useUIStore } from '@game/uiStore';
import { getElementColor } from '@components/card/cardUtils';
import { HandCard } from '@components/card/HandCard';
import { CollapsibleSidePanel } from '@components/ui/CollapsibleSidePanel';

interface TargetingPanelProps {
  cardId: string;
  onCancel?: () => void;
}

/**
 * Combined card reveal + targeting prompt anchored to the right edge.
 * Uses CollapsibleSidePanel for the collapse/expand chevron so the
 * panel can get out of the way on tight screens.
 */
export function TargetingPanel({ cardId, onCancel }: TargetingPanelProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const inspectCard = useUIStore((s) => s.inspectCard);

  return (
    <CollapsibleSidePanel
      storageKey="alchemy:targeting-panel-collapsed"
      accentColor={elementColor}
      collapseOffset={200}
    >
      <motion.div
        className="rounded-2xl bg-slate-900/90 backdrop-blur-sm shadow-xl shadow-black/40 p-3 flex flex-col items-center gap-3"
        style={{ border: `1px solid ${elementColor}66` }}
        animate={{
          borderColor: [`${elementColor}4d`, `${elementColor}b3`, `${elementColor}4d`],
          boxShadow: [
            `0 0 12px ${elementColor}1a, 0 4px 20px rgba(0, 0, 0, 0.4)`,
            `0 0 24px ${elementColor}4d, 0 4px 20px rgba(0, 0, 0, 0.4)`,
            `0 0 12px ${elementColor}1a, 0 4px 20px rgba(0, 0, 0, 0.4)`,
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Card preview — long-press / right-click opens full preview */}
        <motion.div
          className="relative"
          style={{
            '--card-width': '160px',
            '--card-height': '224px',
            '--card-font-scale': '0.85',
            filter: `drop-shadow(0 0 10px ${elementColor}44)`,
          } as React.CSSProperties}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <HandCard
            cardInstance={{ instanceId: '__reveal__', cardId }}
            isPlayable={false}
            isSelected={false}
            verbose
            onClick={() => {}}
            onHover={() => {}}
            onLongPress={() => inspectCard(cardId)}
          />
        </motion.div>

        {/* Action prompt + cancel */}
        <div className="flex items-center gap-2">
          <p className="text-white/80 text-sm font-semibold">
            Choose a target
          </p>
          {onCancel && (
            <button
              className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </CollapsibleSidePanel>
  );
}
