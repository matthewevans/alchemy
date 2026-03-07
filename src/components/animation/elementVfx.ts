// ─── Element-Specific VFX Registry ───
// Per-element visual effects for projectile trails, projectile bodies, and impacts.
// Follows the registry pattern used by CARD_REGISTRY, EFFECT_REGISTRY, etc.

import type { Element } from '@engine/types';
import type { ParticleSystem, RGB, Particle } from './particleSystem';
import {
  WHITE,
  radialBurst,
  coreSparkles,
  emberDebris,
  randRange,
  lerpColor,
  easeOutCubic,
  easeOutQuart,
  pickVfxSprite,
  pickVfxSpriteWithFallback,
} from './particleEffects';
import type { SpriteBucket } from './particleEffects';

function pickElementSprite(element: SpriteBucket): string | undefined {
  return pickVfxSprite(element) ?? pickVfxSpriteWithFallback('damage');
}

// ─── Interface ───

export interface ElementVfx {
  /** Particles emitted per-frame along the projectile path. */
  trail: (system: ParticleSystem, px: number, py: number, color: RGB) => void;
  /** Draw the projectile body on canvas each frame. */
  drawBody: (
    system: ParticleSystem,
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    bodySize: number,
    fadeOut: number,
    color: RGB,
  ) => void;
  /** Impact burst at the damage destination. */
  impact: (system: ParticleSystem, x: number, y: number, color: RGB) => void;
}

// ─── Fire ───

function fireTrail(system: ParticleSystem, px: number, py: number, color: RGB): void {
  const trail: Partial<Particle>[] = [
    // Flame core
    {
      x: px + randRange(-4, 4), y: py + randRange(-4, 4),
      vx: randRange(-25, 25), vy: randRange(-60, -20),
      life: randRange(0.2, 0.35), size: randRange(3, 6), endSize: 0,
      r: 255, g: 200, b: 60, alpha: 0.85, drag: 2, glow: 12,
    },
    // Outer ember
    {
      x: px + randRange(-6, 6), y: py + randRange(-6, 6),
      vx: randRange(-40, 40), vy: randRange(-70, -10),
      life: randRange(0.15, 0.3), size: randRange(2, 4.5), endSize: 0,
      r: color.r, g: color.g, b: color.b, alpha: 0.8, drag: 3, glow: 10,
    },
  ];
  // Bright sparks rising from flame
  if (Math.random() > 0.3) {
    trail.push({
      x: px + randRange(-3, 3), y: py,
      vx: randRange(-50, 50), vy: randRange(-90, -30),
      life: randRange(0.1, 0.2), size: randRange(1.5, 3), endSize: 0,
      r: 255, g: 255, b: 200, alpha: 0.7, drag: 4, glow: 8,
    });
  }
  system.emit(trail);
}

function fireBody(
  system: ParticleSystem, ctx: CanvasRenderingContext2D,
  px: number, py: number, bodySize: number, fadeOut: number, color: RGB,
): void {
  // Flickering outer flame glow
  const flicker = 1 + Math.sin(performance.now() * 0.02) * 0.15;
  system.drawGlowCircle(ctx, px, py, (bodySize + 10) * flicker, { r: 255, g: 80, b: 20 }, 0.2 * fadeOut, 30);
  // Main fireball
  system.drawGlowCircle(ctx, px, py, bodySize * 1.1, color, 0.85 * fadeOut, 18);
  // White-hot center
  system.drawGlowCircle(ctx, px, py, bodySize * 0.45, { r: 255, g: 240, b: 180 }, 0.9 * fadeOut, 10);
}

