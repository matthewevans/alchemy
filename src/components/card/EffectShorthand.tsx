import type { EffectStep, EffectDefinition } from '@engine/effects';
import { KEYWORD_REGISTRY } from '@engine/keywords';

interface EffectShorthandProps {
  effect: EffectDefinition;
}

// ─── Step → icon + short phrase ───

interface EffectLine {
  icon: string;
  text: string;
  color: string; // tailwind text color for the icon
}

function stepToLine(step: EffectStep): EffectLine {
  switch (step.type) {
    case 'damage': {
      const target =
        step.target === 'all_enemy_creatures' ? 'all enemies'
          : step.target === 'all_creatures' ? 'everyone'
            : step.target === 'self' ? 'you'
              : step.target === 'opponent' ? 'your foe'
                : 'an enemy';
      return { icon: '🔥', text: `${step.amount} damage to ${target}`, color: 'text-red-400' };
    }
    case 'heal': {
      const target = step.target === 'self' ? '' : step.target === 'opponent' ? ' your foe' : ' a friend';
      return { icon: '❤️', text: `Heal ${step.amount}${target}`, color: 'text-green-400' };
    }
    case 'draw':
      return { icon: '🃏', text: `Draw ${step.amount} card${step.amount > 1 ? 's' : ''}`, color: 'text-blue-400' };
    case 'bounce': {
      const target = step.target === 'all_enemy_creatures' ? 'Send all enemies home' : 'Send an enemy home';
      return { icon: '↩️', text: target, color: 'text-cyan-400' };
    }
    case 'buff':
      return {
        icon: '💪',
        text: `+${step.attack}/+${step.health} to a friend`,
        color: 'text-amber-400',
      };
    case 'grant_keyword': {
      const kw = KEYWORD_REGISTRY[step.keyword];
      const target = step.target === 'own_creatures' ? 'all friends' : 'a friend';
      return { icon: kw.icon, text: `Give ${target} ${kw.name}`, color: 'text-amber-400' };
    }
    case 'destroy':
      return { icon: '💀', text: 'Destroy an enemy', color: 'text-red-400' };
    case 'prevent_attack':
      return { icon: '🚫', text: "Stop an enemy attacking", color: 'text-orange-400' };
  }
}

export function EffectShorthand({ effect }: EffectShorthandProps) {
  const lines = effect.steps.map(stepToLine);

  return (
    <div
      className="flex flex-col gap-0.5"
      style={{ fontSize: 'calc(var(--card-font-scale) * 0.55rem)' }}
    >
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-1 leading-tight">
          <span className={line.color} style={{ fontSize: '1.1em' }}>{line.icon}</span>
          <span className="text-white/90">{line.text}</span>
        </div>
      ))}
    </div>
  );
}
