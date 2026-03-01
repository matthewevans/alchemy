import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { Element } from '@engine/types';
import { ParticleSystem } from './particleSystem';
import {
  emitExplosion,
  emitProjectile,
  emitSpellImpact,
  emitDamageFlash,
  emitPlayerDamage,
  emitHealEffect,
  emitKeywordFlash,
  emitBlockClash,
  emitSummonBurst,
} from './particleEffects';

export interface ParticleCanvasHandle {
  explosion: (x: number, y: number, element?: Element) => void;
  projectile: (fromX: number, fromY: number, toX: number, toY: number, durationMs: number, element?: Element) => void;
  spellImpact: (x: number, y: number, element?: Element) => void;
  damageFlash: (x: number, y: number, amount: number) => void;
  playerDamage: (x: number, y: number, amount: number) => void;
  healEffect: (x: number, y: number, amount: number) => void;
  keywordFlash: (x: number, y: number, element?: Element) => void;
  blockClash: (x: number, y: number) => void;
  summonBurst: (x: number, y: number, element?: Element) => void;
}

export const ParticleCanvas = forwardRef<ParticleCanvasHandle>(function ParticleCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const system = new ParticleSystem();
    systemRef.current = system;
    system.attach(canvas);

    const handleResize = () => system.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      system.detach();
      systemRef.current = null;
    };
  }, []);

  const getSystem = useCallback(() => systemRef.current, []);

  useImperativeHandle(
    ref,
    () => ({
      explosion(x, y, element) {
        const s = getSystem();
        if (s) emitExplosion(s, x, y, element);
      },
      projectile(fromX, fromY, toX, toY, durationMs, element) {
        const s = getSystem();
        if (s) emitProjectile(s, fromX, fromY, toX, toY, durationMs, element);
      },
      spellImpact(x, y, element) {
        const s = getSystem();
        if (s) emitSpellImpact(s, x, y, element);
      },
      damageFlash(x, y, amount) {
        const s = getSystem();
        if (s) emitDamageFlash(s, x, y, amount);
      },
      playerDamage(x, y, amount) {
        const s = getSystem();
        if (s) emitPlayerDamage(s, x, y, amount);
      },
      healEffect(x, y, amount) {
        const s = getSystem();
        if (s) emitHealEffect(s, x, y, amount);
      },
      keywordFlash(x, y, element) {
        const s = getSystem();
        if (s) emitKeywordFlash(s, x, y, element);
      },
      blockClash(x, y) {
        const s = getSystem();
        if (s) emitBlockClash(s, x, y);
      },
      summonBurst(x, y, element) {
        const s = getSystem();
        if (s) emitSummonBurst(s, x, y, element);
      },
    }),
    [getSystem],
  );

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 41 }}
    />
  );
});
