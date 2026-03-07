import { motion } from 'framer-motion';
import type { Element } from '@engine/types';
import type { ElementPosition } from '@game/animationStore';

interface ElementCardEffectProps {
  element: Element;
  position: ElementPosition;
}

export function ElementCardEffect({ element, position }: ElementCardEffectProps) {
  const pad = 4;
  const style = {
    position: 'fixed' as const,
    left: position.x - pad,
    top: position.y - pad,
    width: position.width + pad * 2,
    height: position.height + pad * 2,
    pointerEvents: 'none' as const,
    zIndex: 45,
    borderRadius: 8,
    overflow: 'hidden' as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={style}
    >
      {ELEMENT_OVERLAYS[element]}
    </motion.div>
  );
}

// ─── Fire: Rising flame tongues + ember glow ───

function FireOverlay() {
  return (
    <div className="absolute inset-0 rounded-lg">
      {/* Base ember glow */}
      <div
        className="absolute inset-0 rounded-lg animate-fire-glow"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(255,80,0,0.4) 0%, transparent 60%)',
        }}
      />
      {/* Flame tongues rising from bottom */}
      {FLAME_CONFIGS.map((flame, i) => (
        <div
          key={i}
          className="absolute bottom-0 animate-flame-rise"
          style={{
            left: flame.left,
            width: flame.width,
            height: flame.height,
            background: `linear-gradient(to top, ${flame.color} 0%, rgba(255,200,0,0.3) 50%, transparent 100%)`,
            borderRadius: '50% 50% 0 0',
            animationDelay: flame.delay,
            animationDuration: flame.duration,
            filter: 'blur(2px)',
          }}
        />
      ))}
      {/* Top edge heat shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-6 animate-heat-shimmer"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,100,0,0.3), transparent)',
          filter: 'blur(3px)',
        }}
      />
      {/* Border glow */}
      <div
        className="absolute inset-0 rounded-lg animate-fire-border"
        style={{
          boxShadow: 'inset 0 0 15px 3px rgba(255,80,0,0.4), 0 0 20px 5px rgba(255,60,0,0.3)',
        }}
      />
    </div>
  );
}

const FLAME_CONFIGS = [
  { left: '10%', width: '25%', height: '60%', color: 'rgba(255,60,0,0.6)', delay: '0s', duration: '0.7s' },
  { left: '30%', width: '20%', height: '75%', color: 'rgba(255,100,0,0.5)', delay: '0.2s', duration: '0.8s' },
  { left: '55%', width: '22%', height: '55%', color: 'rgba(255,80,0,0.55)', delay: '0.4s', duration: '0.65s' },
  { left: '75%', width: '18%', height: '65%', color: 'rgba(255,120,0,0.5)', delay: '0.1s', duration: '0.75s' },
  { left: '5%', width: '15%', height: '40%', color: 'rgba(255,150,0,0.4)', delay: '0.3s', duration: '0.9s' },
  { left: '45%', width: '15%', height: '45%', color: 'rgba(255,50,0,0.45)', delay: '0.5s', duration: '0.7s' },
];

// ─── Water: Frost border + wave sweep ───

function WaterOverlay() {
  return (
    <div className="absolute inset-0 rounded-lg">
      {/* Frost vignette */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `
            radial-gradient(ellipse at top left, rgba(150,220,255,0.5) 0%, transparent 40%),
            radial-gradient(ellipse at top right, rgba(100,200,255,0.4) 0%, transparent 35%),
            radial-gradient(ellipse at bottom left, rgba(120,210,255,0.35) 0%, transparent 30%),
            radial-gradient(ellipse at bottom right, rgba(140,215,255,0.45) 0%, transparent 38%)
          `,
        }}
      />
      {/* Ice crystal edges */}
      <div
        className="absolute inset-0 rounded-lg animate-frost-spread"
        style={{
          boxShadow: 'inset 0 0 20px 8px rgba(150,220,255,0.5), inset 0 0 40px 4px rgba(100,180,255,0.2)',
        }}
      />
      {/* Wave sweep */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
      >
        <div
          className="absolute animate-wave-sweep"
          style={{
            width: '200%',
            height: '100%',
            top: 0,
            left: '-100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(180,230,255,0.4) 40%, rgba(220,245,255,0.6) 50%, rgba(180,230,255,0.4) 60%, transparent 100%)',
          }}
        />
      </div>
      {/* Drip streaks */}
      {DRIP_CONFIGS.map((drip, i) => (
        <div
          key={i}
          className="absolute animate-water-drip"
          style={{
            left: drip.left,
            top: 0,
            width: drip.width,
            height: '100%',
            background: `linear-gradient(to bottom, rgba(150,220,255,${drip.opacity}), transparent ${drip.length})`,
            animationDelay: drip.delay,
            animationDuration: drip.duration,
            filter: 'blur(1px)',
          }}
        />
      ))}
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: '0 0 15px 4px rgba(100,180,255,0.3)',
        }}
      />
    </div>
  );
}

