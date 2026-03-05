interface CanPlayStationOptions {
  stationId: string;
  classroomMode: boolean;
  whitelistIds: string[];
}

interface ClassroomPolicyOptions extends CanPlayStationOptions {
  discoveryInteraction: boolean;
}

type ClassroomPolicyReason = "none" | "discovery_disabled" | "not_whitelisted";

export interface ClassroomPolicyDecision {
  allowed: boolean;
  reason: ClassroomPolicyReason;
}

export function isDiscoveryDisabled(classroomMode: boolean): boolean {
  return classroomMode;
}

export function canPlayStation({ stationId, classroomMode, whitelistIds }: CanPlayStationOptions): boolean {
  if (!stationId) {
    return false;
  }

  if (!classroomMode) {
    return true;
  }

  return whitelistIds.includes(stationId);
}

export function evaluateClassroomPolicy({
  stationId,
  classroomMode,
  whitelistIds,
  discoveryInteraction
}: ClassroomPolicyOptions): ClassroomPolicyDecision {
  if (isDiscoveryDisabled(classroomMode) && discoveryInteraction) {
    return {
      allowed: false,
      reason: "discovery_disabled"
    };
  }

  if (!canPlayStation({ stationId, classroomMode, whitelistIds })) {
    return {
      allowed: false,
      reason: "not_whitelisted"
    };
  }

  return {
    allowed: true,
    reason: "none"
  };
}

export function enforceClassroomSelection(
  selectedStationId: string | null,
  classroomMode: boolean,
  whitelistIds: string[]
): string | null {
  if (!selectedStationId) {
    return null;
  }

  return canPlayStation({
    stationId: selectedStationId,
    classroomMode,
    whitelistIds
  })
    ? selectedStationId
    : null;
}
