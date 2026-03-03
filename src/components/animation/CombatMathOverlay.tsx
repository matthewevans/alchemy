import { motion } from 'framer-motion';
import type { CombatEquation, CombatEquationPart } from '@game/combatMath';
import type { ElementPosition } from '@game/animationStore';

const PART_COLORS: Record<CombatEquationPart['type'], string> = {
  attack: '#f87171',
  health: '#4ade80',
  armor: '#60a5fa',
  fury: '#fbbf24',
  operator: 'rgba(255,255,255,0.7)',
  result: '#fbbf24',
};

interface CombatMathOverlayProps {
  equation: CombatEquation;
  attackerPos: ElementPosition;
  targetPos: ElementPosition;
}

export function CombatMathOverlay({ equation, attackerPos, targetPos }: CombatMathOverlayProps) {
  const midX = (attackerPos.x + attackerPos.width / 2 + targetPos.x + targetPos.width / 2) / 2;
  const midY = (attackerPos.y + attackerPos.height / 2 + targetPos.y + targetPos.height / 2) / 2;

  return (
    <motion.div
      className="fixed z-50 pointer-events-none select-none"
      style={{
        left: midX,
        top: midY,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          fontSize: 'calc(var(--ui-scale, 1) * 1.25rem)',
        }}
      >
        {equation.parts.map((part, i) => (
          <span
            key={i}
            className="font-bold whitespace-nowrap"
            style={{ color: PART_COLORS[part.type] }}
          >
            {renderPart(part)}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function renderPart(part: CombatEquationPart): string {
  switch (part.type) {
    case 'attack': return `${part.value} ⚔`;
    case 'health': return `${part.value} ♥`;
    case 'armor': return `${part.value} 🛡`;
    case 'fury': return `×${part.multiplier}`;
    case 'operator': return part.symbol;
    case 'result': return part.text;
  }
}