function fireImpact(system: ParticleSystem, x: number, y: number, color: RGB): void {
  const now = performance.now();
  const overlaySprite = pickElementSprite('fire');
  if (overlaySprite) system.warmSprite(overlaySprite);

  // Upward flame burst
  const flames: Partial<Particle>[] = [];
  for (let i = 0; i < 18; i++) {
    const angle = randRange(-Math.PI * 0.8, -Math.PI * 0.2);
    const speed = randRange(80, 200);
    flames.push({
      x: x + randRange(-12, 12), y: y + randRange(-5, 5),
      vx: Math.cos(angle) * speed * 0.4,
      vy: Math.sin(angle) * speed,
      life: randRange(0.3, 0.55), size: randRange(3, 7), endSize: 0,
      r: 255, g: randRange(100, 200), b: randRange(20, 60),
      alpha: 0.9, drag: 1.5, glow: 14,
    });
  }

  system.emit([
    ...flames,
    ...radialBurst(x, y, color, { count: 10, speedRange: [60, 140], lifeRange: [0.2, 0.4], sizeRange: [2, 5], drag: 3, glow: 10 }),
    ...coreSparkles(x, y, 6, [40, 100]),
    ...emberDebris(x, y, color, 10),
  ]);

  // Flash + fire ring
  system.addEffect({
    startTime: now, duration: 500, update() {},
    draw(t, ctx) {
      const alpha = (1 - easeOutCubic(t)) * 0.85;
      const size = 12 + easeOutCubic(t) * 50;
      system.drawGlowCircle(ctx, x, y, size, { r: 255, g: 100, b: 30 }, alpha, 25);
      system.drawGlowCircle(ctx, x, y, size * 0.4, WHITE, alpha * 0.7, 12);
      if (overlaySprite) {
        const spriteAlpha = (1 - t) * 0.55;
        const spriteSize = 40 + easeOutQuart(t) * 60;
        system.drawSprite(ctx, x, y, spriteSize, spriteAlpha, overlaySprite, t * 2);
      }
      // Fire ring expanding outward
      const ringAlpha = (1 - t) * 0.8;
      system.drawGlowRing(ctx, x, y, 8 + easeOutQuart(t) * 55, { r: 255, g: 120, b: 40 }, ringAlpha, 3, 14);
    },
  });
}

// ─── Water ───

function waterTrail(system: ParticleSystem, px: number, py: number, color: RGB): void {
  const trail: Partial<Particle>[] = [
    // Water droplet core
    {
      x: px + randRange(-5, 5), y: py + randRange(-5, 5),
      vx: randRange(-30, 30), vy: randRange(-20, 30),
      life: randRange(0.18, 0.32), size: randRange(2.5, 5), endSize: 1,
      r: color.r, g: color.g, b: color.b, alpha: 0.75, drag: 3, glow: 10,
    },
    // White foam/mist
    {
      x: px + randRange(-4, 4), y: py + randRange(-4, 4),
      vx: randRange(-15, 15), vy: randRange(-15, 15),
      life: randRange(0.15, 0.25), size: randRange(3, 6), endSize: 2,
      r: 200, g: 230, b: 255, alpha: 0.5, drag: 4, glow: 12,
    },
  ];
  // Scattered droplets
  if (Math.random() > 0.4) {
    trail.push({
      x: px + randRange(-8, 8), y: py + randRange(-8, 8),
      vx: randRange(-60, 60), vy: randRange(10, 50),
      life: randRange(0.12, 0.22), size: randRange(1.5, 3), endSize: 0,
      r: 180, g: 220, b: 255, alpha: 0.6, drag: 2, gravity: 60, glow: 6,
    });
  }
  system.emit(trail);
}

function waterBody(
  system: ParticleSystem, ctx: CanvasRenderingContext2D,
  px: number, py: number, bodySize: number, fadeOut: number, color: RGB,
): void {
  // Ripple shimmer
  const shimmer = 1 + Math.sin(performance.now() * 0.015) * 0.1;
  system.drawGlowCircle(ctx, px, py, (bodySize + 6) * shimmer, { r: 40, g: 120, b: 255 }, 0.2 * fadeOut, 22);
  // Water orb body
  system.drawGlowCircle(ctx, px, py, bodySize, color, 0.85 * fadeOut, 16);
  // Bright core
  system.drawGlowCircle(ctx, px, py, bodySize * 0.5, { r: 200, g: 235, b: 255 }, 0.8 * fadeOut, 8);
}