const DRIP_CONFIGS = [
  { left: '15%', width: '3px', opacity: 0.5, length: '60%', delay: '0s', duration: '1.2s' },
  { left: '40%', width: '2px', opacity: 0.4, length: '45%', delay: '0.4s', duration: '1.5s' },
  { left: '65%', width: '3px', opacity: 0.45, length: '55%', delay: '0.2s', duration: '1.3s' },
  { left: '85%', width: '2px', opacity: 0.35, length: '50%', delay: '0.6s', duration: '1.4s' },
];

// ─── Earth: Growing vine borders + root tendrils ───

function EarthOverlay() {
  return (
    <div className="absolute inset-0 rounded-lg">
      {/* Base organic glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: `
            radial-gradient(ellipse at bottom, rgba(40,140,40,0.35) 0%, transparent 50%),
            radial-gradient(ellipse at top, rgba(60,160,40,0.2) 0%, transparent 40%)
          `,
        }}
      />
      {/* Vine border segments growing around the card */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Bottom vine */}
        <path
          d="M10,98 Q25,92 40,95 Q55,98 70,93 Q85,88 95,94"
          fill="none"
          stroke="rgba(50,160,50,0.7)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="animate-vine-grow"
          style={{ animationDelay: '0s' }}
        />
        {/* Left vine */}
        <path
          d="M2,90 Q6,75 3,60 Q0,45 5,30 Q2,20 4,10"
          fill="none"
          stroke="rgba(60,150,50,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-vine-grow"
          style={{ animationDelay: '0.15s' }}
        />
        {/* Right vine */}
        <path
          d="M98,85 Q94,70 97,55 Q100,40 96,25"
          fill="none"
          stroke="rgba(50,155,45,0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-vine-grow"
          style={{ animationDelay: '0.3s' }}
        />
        {/* Top vine */}
        <path
          d="M15,2 Q30,6 50,3 Q70,0 85,5"
          fill="none"
          stroke="rgba(55,145,50,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-vine-grow"
          style={{ animationDelay: '0.45s' }}
        />
        {/* Leaf nodes */}
        {LEAF_CONFIGS.map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.cx}
            cy={leaf.cy}
            rx="3"
            ry="4.5"
            fill="rgba(60,170,50,0.5)"
            transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
            className="animate-leaf-sprout"
            style={{ animationDelay: `${0.4 + i * 0.15}s` }}
          />
        ))}
      </svg>
      {/* Inner organic shadow */}
      <div
        className="absolute inset-0 rounded-lg animate-earth-pulse"
        style={{
          boxShadow: 'inset 0 -10px 20px -5px rgba(40,130,40,0.4), 0 0 12px 3px rgba(50,140,50,0.25)',
        }}
      />
    </div>
  );
}

const LEAF_CONFIGS = [
  { cx: 3, cy: 55, rotate: -30 },
  { cx: 97, cy: 45, rotate: 30 },
  { cx: 30, cy: 97, rotate: 45 },
  { cx: 75, cy: 3, rotate: -20 },
  { cx: 5, cy: 25, rotate: -50 },
];

// ─── Air: Swirling wind lines + vortex ───

