import type {
  ClutchCounts,
  MapPlayerStatsInput,
  MapPointsBreakdown,
  MultikillCounts,
} from './types';

const pointsPerKill = 3.0;
const pointsPerFirstKillBonus = 2.0;
const pointsPerAssist = 1.5;
const pointsPerFirstDeath = -1.0;
const pointsHighestOnMap = 2.0;
const pointsTeamMatchWin = 3.0;
/** Clutch: +1 per X (1v1 = +1, 1v2 = +2, 1v4 = +4, etc.). */
const clutchPointsPerX = 1.0;
/** Multikill: +1 per multikill round (2K, 3K, 4K, 5K each count as 1). */
const pointsPerMultikill = 1.0;

function clutchPoints(c: ClutchCounts | undefined): number {
  if (!c) return 0;
  return (
    c.clutch1v1 * 1 * clutchPointsPerX +
    c.clutch1v2 * 2 * clutchPointsPerX +
    c.clutch1v3 * 3 * clutchPointsPerX +
    c.clutch1v4 * 4 * clutchPointsPerX +
    c.clutch1v5 * 5 * clutchPointsPerX
  );
}

//fix

function emptyClutches(): ClutchCounts {
  return { clutch1v1: 0, clutch1v2: 0, clutch1v3: 0, clutch1v4: 0, clutch1v5: 0 };
}

function emptyMultikills(): MultikillCounts {
  return { k2: 0, k3: 0, k4: 0, k5: 0 };
}

function multikillPoints(m: MultikillCounts | undefined): number {
  if (!m) return 0;
  return (m.k2 + m.k3 + m.k4 + m.k5) * pointsPerMultikill;
}

export const fantasyScoring = {
  pointsForMap(input: MapPlayerStatsInput, allPlayersOnMap: MapPlayerStatsInput[]): number {
    const b = this.pointsForMapBreakdown(input, allPlayersOnMap, 0);
    return b.total;
  },

  /**
   * Returns per-map point breakdown (stats + point contributions) for display.
   * winBonus is added to total when provided (e.g. for completed matches).
   */
  pointsForMapBreakdown(
    input: MapPlayerStatsInput,
    allPlayersOnMap: MapPlayerStatsInput[],
    winBonus: number,
    extra?: { clutches?: ClutchCounts; multikills?: MultikillCounts }
  ): MapPointsBreakdown {
    const killsPts = input.kills * pointsPerKill;
    const firstKillsPts = input.firstKills * pointsPerFirstKillBonus;
    const assistsPts = input.assists * pointsPerAssist;
    const firstDeathsPts = input.firstDeaths * pointsPerFirstDeath;
    const c = extra?.clutches ?? input.clutches ?? emptyClutches();
    const clutchPts = clutchPoints(extra?.clutches ?? input.clutches);
    const multikills = extra?.multikills ?? emptyMultikills();
    const multikillPts = multikillPoints(extra?.multikills);

    const acsMax = Math.max(0, ...allPlayersOnMap.map((p) => p.acs));
    const kastMax = Math.max(0, ...allPlayersOnMap.map((p) => p.kastPercent));
    const adrMax = Math.max(0, ...allPlayersOnMap.map((p) => p.adr));
    const hsMax = Math.max(0, ...allPlayersOnMap.map((p) => p.hsPercent));

    const acsBonus = input.acs > 0 && input.acs >= acsMax ? pointsHighestOnMap : 0;
    const kastBonus = input.kastPercent > 0 && input.kastPercent >= kastMax ? pointsHighestOnMap : 0;
    const adrBonus = input.adr > 0 && input.adr >= adrMax ? pointsHighestOnMap : 0;
    const hsBonus = input.hsPercent > 0 && input.hsPercent >= hsMax ? pointsHighestOnMap : 0;

    const total =
      killsPts +
      firstKillsPts +
      assistsPts +
      firstDeathsPts +
      clutchPts +
      multikillPts +
      acsBonus +
      kastBonus +
      adrBonus +
      hsBonus +
      winBonus;

    return {
      stats: {
        kills: input.kills,
        firstKills: input.firstKills,
        assists: input.assists,
        firstDeaths: input.firstDeaths,
        acs: input.acs,
        kastPercent: input.kastPercent,
        adr: input.adr,
        hsPercent: input.hsPercent,
        clutches: c,
        multikills,
      },
      points: {
        kills: killsPts,
        firstKills: firstKillsPts,
        assists: assistsPts,
        firstDeaths: firstDeathsPts,
        clutch: clutchPts,
        multikill: multikillPts,
        acsBonus,
        kastBonus,
        adrBonus,
        hsBonus,
        winBonus,
      },
      total,
    };
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
