export function parseGameScore(data: { result?: [number, number] }): { enlightened: number; resistance: number } {
  const [enlightened, resistance] = data.result || [0, 0];
  return {
    enlightened: parseInt(String(enlightened), 10),
    resistance: parseInt(String(resistance), 10),
  };
}
