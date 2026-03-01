import { motion } from 'framer-motion';

/**
 * Full-screen red vignette that flashes on the edges when a player takes damage.
 * Higher intensity = deeper and longer-lasting red flash.
 * Heavy hits (intensity > 0.6) also trigger a brief white impact flash.
 */
export function DamageVignette({ intensity = 1 }: { intensity?: number }) {
  const clamped = Math.min(Math.max(intensity, 0.3), 1);
  const isHeavy = clamped > 0.6;

  return (
    <>
      {/* Brief white impact flash for heavy hits */}
      {isHeavy && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'white', zIndex: 43 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.25 * clamped, 0] }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
      )}

      {/* Red vignette */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, rgba(220, 38, 38, ${0.08 * clamped}) 20%, rgba(220, 38, 38, ${0.5 * clamped}) 100%)`,
          zIndex: 42,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 0] }}
        transition={{ duration: 0.5 + clamped * 0.2, ease: 'easeOut' }}
      />
    </>
  );
}
