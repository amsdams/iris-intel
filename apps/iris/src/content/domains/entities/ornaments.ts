const KNOWN_ORNAMENT_LABELS: Record<string, string> = {
  peFRACK: 'Fracker Beacon',
  peNIA: 'Niantic Beacon',
  peNEMESIS: 'Nemesis Beacon',
  peTOASTY: 'Toasty Beacon',
  peFW_ENL: 'Enlightened Fireworks',
  peFW_RES: 'Resistance Fireworks',
  peBN_BLM: 'Black Lives Matter Beacon',
  peBB_BATTLE_RARE: 'Rare Battle Beacon',
  peBB_BATTLE: 'Battle Beacon',
  peBN_ENL_WINNER: 'Enlightened Winner Beacon',
  peBN_RES_WINNER: 'Resistance Winner Beacon',
  peBN_TIED_WINNER: 'Tied Winner Beacon',
  'peBN_ENL_WINNER-60': 'Enlightened Winner Beacon (60)',
  'peBN_RES_WINNER-60': 'Resistance Winner Beacon (60)',
  'peBN_TIED_WINNER-60': 'Tied Winner Beacon (60)',
  'peBR_REWARD-10_125_38': 'Battle Reward CAT-1',
  'peBR_REWARD-10_150_75': 'Battle Reward CAT-2',
  'peBR_REWARD-10_175_113': 'Battle Reward CAT-3',
  'peBR_REWARD-10_200_150': 'Battle Reward CAT-4',
  'peBR_REWARD-10_225_188': 'Battle Reward CAT-5',
  'peBR_REWARD-10_250_225': 'Battle Reward CAT-6',
  peLOOK: 'Shard',
  sc5_p: 'Volatile Scouting Portal',
  bb_s: 'Scheduled Rare Battle Beacon',
};

const ANOMALY_BASE_IDS = ['ap1', 'ap2', 'ap3', 'ap4', 'ap5', 'ap6', 'ap7', 'ap8', 'ap9'];
const ANOMALY_SUFFIXES = ['', '_v', '_start', '_end'];

function getAnomalyOrnamentLabel(ornamentId: string): string | null {
  for (const baseId of ANOMALY_BASE_IDS) {
    if (ornamentId === baseId) {
      return `Anomaly Cluster Portal ${baseId.slice(2)}`;
    }
    if (ornamentId === `${baseId}_v`) {
      return `Anomaly Volatile Portal ${baseId.slice(2)}`;
    }
    if (ornamentId === `${baseId}_start`) {
      return `Anomaly Meeting Point ${baseId.slice(2)}`;
    }
    if (ornamentId === `${baseId}_end`) {
      return `Anomaly Finish Point ${baseId.slice(2)}`;
    }
  }

  return null;
}

export function getOrnamentLabel(ornamentId: string): string {
  const anomalyLabel = getAnomalyOrnamentLabel(ornamentId);
  if (anomalyLabel) {
    return anomalyLabel;
  }

  return KNOWN_ORNAMENT_LABELS[ornamentId] || ornamentId;
}

export function getKnownOrnamentIds(): string[] {
  const anomalyIds = ANOMALY_BASE_IDS.flatMap((baseId) =>
    ANOMALY_SUFFIXES.map((suffix) => `${baseId}${suffix}`)
  );

  return [
    ...anomalyIds,
    ...Object.keys(KNOWN_ORNAMENT_LABELS),
  ];
}
