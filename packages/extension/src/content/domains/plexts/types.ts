export interface PlextData {
  result?: [string, number, {
    plext: {
      text: string;
      markup: unknown[];
      categories: number;
      team: string;
      plextType: 'PLAYER_GENERATED' | 'SYSTEM_BROADCAST' | 'SYSTEM_NARROWCAST';
    };
  }][];
}
