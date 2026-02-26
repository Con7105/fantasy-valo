import type { MapPlayerStatsInput } from './types';

const pointsPerKill = 3.0;
const pointsPerFirstKillBonus = 2.0;
const pointsPerAssist = 1.5;
const pointsPerFirstDeath = -1.0;
const pointsHighestOnMap = 2.0;
const pointsTeamMatchWin = 3.0;

export const fantasyScoring = {
  pointsForMap(input: MapPlayerStatsInput, allPlayersOnMap: MapPlayerStatsInput[]): number {
    let pts = 0;
    pts += input.kills * pointsPerKill;
    pts += input.firstKills * pointsPerFirstKillBonus;
    pts += input.assists * pointsPerAssist;
    pts += input.firstDeaths * pointsPerFirstDeath;

    const acsMax = Math.max(0, ...allPlayersOnMap.map((p) => p.acs));
    const kastMax = Math.max(0, ...allPlayersOnMap.map((p) => p.kastPercent));
    const adrMax = Math.max(0, ...allPlayersOnMap.map((p) => p.adr));
    const hsMax = Math.max(0, ...allPlayersOnMap.map((p) => p.hsPercent));

    if (input.acs > 0 && input.acs >= acsMax) pts += pointsHighestOnMap;
    if (input.kastPercent > 0 && input.kastPercent >= kastMax) pts += pointsHighestOnMap;
    if (input.adr > 0 && input.adr >= adrMax) pts += pointsHighestOnMap;
    if (input.hsPercent > 0 && input.hsPercent >= hsMax) pts += pointsHighestOnMap;

    return pts;
  },

  teamWinBonusPerMap(numMapsInMatch: number): number {
    if (numMapsInMatch <= 0) return 0;
    return pointsTeamMatchWin / numMapsInMatch;
  },

  finalScore(mapPoints: number[]): number {
    if (mapPoints.length === 0) return 0;
    const sum = mapPoints.reduce((a, b) => a + b, 0);
    const avg = sum / mapPoints.length;
    return Math.round(avg * 10) / 10;
  },
};
