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
  attackerBlockerOrder?: Record<string, string[]>,
): Permanent[] {
  if (Object.keys(tentativeBlockers).length === 0) return defenderCreatures;
  const confirmedAttackerSet = new Set(confirmedAttackers);
  const blockerOrderIndex = new Map<string, Map<string, number>>();
  if (attackerBlockerOrder) {
    for (const [attackerId, order] of Object.entries(attackerBlockerOrder)) {
      blockerOrderIndex.set(
        attackerId,
        new Map(order.map((blockerId, index) => [blockerId, index])),
      );
    }
  }

  // Map each attacker to its visual column index in the opponent row
  const attackerColumn = new Map<string, number>();
  opponentCreatures.forEach((c, i) => {
    if (confirmedAttackerSet.has(c.permanentId)) {
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
    if (colA !== colB) return colA - colB;

    // When two blockers share the same attacker, preserve explicit combat order if present.
    const attackerA = tentativeBlockers[a.permanentId];
    const attackerB = tentativeBlockers[b.permanentId];
    if (
      attackerA
      && attackerA === attackerB
      && blockerOrderIndex.has(attackerA)
    ) {
      const order = blockerOrderIndex.get(attackerA)!;
      return (order.get(a.permanentId) ?? Number.MAX_SAFE_INTEGER)
        - (order.get(b.permanentId) ?? Number.MAX_SAFE_INTEGER);
    }

    return 0;
  });

  return [...blockers, ...nonBlockers];
}
