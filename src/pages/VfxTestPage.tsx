import { useRef, useCallback, useState } from 'react';
import type { Element } from '@engine/types';
import { CARD_REGISTRY } from '@engine/cards';
import { getCardArtPath, getElementColor } from '@components/card/cardUtils';
import { ElementCardEffect } from '@components/animation/ElementCardEffect';
import { ParticleCanvas, type ParticleCanvasHandle } from '@components/animation/ParticleCanvas';

const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air', 'shadow'];

// One representative creature per element for preview
const SAMPLE_CARDS: Record<Element, string> = {
  fire: 'fire_magma_golem',
  water: 'water_frost_serpent',
  earth: 'earth_crystal_stag',
  air: 'air_wind_hawk',
  shadow: 'shadow_shade_wolf',
};

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
  { key: 'playerDamage', label: 'Player Dmg' },
  { key: 'explosion', label: 'Death' },
  { key: 'summon', label: 'Summon' },
];

interface ActiveOverlay {
  id: number;
  element: Element;
  position: { x: number; y: number; width: number; height: number };
}

let nextOverlayId = 0;

export function VfxTestPage() {
  const particleRef = useRef<ParticleCanvasHandle>(null);
  const cardRefs = useRef<Map<Element, HTMLDivElement>>(new Map());
  const [overlays, setOverlays] = useState<ActiveOverlay[]>([]);

  const getCardCenter = useCallback((element: Element) => {
    const el = cardRefs.current.get(element);
    if (!el) return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
    const rect = el.getBoundingClientRect();
    return { cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 };
  }, []);

  const addOverlay = useCallback((element: Element) => {
    const el = cardRefs.current.get(element);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const id = ++nextOverlayId;
    setOverlays((prev) => [...prev, {
      id,
      element,
      position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    }]);
    setTimeout(() => {
      setOverlays((prev) => prev.filter((o) => o.id !== id));
    }, 2500);
  }, []);

  const fireEffect = useCallback((element: Element, effectType: EffectType) => {
    const particles = particleRef.current;
    if (!particles) return;
    const { cx, cy } = getCardCenter(element);

    switch (effectType) {
      case 'projectile': {
        particles.projectile(cx - 200, cy + 100, cx, cy, 500, element);
        addOverlay(element);
        break;
      }
      case 'impact':
        particles.projectile(cx - 30, cy - 30, cx, cy, 120, element);
        addOverlay(element);
        break;
      case 'spell':
        particles.spellImpact(cx, cy, element);
        addOverlay(element);
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
  }, [getCardCenter, addOverlay]);

  const fireAll = useCallback((element: Element) => {
    const particles = particleRef.current;
    if (!particles) return;
    const { cx, cy } = getCardCenter(element);

    particles.projectile(cx - 150, cy + 80, cx, cy, 400, element);
    addOverlay(element);
    setTimeout(() => particles.spellImpact(cx, cy, element), 200);
    setTimeout(() => particles.explosion(cx, cy, element), 500);
  }, [getCardCenter, addOverlay]);

  return (
    <>
    {/* Overlays rendered outside the scrollable container to avoid stacking context issues */}
    {overlays.map((overlay) => (
      <ElementCardEffect
        key={overlay.id}
        element={overlay.element}
        position={overlay.position}
      />
    ))}
    <div className="fixed inset-0 bg-gray-950 overflow-auto">
      <ParticleCanvas ref={particleRef} />

      {/* UI overlay */}
      <div className="relative z-50 p-4 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">VFX Test Page</h1>
        <p className="text-gray-400 text-sm mb-4">
          Click buttons to fire effects at the sample card. Particle VFX + on-card overlay.
        </p>

        {/* Per-element rows with sample cards */}
        <div className="space-y-3">
          {ELEMENTS.map((element) => {
            const style = ELEMENT_STYLES[element];
            const cardId = SAMPLE_CARDS[element];
            const card = CARD_REGISTRY[cardId];
            const artPath = getCardArtPath(cardId, element);
            const color = getElementColor(element);

            return (
              <div key={element} className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
                <div className="flex items-center gap-3">
                  {/* Sample card */}
                  <div
                    ref={(el) => { if (el) cardRefs.current.set(element, el); }}
                    className="relative shrink-0 rounded-lg overflow-hidden border-2"
                    style={{
                      width: 90,
                      height: 126,
                      borderColor: color,
                      background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                    }}
                  >
                    <img
                      src={artPath}
                      alt={card?.name ?? cardId}
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                    {/* Card name label */}
                    <div
                      className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold text-white px-1 py-0.5 truncate"
                      style={{ background: `linear-gradient(transparent, ${color}cc)` }}
                    >
                      {card?.name ?? cardId}
                    </div>
                    {/* Stats overlay */}
                    {card?.type === 'creature' && (
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                        <span className="bg-red-600/90 text-white text-[8px] font-bold px-1 rounded">{card.attack}</span>
                        <span className="bg-green-600/90 text-white text-[8px] font-bold px-1 rounded">{card.health}</span>
                      </div>
                    )}
                  </div>

                  {/* Element label + buttons */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <span className={`${style.text} font-bold text-lg capitalize`}>{element}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {EFFECT_TYPES.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => fireEffect(element, key)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border ${style.border} ${style.text} hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer`}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => fireAll(element)}
                        className={`px-2.5 py-1 rounded text-xs font-bold border-2 ${style.border} ${style.text} hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer ml-auto`}
                      >
                        ALL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generic (no element) row */}
        <div className="mt-3 rounded-lg border border-gray-600 bg-gray-800/60 p-3">
          <div className="flex items-center gap-3 flex-wrap">
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
                className="px-2.5 py-1 rounded text-xs font-medium border border-gray-500 text-gray-300 hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-gray-500 text-xs mt-3">
          Navigate to <code className="text-gray-400">/vfx-test</code> to access this page.
        </p>
      </div>

    </div>
    </>
  );
}
