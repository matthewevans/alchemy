import { useRef, useCallback } from 'react';
import type { Element } from '@engine/types';
import { ParticleCanvas, type ParticleCanvasHandle } from '@components/animation/ParticleCanvas';

const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];

const ELEMENT_STYLES: Record<Element, { bg: string; border: string; text: string }> = {
  fire: { bg: 'bg-orange-900/60', border: 'border-orange-500', text: 'text-orange-300' },
  water: { bg: 'bg-blue-900/60', border: 'border-blue-500', text: 'text-blue-300' },
  earth: { bg: 'bg-green-900/60', border: 'border-green-500', text: 'text-green-300' },
  air: { bg: 'bg-yellow-900/60', border: 'border-yellow-500', text: 'text-yellow-300' },
  shadow: { bg: 'bg-purple-900/60', border: 'border-purple-500', text: 'text-purple-300' },
};

type EffectType = 'projectile' | 'impact' | 'spell' | 'playerDamage' | 'explosion' | 'summon';

const EFFECT_TYPES: { key: EffectType; label: string }[] = [
  { key: 'projectile', label: 'Projectile' },
  { key: 'impact', label: 'Impact' },
  { key: 'spell', label: 'Spell Impact' },
  { key: 'playerDamage', label: 'Player Damage' },
  { key: 'explosion', label: 'Death' },
  { key: 'summon', label: 'Summon' },
];

export function VfxTestPage() {
  const particleRef = useRef<ParticleCanvasHandle>(null);

  const fireEffect = useCallback((element: Element, effectType: EffectType) => {
    const particles = particleRef.current;
    if (!particles) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    switch (effectType) {
      case 'projectile': {
        const fromX = cx - 200;
        const fromY = cy + 100;
        particles.projectile(fromX, fromY, cx, cy, 500, element);
        break;
      }
      case 'impact':
        // Use spellImpact as a proxy — emitImpact isn't directly on the handle,
        // but projectile triggers impact on completion. Fire a short projectile instead.
        particles.projectile(cx - 30, cy - 30, cx, cy, 120, element);
        break;
      case 'spell':
        particles.spellImpact(cx, cy, element);
        break;
      case 'playerDamage':
        particles.playerDamage(cx, cy, 3, element);
        break;
      case 'explosion':
        particles.explosion(cx, cy, element);
        break;
      case 'summon':
        particles.summonBurst(cx, cy, element);
        break;
    }
  }, []);

  const fireAll = useCallback((element: Element) => {
    const particles = particleRef.current;
    if (!particles) return;

    const cy = window.innerHeight / 2;
    const startX = window.innerWidth * 0.15;
    const spacing = window.innerWidth * 0.14;

    // Fire each effect type spread across the screen
    particles.projectile(startX - 80, cy + 60, startX, cy, 400, element);
    setTimeout(() => particles.spellImpact(startX + spacing, cy, element), 100);
    setTimeout(() => particles.playerDamage(startX + spacing * 2, cy, 3, element), 200);
    setTimeout(() => particles.explosion(startX + spacing * 3, cy, element), 300);
    setTimeout(() => particles.summonBurst(startX + spacing * 4, cy, element), 400);
    setTimeout(() => particles.keywordFlash(startX + spacing * 5, cy, element), 500);
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-auto">
      <ParticleCanvas ref={particleRef} />

      {/* UI overlay */}
      <div className="relative z-50 p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">VFX Test Page</h1>
        <p className="text-gray-400 text-sm mb-6">
          Click any button to fire the effect at screen center. Effects render on the canvas behind this UI.
        </p>

        {/* Per-element rows */}
        <div className="space-y-4">
          {ELEMENTS.map((element) => {
            const style = ELEMENT_STYLES[element];
            return (
              <div key={element} className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className={`${style.text} font-bold text-lg capitalize w-20`}>{element}</span>

                  {EFFECT_TYPES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => fireEffect(element, key)}
                      className={`px-3 py-1.5 rounded text-sm font-medium border ${style.border} ${style.text} hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer`}
                    >
                      {label}
                    </button>
                  ))}

                  <button
                    onClick={() => fireAll(element)}
                    className={`px-3 py-1.5 rounded text-sm font-bold border-2 ${style.border} ${style.text} hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer ml-auto`}
                  >
                    ALL
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generic (no element) row */}
        <div className="mt-4 rounded-lg border border-gray-600 bg-gray-800/60 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-300 font-bold text-lg w-20">Generic</span>
            {EFFECT_TYPES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  const p = particleRef.current;
                  if (!p) return;
                  const cx = window.innerWidth / 2;
                  const cy = window.innerHeight / 2;
                  switch (key) {
                    case 'projectile': p.projectile(cx - 200, cy + 100, cx, cy, 500); break;
                    case 'impact': p.projectile(cx - 30, cy - 30, cx, cy, 120); break;
                    case 'spell': p.spellImpact(cx, cy); break;
                    case 'playerDamage': p.playerDamage(cx, cy, 3); break;
                    case 'explosion': p.explosion(cx, cy); break;
                    case 'summon': p.summonBurst(cx, cy); break;
                  }
                }}
                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-500 text-gray-300 hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-gray-500 text-xs mt-4">
          Navigate to <code className="text-gray-400">/vfx-test</code> to access this page. Dev only.
        </p>
      </div>
    </div>
  );
}
