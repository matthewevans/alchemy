import { motion } from 'framer-motion';
import { CARD_REGISTRY } from '@engine/cards';
import { EFFECT_REGISTRY } from '@engine/effects';
import { getElementColor } from '@components/card/cardUtils';
import { HandCard } from '@components/card/HandCard';
import { gameButtonClass } from '@components/ui/buttonStyles';

interface TargetingPanelProps {
  cardId: string;
  effectId: string;
  onCancel?: () => void;
}

/**
 * Combined card reveal + targeting prompt anchored to the right edge.
 * Replaces the separate top-center targeting prompt and right-side CardReveal
 * with a single compact panel that keeps the battlefield clear on mobile.
 */
export function TargetingPanel({ cardId, effectId, onCancel }: TargetingPanelProps) {
  const card = CARD_REGISTRY[cardId];
  const elementColor = getElementColor(card.element);
  const effectText = effectId in EFFECT_REGISTRY ? EFFECT_REGISTRY[effectId].description : null;

  return (
    <motion.div
      className="fixed top-1/2 -translate-y-1/2 z-[36] flex flex-col items-center gap-2"
      style={{ right: 'calc(6rem + env(safe-area-inset-right))' }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {/* Card thumbnail with element glow */}
      <div className="relative pointer-events-none">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${elementColor}20, ${elementColor}08 50%, transparent 70%)`,
            filter: 'blur(14px)',
            transform: 'scale(1.8)',
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative"
          style={{
            '--card-width': '96px',
            '--card-height': '134px',
            '--card-font-scale': '0.6',
            filter: `drop-shadow(0 0 12px ${elementColor}44) drop-shadow(0 4px 10px rgba(0,0,0,0.5))`,
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
          />
        </motion.div>
      </div>

      {/* Targeting info + cancel */}
      <motion.div
        className="rounded-xl bg-slate-900/90 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-sm text-center max-w-[120px]"
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
        <p className="text-white/90 text-xs font-semibold leading-tight">
          Choose a target
        </p>
        {effectText && (
          <p className="text-white/60 text-[10px] mt-0.5 leading-tight">{effectText}</p>
        )}
        {onCancel && (
          <button
            className={gameButtonClass({
              tone: 'neutral',
              size: 'sm',
              className: 'mt-1.5 px-3 py-1 text-[10px]',
            })}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
