import type { PlayerId } from '@engine/types';
import { usePhaseInfo } from '@hooks/usePhaseInfo';
import { HeroPortrait, HealthBadge, EnergyCrystals, PhaseDiamonds } from '@components/hero';

interface HeroHUDProps {
  playerId: PlayerId;
  isOpponent: boolean;
  avatarSrc?: string;
  isValidTarget?: boolean;
  onHeroClick?: () => void;
}

/**
 * MTGA-style compact HUD strip — avatar centered in phase strip,
 * health badge overlapping avatar bottom, energy pips below.
 */
export function HeroHUD({ playerId, isOpponent, avatarSrc, isValidTarget, onHeroClick }: HeroHUDProps) {
  const phaseInfo = usePhaseInfo();

  return (
    <div
      data-testid={isOpponent ? undefined : 'phase-strip'}
      data-phase={isOpponent ? undefined : phaseInfo?.displayKey}
      className="flex flex-col items-center py-0.5"
    >
      {/* Main strip: phase diamonds flanking portrait+health */}
      <div className="flex items-center justify-center gap-4">
        <PhaseDiamonds side="left" />
        {/* Portrait + health badge overlay */}
        <div className="relative pb-2">
          <HeroPortrait avatarSrc={avatarSrc} isOpponent={isOpponent} isValidTarget={isValidTarget} onHeroClick={onHeroClick} />
          <HealthBadge playerId={playerId} />
        </div>
        <PhaseDiamonds side="right" />
      </div>
      {/* Energy pips — compact row below */}
      <EnergyCrystals playerId={playerId} />
    </div>
  );
}
