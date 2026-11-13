import {describe, expect, it} from 'vitest';
import {getIitcCheckpointTime, getIitcRegionProjection, IITC_CYCLE_DURATION, parseIitcRegionScoreResponse} from './region-scoreboard';

const response = {result: {regionName: 'Cell', gameScore: ['120', '50'], scoreHistory: [
  ['3', '300', '90'], ['1', '100', '10'], ['2', '200', '50'], ['2', '200', '50'], ['0', '9', '9'], ['36', '9', '9'], ['4', 'bad', '9'],
], topAgents: [{nick: 'Agent', team: 'RESISTANCE'}]}};

describe('IITC regional scoreboard', () => {
  it('retains sorted, unique valid checkpoints and assigns the response to an epoch-aligned cycle', () => {
    const result = parseIitcRegionScoreResponse(response, IITC_CYCLE_DURATION + 1);
    expect(result).toMatchObject({name: 'Cell', enlightenedAvg: 120, resistanceAvg: 50,
      checkpoints: 3, lastCheckpoint: 3, cycleStart: IITC_CYCLE_DURATION, topAgentList: [{nick: 'Agent', team: 'R'}]});
    expect(result?.scoreHistory.map(row => row.checkpoint)).toEqual([1, 2, 3]);
    expect(getIitcCheckpointTime(result?.cycleStart ?? 0, 35)).toBe(2 * IITC_CYCLE_DURATION);
    expect(parseIitcRegionScoreResponse(response, IITC_CYCLE_DURATION - 1)?.cycleStart).toBe(0);
  });
  it.each([null, {}, {result: false}, {result: {}}, {result: {...response.result, gameScore: ['oops', 1]}}])(
    'rejects malformed regional scores', input => expect(parseIitcRegionScoreResponse(input)).toBeUndefined(),
  );
  it('uses the lower median, preserves totals and estimates missing checkpoints', () => {
    const projection = getIitcRegionProjection([{checkpoint: 1, enlightened: 100, resistance: 10},
      {checkpoint: 3, enlightened: 300, resistance: 50}]);
    expect(projection.enlightened).toEqual({total: 400, median: 100, estimate: 105});
    expect(projection.resistance).toEqual({total: 60, median: 10, estimate: 11});
    expect(projection.trailingTeam).toBe('R');
    expect(projection.requiredMu).toBe(3291);
    expect(getIitcRegionProjection([]).enlightened.estimate).toBe(0);
  });
});
