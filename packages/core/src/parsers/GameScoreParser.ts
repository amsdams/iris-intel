import { GameScoreData } from './intel-types';

export const GameScoreParser = {
  parse: (data: GameScoreData): { enlightened: number; resistance: number } => {
    const [enlightened, resistance] = data.result || [0, 0];
    return {
      enlightened: parseInt(String(enlightened), 10),
      resistance: parseInt(String(resistance), 10),
    };
  }
};