function AirOverlay() {
  return (
    <div className="absolute inset-0 rounded-lg">
      {/* Central vortex glow */}
      <div
        className="absolute inset-0 rounded-lg animate-air-vortex"
        style={{
          background: 'radial-gradient(circle at center, rgba(200,235,255,0.25) 0%, transparent 50%)',
        }}
      />
      {/* Swirling wind lines */}
      <svg className="absolute inset-0 w-full h-full animate-air-spin" viewBox="0 0 100 100" preserveAspectRatio="none">
        {WIND_LINE_CONFIGS.map((line, i) => (
          <path
            key={i}
            d={line.d}
            fill="none"
            stroke={`rgba(180,220,255,${line.opacity})`}
            strokeWidth={line.width}
            strokeLinecap="round"
            strokeDasharray="8 4"
            className="animate-wind-dash"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </svg>
      {/* Secondary spin layer (counter-rotation) */}
      <svg className="absolute inset-0 w-full h-full animate-air-spin-reverse" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.5 }}>
        <path
          d="M50,20 Q70,30 65,50 Q60,70 50,80 Q40,70 35,50 Q30,30 50,20"
          fill="none"
          stroke="rgba(200,240,255,0.4)"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          className="animate-wind-dash"
        />
      </svg>
      {/* Speed lines */}
      {SPEED_LINE_CONFIGS.map((line, i) => (
        <div
          key={i}
          className="absolute animate-speed-line"
          style={{
            left: line.left,
            top: line.top,
            width: line.width,
            height: '1.5px',
            background: `linear-gradient(90deg, transparent, rgba(200,235,255,${line.opacity}), transparent)`,
            transform: `rotate(${line.rotate}deg)`,
            animationDelay: `${i * 0.15}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          boxShadow: '0 0 15px 4px rgba(180,220,255,0.25), inset 0 0 10px 2px rgba(200,240,255,0.15)',
        }}
      />
    </div>
  );
}

const WIND_LINE_CONFIGS = [
  { d: 'M20,15 Q50,25 80,15 Q90,40 80,60 Q60,80 30,75 Q10,60 20,15', opacity: 0.5, width: '1.5' },
  { d: 'M30,10 Q60,20 75,40 Q80,65 55,80 Q25,75 15,50 Q15,25 30,10', opacity: 0.4, width: '1' },
  { d: 'M40,5 Q70,15 85,45 Q85,75 50,90 Q15,80 10,50 Q15,20 40,5', opacity: 0.3, width: '1' },
];

const SPEED_LINE_CONFIGS = [
  { left: '5%', top: '20%', width: '30%', opacity: 0.5, rotate: -15 },
  { left: '60%', top: '15%', width: '25%', opacity: 0.4, rotate: 10 },
  { left: '10%', top: '70%', width: '28%', opacity: 0.35, rotate: -5 },
  { left: '55%', top: '75%', width: '32%', opacity: 0.45, rotate: 8 },
  { left: '20%', top: '45%', width: '20%', opacity: 0.3, rotate: -20 },
];

// ─── Shadow: Dark tendrils creeping inward + void pulse ───

function ShadowOverlay() {
  return (
    <div className="absolute inset-0 rounded-lg">
      {/* Dark vignette */}
      <div
        className="absolute inset-0 rounded-lg animate-shadow-pulse"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 30%, rgba(40,0,60,0.4) 70%, rgba(20,0,40,0.6) 100%)
          `,
        }}
      />
      {/* Creeping tendrils from edges */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {TENDRIL_CONFIGS.map((tendril, i) => (
          <path
            key={i}
            d={tendril.d}
            fill="none"
            stroke={`rgba(120,0,180,${tendril.opacity})`}
            strokeWidth={tendril.width}
            strokeLinecap="round"
            className="animate-tendril-creep"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </svg>
      {/* Dark mist particles */}
      {MIST_CONFIGS.map((mist, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-dark-mist"
          style={{
            left: mist.left,
            top: mist.top,
            width: mist.size,
            height: mist.size,
            background: `radial-gradient(circle, rgba(80,0,120,${mist.opacity}), transparent 70%)`,
            animationDelay: `${i * 0.3}s`,
            filter: 'blur(3px)',
          }}
        />
      ))}
      {/* Inner shadow border */}
      <div
        className="absolute inset-0 rounded-lg animate-shadow-border"
        style={{
          boxShadow: 'inset 0 0 25px 8px rgba(60,0,100,0.5), 0 0 15px 5px rgba(80,0,120,0.3)',
        }}
      />
    </div>
  );
}

const TENDRIL_CONFIGS = [
  { d: 'M0,80 Q15,70 25,60 Q30,50 28,40', opacity: 0.6, width: '2' },
  { d: 'M100,75 Q85,65 75,55 Q70,45 72,35', opacity: 0.55, width: '1.8' },
  { d: 'M0,30 Q10,35 20,42 Q28,50 25,55', opacity: 0.5, width: '1.5' },
  { d: 'M100,25 Q90,30 82,40 Q78,48 80,55', opacity: 0.45, width: '1.5' },
  { d: 'M40,100 Q42,85 45,72 Q48,62 50,55', opacity: 0.5, width: '1.8' },
  { d: 'M60,100 Q58,88 55,75 Q52,65 50,58', opacity: 0.45, width: '1.5' },
  { d: 'M50,0 Q48,12 50,25 Q52,35 50,42', opacity: 0.4, width: '1.5' },
];

const MIST_CONFIGS = [
  { left: '10%', top: '20%', size: '30px', opacity: 0.4 },
  { left: '60%', top: '60%', size: '25px', opacity: 0.35 },
  { left: '30%', top: '70%', size: '35px', opacity: 0.3 },
  { left: '70%', top: '15%', size: '28px', opacity: 0.3 },
];

// ─── Registry ───

const ELEMENT_OVERLAYS: Record<Element, React.ReactNode> = {
  fire: <FireOverlay />,
  water: <WaterOverlay />,
  earth: <EarthOverlay />,
  air: <AirOverlay />,
  shadow: <ShadowOverlay />,
};
