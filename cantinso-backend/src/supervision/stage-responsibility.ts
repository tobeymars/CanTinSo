/**
 * Operational boundary: the kitchen that COOKS a meal performs portioning,
 * readiness and (for central kitchens) dispatch. A school receiving centrally
 * cooked meals only confirms the delivered finished dishes (ARRIVED).
 * Never infer producer permissions from a receiving user's schoolId alone.
 */
export type KitchenKind = 'CENTRAL' | 'SCHOOL';
export type JourneyStage = 'PLATED' | 'READY' | 'DISPATCHED' | 'ARRIVED';
export const stageOrderFor = (kind: KitchenKind): JourneyStage[] =>
  kind === 'CENTRAL' ? ['PLATED', 'READY', 'DISPATCHED', 'ARRIVED'] : ['PLATED', 'READY'];

export function canKitchenRecordStage(
  role: string, actorKitchenId: string | null | undefined,
  producerKitchenId: string, kind: KitchenKind, stage: JourneyStage,
): boolean {
  if (!actorKitchenId || actorKitchenId !== producerKitchenId || stage === 'ARRIVED') return false;
  if (kind === 'CENTRAL') return role === 'CENTRAL_KITCHEN';
  return role === 'SCHOOL_KITCHEN' && (stage === 'PLATED' || stage === 'READY');
}
