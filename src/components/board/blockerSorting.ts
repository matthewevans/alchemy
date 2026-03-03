import type { Permanent } from '@engine/types';

/**
 * Reorder a defender's creatures so each assigned blocker sits roughly opposite
 * its assigned attacker in the opponent row, minimizing line crossings in
 * BlockAssignmentLines.
 *
 * Blockers are sorted by their assigned attacker's visual column (left-to-right),
 * then unassigned creatures are appended in their original order.
 */
export function sortCreaturesForBlockers(
  defenderCreatures: Permanent[],
  opponentCreatures: Permanent[],
  confirmedAttackers: string[],
  tentativeBlockers: Record<string, string>,
): Permanent[] {
  if (Object.keys(tentativeBlockers).length === 0) return defenderCreatures;

  // Map each attacker to its visual column index in the opponent row
  const attackerColumn = new Map<string, number>();
  opponentCreatures.forEach((c, i) => {
    if (confirmedAttackers.includes(c.permanentId)) {
      attackerColumn.set(c.permanentId, i);
    }
  });

  const blockers: Permanent[] = [];
  const nonBlockers: Permanent[] = [];
  for (const c of defenderCreatures) {
    if (c.permanentId in tentativeBlockers) {
      blockers.push(c);
    } else {
      nonBlockers.push(c);
    }
  }

  // Sort blockers by their assigned attacker's column (left-to-right)
  blockers.sort((a, b) => {
    const colA = attackerColumn.get(tentativeBlockers[a.permanentId]) ?? Infinity;
    const colB = attackerColumn.get(tentativeBlockers[b.permanentId]) ?? Infinity;
    return colA - colB;
  });

  return [...blockers, ...nonBlockers];
}