function waterImpact(system: ParticleSystem, x: number, y: number, color: RGB): void {
  const now = performance.now();
  const overlaySprite = pickElementSprite('water');
  if (overlaySprite) system.warmSprite(overlaySprite);

  // Splash droplets arcing upward then falling
  const splashes: Partial<Particle>[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = randRange(80, 180);
    splashes.push({
      x: x + randRange(-5, 5), y: y + randRange(-5, 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.7 - randRange(40, 80),
      life: randRange(0.35, 0.6), size: randRange(2, 4.5), endSize: 0.5,
      r: color.r, g: color.g, b: color.b,
      alpha: 0.85, drag: 1.2, gravity: 120, glow: 8,
    });
  }

  // White foam mist
  const mist: Partial<Particle>[] = [];
  for (let i = 0; i < 8; i++) {
    mist.push({
      x: x + randRange(-10, 10), y: y + randRange(-10, 10),
      vx: randRange(-40, 40), vy: randRange(-40, 20),
      life: randRange(0.3, 0.5), size: randRange(4, 8), endSize: 2,
      r: 210, g: 235, b: 255, alpha: 0.45, drag: 3, glow: 14,
    });
  }

  system.emit([
    ...splashes,
    ...mist,
    ...coreSparkles(x, y, 4, [30, 70], { glow: 12, sizeRange: [2, 5] }),
  ]);

  // Concentric wave ripple rings
  system.addEffect({
    startTime: now, duration: 600, update() {},
    draw(t, ctx) {
      const flash = (1 - easeOutCubic(t)) * 0.6;
      system.drawGlowCircle(ctx, x, y, 10 + easeOutCubic(t) * 35, color, flash, 20);
      if (overlaySprite) {
        const spriteAlpha = (1 - t) * 0.5;
        const spriteSize = 36 + easeOutQuart(t) * 52;
        system.drawSprite(ctx, x, y, spriteSize, spriteAlpha, overlaySprite, t * 1.5);
      }

      // Ring 1 — fast inner ripple
      const r1t = Math.min(t * 1.5, 1);
      system.drawGlowRing(ctx, x, y, 6 + easeOutQuart(r1t) * 50, color, (1 - r1t) * 0.9, 2.5, 12);

      // Ring 2 — medium ripple
      const r2t = Math.max(0, Math.min((t - 0.1) * 1.3, 1));
      if (r2t > 0) {
        system.drawGlowRing(ctx, x, y, 4 + easeOutQuart(r2t) * 70, lerpColor(color, WHITE, 0.3), (1 - r2t) * 0.6, 2, 10);
      }

      // Ring 3 — slow outer ripple
      const r3t = Math.max(0, Math.min((t - 0.22) * 1.15, 1));
      if (r3t > 0) {
        system.drawGlowRing(ctx, x, y, 3 + easeOutQuart(r3t) * 90, lerpColor(color, WHITE, 0.5), (1 - r3t) * 0.4, 1.5, 8);
      }
    },
  });
}

// ─── Earth ───

function earthTrail(system: ParticleSystem, px: number, py: number, color: RGB): void {
  const brown: RGB = { r: 160, g: 120, b: 60 };
  const trail: Partial<Particle>[] = [
    // Rock chunk
    {
      x: px + randRange(-6, 6), y: py + randRange(-6, 6),
      vx: randRange(-30, 30), vy: randRange(-20, 30),
      life: randRange(0.2, 0.35), size: randRange(2.5, 5), endSize: 1,
      r: brown.r, g: brown.g, b: brown.b, alpha: 0.8, drag: 3, gravity: 40, glow: 6,
    },
    // Green energy
    {
      x: px + randRange(-4, 4), y: py + randRange(-4, 4),
      vx: randRange(-20, 20), vy: randRange(-20, 20),
      life: randRange(0.15, 0.28), size: randRange(2, 4.5), endSize: 0,
      r: color.r, g: color.g, b: color.b, alpha: 0.7, drag: 4, glow: 10,
    },
  ];
  // Dust puff
  if (Math.random() > 0.35) {
    trail.push({
      x: px + randRange(-5, 5), y: py + randRange(-3, 3),
      vx: randRange(-15, 15), vy: randRange(-10, 10),
      life: randRange(0.2, 0.35), size: randRange(4, 7), endSize: 3,
      r: 180, g: 160, b: 120, alpha: 0.3, drag: 5, glow: 8,
    });
  }
  system.emit(trail);
}

function earthBody(
  system: ParticleSystem, ctx: CanvasRenderingContext2D,
  px: number, py: number, bodySize: number, fadeOut: number, color: RGB,
): void {
  // Earthy outer glow
  system.drawGlowCircle(ctx, px, py, bodySize + 6, { r: 140, g: 100, b: 40 }, 0.25 * fadeOut, 20);
  // Green energy core
  system.drawGlowCircle(ctx, px, py, bodySize * 1.05, color, 0.8 * fadeOut, 14);
  // Bright center
  system.drawGlowCircle(ctx, px, py, bodySize * 0.4, { r: 200, g: 255, b: 200 }, 0.75 * fadeOut, 8);
}

function earthImpact(system: ParticleSystem, x: number, y: number, color: RGB): void {
  const now = performance.now();
  const brown: RGB = { r: 160, g: 120, b: 60 };
  const overlaySprite = pickElementSprite('earth');
  if (overlaySprite) system.warmSprite(overlaySprite);

  // Rock debris bursting outward
  const debris: Partial<Particle>[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + randRange(-0.3, 0.3);
    const speed = randRange(60, 160);
    debris.push({
      x: x + randRange(-5, 5), y: y + randRange(-5, 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randRange(20, 50),
      life: randRange(0.35, 0.6), size: randRange(2, 5), endSize: 0.5,
      r: brown.r + randRange(-20, 20), g: brown.g + randRange(-20, 20), b: brown.b + randRange(-10, 10),
      alpha: 0.85, drag: 2, gravity: 80, glow: 6,
    });
  }

  system.emit([
    ...debris,
    ...radialBurst(x, y, color, { count: 10, speedRange: [50, 120], lifeRange: [0.25, 0.45], sizeRange: [2, 5], drag: 3, glow: 10 }),
    ...coreSparkles(x, y, 4, [30, 70]),
  ]);

  // Vine tendrils + ground burst
  system.addEffect({
    startTime: now, duration: 600, update() {},
    draw(t, ctx) {
      // Central earth flash
      const flash = (1 - easeOutCubic(t)) * 0.7;
      system.drawGlowCircle(ctx, x, y, 10 + easeOutCubic(t) * 40, color, flash, 20);
      system.drawGlowCircle(ctx, x, y, 6 + easeOutCubic(t) * 15, WHITE, flash * 0.5, 10);
      if (overlaySprite) {
        const spriteAlpha = (1 - t) * 0.5;
        const spriteSize = 38 + easeOutQuart(t) * 55;
        system.drawSprite(ctx, x, y, spriteSize, spriteAlpha, overlaySprite, t * 2.2);
      }

      // Vine tendrils reaching outward from center
      const tendrilProgress = easeOutCubic(Math.min(t * 1.3, 1));
      const tendrilAlpha = (1 - easeOutCubic(t)) * 0.7;
      if (tendrilAlpha > 0.05) {
        const tendrilCount = 6;
        for (let i = 0; i < tendrilCount; i++) {
          const baseAngle = (i / tendrilCount) * Math.PI * 2 + 0.3;
          const length = tendrilProgress * 65;
          const endX = x + Math.cos(baseAngle) * length;
          const endY = y + Math.sin(baseAngle) * length;
          // Curved tendril via quadratic bezier
          const cpAngle = baseAngle + 0.4;
          const cpDist = length * 0.6;
          const cpX = x + Math.cos(cpAngle) * cpDist;
          const cpY = y + Math.sin(cpAngle) * cpDist;

          ctx.globalAlpha = tendrilAlpha;
          ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.lineWidth = 3 - t * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          ctx.stroke();

          // Glow pass
          ctx.globalAlpha = tendrilAlpha * 0.3;
          ctx.lineWidth = 6 - t * 4;
          ctx.stroke();
        }
      }

      // Ground ring
      const ringAlpha = (1 - t) * 0.7;
      system.drawGlowRing(ctx, x, y, 6 + easeOutQuart(t) * 50, brown, ringAlpha, 2.5, 10);
    },
  });
}

// ─── Air ───

function airTrail(system: ParticleSystem, px: number, py: number, color: RGB): void {
  const trail: Partial<Particle>[] = [];
  // Spiraling wisps
  const spiralAngle = performance.now() * 0.01;
  const spiralR = 8;
  trail.push({
    x: px + Math.cos(spiralAngle) * spiralR, y: py + Math.sin(spiralAngle) * spiralR,
    vx: randRange(-40, 40), vy: randRange(-40, 40),
    life: randRange(0.15, 0.28), size: randRange(2, 4.5), endSize: 0,
    r: color.r, g: color.g, b: color.b, alpha: 0.7, drag: 4, glow: 10,
  });
  trail.push({
    x: px + Math.cos(spiralAngle + Math.PI) * spiralR, y: py + Math.sin(spiralAngle + Math.PI) * spiralR,
    vx: randRange(-35, 35), vy: randRange(-35, 35),
    life: randRange(0.12, 0.22), size: randRange(2, 4), endSize: 0,
    r: 255, g: 255, b: 240, alpha: 0.5, drag: 3, glow: 8,
  });
  // Speed lines
  if (Math.random() > 0.5) {
    trail.push({
      x: px + randRange(-10, 10), y: py + randRange(-10, 10),
      vx: randRange(-70, 70), vy: randRange(-70, 70),
      life: randRange(0.08, 0.15), size: randRange(1, 2.5), endSize: 0,
      r: 255, g: 255, b: 255, alpha: 0.5, drag: 6, glow: 6,
    });
  }
  system.emit(trail);
}

function airBody(
  system: ParticleSystem, ctx: CanvasRenderingContext2D,
  px: number, py: number, bodySize: number, fadeOut: number, color: RGB,
): void {
  // Swirling wind aura — dual rotating rings
  const t = performance.now() * 0.004;
  const auraR = bodySize + 5;
  for (let i = 0; i < 3; i++) {
    const angle = t + (i / 3) * Math.PI * 2;
    const ax = px + Math.cos(angle) * auraR * 0.4;
    const ay = py + Math.sin(angle) * auraR * 0.4;
    system.drawGlowCircle(ctx, ax, ay, 4, color, 0.3 * fadeOut, 8);
  }
  // Main air orb
  system.drawGlowCircle(ctx, px, py, bodySize, color, 0.75 * fadeOut, 18);
  // Bright center
  system.drawGlowCircle(ctx, px, py, bodySize * 0.5, WHITE, 0.7 * fadeOut, 8);
}

function airImpact(system: ParticleSystem, x: number, y: number, color: RGB): void {
  const now = performance.now();
  const overlaySprite = pickElementSprite('air');
  if (overlaySprite) system.warmSprite(overlaySprite);

  // Vortex particles — spiral outward
  const vortex: Partial<Particle>[] = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 4; // 2 full rotations
    const dist = 5 + (i / 20) * 30;
    const speed = randRange(60, 140);
    const tangentAngle = angle + Math.PI / 2;
    vortex.push({
      x: x + Math.cos(angle) * dist * 0.3, y: y + Math.sin(angle) * dist * 0.3,
      vx: Math.cos(tangentAngle) * speed + Math.cos(angle) * speed * 0.3,
      vy: Math.sin(tangentAngle) * speed + Math.sin(angle) * speed * 0.3,
      life: randRange(0.3, 0.55), size: randRange(2, 4.5), endSize: 0,
      r: color.r, g: color.g, b: color.b,
      alpha: 0.8, drag: 2, glow: 10,
    });
  }

  // Speed-line sparks
  const sparks: Partial<Particle>[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * randRange(120, 220),
      vy: Math.sin(angle) * randRange(120, 220),
      life: randRange(0.12, 0.25), size: randRange(1.5, 3), endSize: 0,
      r: 255, g: 255, b: 240, alpha: 0.7, drag: 3, glow: 8,
    });
  }

  system.emit([...vortex, ...sparks]);

  // Spinning cyclone rings
  system.addEffect({
    startTime: now, duration: 550, update() {},
    draw(t, ctx) {
      const flash = (1 - easeOutCubic(t)) * 0.6;
      system.drawGlowCircle(ctx, x, y, 8 + easeOutCubic(t) * 30, color, flash, 18);
      if (overlaySprite) {
        const spriteAlpha = (1 - t) * 0.5;
        const spriteSize = 36 + easeOutQuart(t) * 50;
        system.drawSprite(ctx, x, y, spriteSize, spriteAlpha, overlaySprite, t * 4);
      }

      // Spinning vortex ring — rotates as it expands
      const spin = t * Math.PI * 3;
      const ringR = 8 + easeOutQuart(t) * 55;
      const ringAlpha = (1 - t) * 0.8;
      // Draw as an ellipse that appears to spin
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.scale(1, 0.6);
      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.lineWidth = 2.5 - t * 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
      // Glow pass
      ctx.globalAlpha = ringAlpha * 0.3;
      ctx.lineWidth = 6 - t * 4;
      ctx.stroke();
      ctx.restore();

      // Second counter-rotating ring
      const r2t = Math.max(0, Math.min((t - 0.08) * 1.2, 1));
      if (r2t > 0) {
        const r2R = 5 + easeOutQuart(r2t) * 70;
        const r2Alpha = (1 - r2t) * 0.5;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-spin * 0.7);
        ctx.scale(1, 0.6);
        ctx.globalAlpha = r2Alpha;
        ctx.strokeStyle = `rgb(255, 255, 240)`;
        ctx.lineWidth = 1.5 - r2t;
        ctx.beginPath();
        ctx.arc(0, 0, r2R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
}

// ─── Shadow ───

function shadowTrail(system: ParticleSystem, px: number, py: number, color: RGB): void {
  const dark: RGB = { r: 60, g: 20, b: 80 };
  const trail: Partial<Particle>[] = [
    // Dark energy wisp
    {
      x: px + randRange(-6, 6), y: py + randRange(-6, 6),
      vx: randRange(-25, 25), vy: randRange(-25, 25),
      life: randRange(0.2, 0.35), size: randRange(3, 6), endSize: 1,
      r: dark.r, g: dark.g, b: dark.b, alpha: 0.6, drag: 3, glow: 12,
    },
    // Purple energy crackle
    {
      x: px + randRange(-4, 4), y: py + randRange(-4, 4),
      vx: randRange(-35, 35), vy: randRange(-35, 35),
      life: randRange(0.12, 0.25), size: randRange(2, 4.5), endSize: 0,
      r: color.r, g: color.g, b: color.b, alpha: 0.8, drag: 4, glow: 10,
    },
  ];
  // Erratic dark sparks
  if (Math.random() > 0.3) {
    trail.push({
      x: px + randRange(-8, 8), y: py + randRange(-8, 8),
      vx: randRange(-80, 80), vy: randRange(-80, 80),
      life: randRange(0.06, 0.15), size: randRange(1.5, 3), endSize: 0,
      r: 255, g: 180, b: 255, alpha: 0.6, drag: 6, glow: 8,
    });
  }
  system.emit(trail);
}

function shadowBody(
  system: ParticleSystem, ctx: CanvasRenderingContext2D,
  px: number, py: number, bodySize: number, fadeOut: number, color: RGB,
): void {
  // Dark void aura
  const pulse = 1 + Math.sin(performance.now() * 0.025) * 0.12;
  system.drawGlowCircle(ctx, px, py, (bodySize + 8) * pulse, { r: 80, g: 30, b: 120 }, 0.25 * fadeOut, 25);
  // Purple energy body
  system.drawGlowCircle(ctx, px, py, bodySize, color, 0.85 * fadeOut, 16);
  // White-violet core
  system.drawGlowCircle(ctx, px, py, bodySize * 0.45, { r: 230, g: 200, b: 255 }, 0.8 * fadeOut, 10);
}

function shadowImpact(system: ParticleSystem, x: number, y: number, color: RGB): void {
  const now = performance.now();
  const dark: RGB = { r: 60, g: 20, b: 80 };
  const overlaySprite = pickElementSprite('shadow');
  if (overlaySprite) system.warmSprite(overlaySprite);

  // Dark energy particles — some implode inward, then burst outward
  const inward: Partial<Particle>[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const dist = randRange(40, 70);
    inward.push({
      x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
      vx: -Math.cos(angle) * randRange(100, 180),
      vy: -Math.sin(angle) * randRange(100, 180),
      life: randRange(0.15, 0.25), size: randRange(2, 4), endSize: 0,
      r: dark.r, g: dark.g, b: dark.b, alpha: 0.7, drag: 1, glow: 10,
    });
  }

  system.emit([
    ...inward,
    ...coreSparkles(x, y, 5, [40, 90], { glow: 14, sizeRange: [3, 6] }),
  ]);

  // Delayed outward explosion + void tendrils
  system.addEffect({
    startTime: now, duration: 700, update(t) {
      // Emit outward burst at the implosion peak
      if (t > 0.2 && t < 0.25) {
        system.emit([
          ...radialBurst(x, y, color, { count: 16, speedRange: [80, 200], lifeRange: [0.25, 0.45], sizeRange: [2.5, 5.5], drag: 2.5, glow: 12 }),
          ...emberDebris(x, y, dark, 6),
        ]);
      }
    },
    draw(t, ctx) {
      // Implosion flash — grows then contracts
      const impT = t < 0.2 ? t / 0.2 : 1;
      const expT = t < 0.2 ? 0 : (t - 0.2) / 0.8;

      if (t < 0.2) {
        // Contracting void
        const voidSize = 40 * (1 - easeOutCubic(impT));
        system.drawGlowCircle(ctx, x, y, voidSize, dark, 0.5 * (1 - impT), 20);
      }

      // Explosion flash after implosion
      if (expT > 0) {
        const flash = (1 - easeOutCubic(expT)) * 0.8;
        const size = 10 + easeOutCubic(expT) * 50;
        system.drawGlowCircle(ctx, x, y, size, color, flash, 25);
        system.drawGlowCircle(ctx, x, y, size * 0.35, WHITE, flash * 0.6, 12);
        if (overlaySprite) {
          const spriteAlpha = (1 - expT) * 0.55;
          const spriteSize = 44 + easeOutQuart(expT) * 60;
          system.drawSprite(ctx, x, y, spriteSize, spriteAlpha, overlaySprite, expT * 2.5);
        }
      }

      // Shadow tendrils — jagged dark lines extending outward
      const tendrilT = t < 0.15 ? 0 : Math.min((t - 0.15) / 0.5, 1);
      const tendrilAlpha = tendrilT > 0 ? (1 - easeOutCubic(Math.max(0, (t - 0.3) / 0.7))) * 0.6 : 0;
      if (tendrilAlpha > 0.05) {
        const tendrilCount = 8;
        for (let i = 0; i < tendrilCount; i++) {
          const baseAngle = (i / tendrilCount) * Math.PI * 2;
          const length = easeOutQuart(tendrilT) * 60;
          const midAngle = baseAngle + Math.sin(i * 2.3) * 0.5;
          const midDist = length * 0.5;
          const midX = x + Math.cos(midAngle) * midDist;
          const midY = y + Math.sin(midAngle) * midDist;
          const endX = x + Math.cos(baseAngle) * length;
          const endY = y + Math.sin(baseAngle) * length;

          ctx.globalAlpha = tendrilAlpha;
          ctx.strokeStyle = `rgb(${dark.r}, ${dark.g}, ${dark.b})`;
          ctx.lineWidth = 2.5 - tendrilT * 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(midX, midY, endX, endY);
          ctx.stroke();

          // Purple glow pass
          ctx.globalAlpha = tendrilAlpha * 0.4;
          ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.lineWidth = 5 - tendrilT * 3;
          ctx.stroke();
        }
      }

      // Dark shockwave ring
      if (expT > 0) {
        const ringAlpha = (1 - expT) * 0.7;
        system.drawGlowRing(ctx, x, y, 6 + easeOutQuart(expT) * 60, color, ringAlpha, 2.5, 12);
      }
    },
  });
}

// ─── Registry ───

export const ELEMENT_VFX: Record<Element, ElementVfx> = {
  fire: { trail: fireTrail, drawBody: fireBody, impact: fireImpact },
  water: { trail: waterTrail, drawBody: waterBody, impact: waterImpact },
  earth: { trail: earthTrail, drawBody: earthBody, impact: earthImpact },
  air: { trail: airTrail, drawBody: airBody, impact: airImpact },
  shadow: { trail: shadowTrail, drawBody: shadowBody, impact: shadowImpact },
};
