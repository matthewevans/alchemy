import type { PlayerId } from '@engine/types';
import { useGameStore } from '@game/gameStore';
import { usePhaseInfo } from '@hooks/usePhaseInfo';
import { HeroPortrait, HealthBadge, EnergyCrystals, PhaseDiamonds } from '@components/hero';

interface HeroHUDProps {
  playerId: PlayerId;
  isOpponent: boolean;
  avatarSrc?: string;
  isValidTarget?: boolean;
  onHeroClick?: () => void;
  onDiscardClick?: () => void;
}

/**
 * MTGA-style compact HUD strip — avatar centered in phase strip,
 * health badge overlapping avatar bottom, energy pips below.
 * On mobile, also shows deck/discard counts (sidebar is hidden).
 */
export function HeroHUD({ playerId, isOpponent, avatarSrc, isValidTarget, onHeroClick, onDiscardClick }: HeroHUDProps) {
  const phaseInfo = usePhaseInfo();
  const deckCount = useGameStore((s) => s.state?.players[playerId]?.deck.length ?? 0);
  const discardCount = useGameStore((s) => s.state?.players[playerId]?.discard.length ?? 0);

  return (
    <div
      data-testid={isOpponent ? undefined : 'phase-strip'}
      data-phase={isOpponent ? undefined : phaseInfo?.displayKey}
      className="flex flex-col items-center py-0.5"
    >
      {/* Main strip: phase diamonds flanking portrait+health */}
      <div className="flex items-center justify-center" style={{ gap: 'var(--hero-gap)' }}>
        {/* Deck/discard — mobile only, left side */}
        <div className="mobile-only items-center gap-1.5 min-w-[40px] justify-end">
          <span className="text-[10px] font-bold text-slate-400 tabular-nums" title="Deck">
            📚{deckCount}
          </span>
        </div>
        <PhaseDiamonds side="left" />
        {/* Portrait + health badge overlay */}
        <div className="relative" style={{ paddingBottom: 'var(--hero-portrait-pb)' }}>
          <HeroPortrait avatarSrc={avatarSrc} isOpponent={isOpponent} isValidTarget={isValidTarget} onHeroClick={onHeroClick} />
          <HealthBadge playerId={playerId} />
        </div>
        <PhaseDiamonds side="right" />
        {/* Discard — mobile only, right side */}
        <div className="mobile-only items-center gap-1.5 min-w-[40px]">
          {discardCount > 0 && (
            <button
              type="button"
              className="text-[10px] font-bold text-slate-500 tabular-nums"
              title="Discard pile"
              onClick={onDiscardClick}
            >
              💀{discardCount}
            </button>
          )}
        </div>
      </div>
      {/* Energy pips — compact row below */}
      <EnergyCrystals playerId={playerId} />
    </div>
  );
}
