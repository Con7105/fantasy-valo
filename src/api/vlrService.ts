import { apiGet } from './client';
import type { MatchStatus } from '../types';
import {
  eventItemFromApi,
  eventMatchFromApi,
  type EventItemNorm,
  type EventMatchItemNorm,
  type EventPlayerStatNorm,
  type MapPlayerStatsInput,
  type MapPointsBreakdown,
} from '../types';
import type { ClutchCounts } from '../types';
import { fantasyScoring } from '../scoring';

// V2 API response shapes
interface V2Wrapper<T> {
  status: string;
  data: T;
}
interface V2SegmentsData<T> {
  segments: T[];
}
interface V2EventSegment {
  title: string;
  status?: string;
  prize?: string;
  dates?: string;
  region?: string;
  thumb?: string;
  url_path?: string;
}
interface V2MatchSegment {
  match_id?: string;
  url?: string;
  date?: string;
  status?: string;
  event_series?: string;
  team1?: { name: string; score?: string; is_winner?: boolean };
  team2?: { name: string; score?: string; is_winner?: boolean };
}
/** One row from performance.advanced_stats – keys "1"-"13" match VLR columns (2K,3K,4K,5K, 1v1-1v5, ECON, PL, DE). */
interface V2AdvancedStatEntry {
  player?: string;
  '1'?: string;
  '2'?: string;
  '3'?: string;
  '4'?: string;
  '5'?: string;
  '6'?: string;
  '7'?: string;
  '8'?: string;
  '9'?: string;
  '10'?: string;
  '11'?: string;
  '12'?: string;
  '13'?: string;
  [key: string]: string | undefined;
}

interface V2MatchDetailSegment {
  match_id?: string;
  teams?: { name: string; score?: string }[];
  maps?: {
    map_name?: string;
    players?: {
      team1?: V2PlayerStat[];
      team2?: V2PlayerStat[];
    };
  }[];
  performance?: {
    advanced_stats?: V2AdvancedStatEntry[];
  };
}
interface V2PlayerStat {
  name?: string;
  acs?: string;
  kills?: string;
  deaths?: string;
  assists?: string;
  rating?: string;
  adr?: string;
  fk?: string;
  fd?: string;
  /** Clutch counts – API may use clutch_1v1 or literal "1v1" etc. */
  clutch_1v1?: string | number;
  clutch_1v2?: string | number;
  clutch_1v3?: string | number;
  clutch_1v4?: string | number;
  clutch_1v5?: string | number;
  '1v1'?: string | number;
  '1v2'?: string | number;
  '1v3'?: string | number;
  '1v4'?: string | number;
  '1v5'?: string | number;
  clutch1v1?: string | number;
  clutch1v2?: string | number;
  clutch1v3?: string | number;
  clutch1v4?: string | number;
  clutch1v5?: string | number;
}

function extractEventId(urlPath: string | undefined): string | null {
  if (!urlPath) return null;
  const parts = urlPath.split('/');
  const idx = parts.indexOf('event');
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1];
}

function mapStatus(s: string | undefined): MatchStatus {
  switch (s?.toLowerCase()) {
    case 'upcoming':
      return 'upcoming';
    case 'live':
      return 'live';
    case 'ongoing':
      return 'ongoing';
    case 'completed':
      return 'completed';
    default:
      return 'unknown';
  }
}

function parseScore(s: string | undefined): number | undefined {
  if (s == null) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

export async function fetchEvents(count = 60): Promise<EventItemNorm[]> {
  const data = await apiGet<V2Wrapper<V2SegmentsData<V2EventSegment>>>('v2/events');
  const segments = data.data?.segments ?? [];
  const events: EventItemNorm[] = [];
  for (const seg of segments) {
    const id = extractEventId(seg.url_path);
    if (!id) continue;
    events.push(
      eventItemFromApi({
        id,
        name: seg.title,
        url: seg.url_path ?? '',
        logo_url: seg.thumb,
        region: seg.region,
        status: mapStatus(seg.status),
        prize_pool: seg.prize,
      })
    );
  }
  return events.slice(0, count);
}

export async function fetchEventMatches(
  eventId: string,
  count = 50
): Promise<EventMatchItemNorm[]> {
  const data = await apiGet<V2Wrapper<V2SegmentsData<V2MatchSegment>>>('v2/events/matches', {
    event_id: eventId,
  });
  const segments = data.data?.segments ?? [];
  const matches: EventMatchItemNorm[] = [];
  for (const seg of segments.slice(0, count)) {
    const matchId = seg.match_id;
    if (!matchId) continue;
    matches.push(
      eventMatchFromApi({
        id: matchId,
        url: seg.url ?? '',
        stage: seg.event_series,
        team1_name: seg.team1?.name ?? 'TBD',
        team2_name: seg.team2?.name ?? 'TBD',
        team1_score: parseScore(seg.team1?.score),
        team2_score: parseScore(seg.team2?.score),
        status: mapStatus(seg.status),
      })
    );
  }
  return matches;
}

async function fetchMatchDetail(matchId: string): Promise<V2MatchDetailSegment | null> {
  try {
    const data = await apiGet<V2Wrapper<V2SegmentsData<V2MatchDetailSegment>>>(
      'v2/match/details',
      { match_id: matchId }
    );
    const seg = data.data?.segments?.[0];
    return seg ?? null;
  } catch {
    return null;
  }
}

function parseNum(v: string | number | undefined): number {
  if (v === undefined) return 0;
  if (typeof v === 'number') return Math.max(0, v);
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}

/** Read clutch count from API – tries clutch_1v1, 1v1, and clutch1v1 style keys. */
function getClutch(p: V2PlayerStat, key: '1v1' | '1v2' | '1v3' | '1v4' | '1v5'): number {
  const snake = `clutch_${key}` as keyof V2PlayerStat;
  const noUnderscore = `clutch${key}` as keyof V2PlayerStat;
  const val = p[snake] ?? p[key] ?? p[noUnderscore];
  return parseNum(val as string | number | undefined);
}

/** Keys 6–10 in advanced_stats = 1v1, 1v2, 1v3, 1v4, 1v5. Returns clutch counts from one row. */
function clutchesFromAdvancedStat(entry: V2AdvancedStatEntry): ClutchCounts {
  return {
    clutch1v1: parseNum(entry['6']),
    clutch1v2: parseNum(entry['7']),
    clutch1v3: parseNum(entry['8']),
    clutch1v4: parseNum(entry['9']),
    clutch1v5: parseNum(entry['10']),
  };
}

/** Build map: normalized player id (e.g. "NoManXLG") -> ClutchCounts. Match-level stats. */
function buildClutchMapFromAdvancedStats(entries: V2AdvancedStatEntry[]): Map<string, ClutchCounts> {
  const map = new Map<string, ClutchCounts>();
  for (const e of entries ?? []) {
    const id = (e.player ?? '').trim().replace(/\s/g, '').toLowerCase();
    if (!id) continue;
    const clutches = clutchesFromAdvancedStat(e);
    const hasAny = clutches.clutch1v1 + clutches.clutch1v2 + clutches.clutch1v3 + clutches.clutch1v4 + clutches.clutch1v5 > 0;
    if (hasAny) map.set(id, clutches);
  }
  return map;
}

/** Normalize player key for lookup: "NoMan" + "XLG" -> "nomanxlg". */
function playerKeyForClutchLookup(name: string, team: string): string {
  return (name + team).replace(/\s/g, '').toLowerCase();
}

/** Clutch points from counts: +1 per X (1v1=1, 1v2=2, ...). */
function clutchPointsFromCounts(c: ClutchCounts): number {
  return c.clutch1v1 * 1 + c.clutch1v2 * 2 + c.clutch1v3 * 3 + c.clutch1v4 * 4 + c.clutch1v5 * 5;
}

function v2ToInput(p: V2PlayerStat, team: string): MapPlayerStatsInput | null {
  const name = p.name?.trim();
  if (!name) return null;
  const clutches: ClutchCounts = {
    clutch1v1: getClutch(p, '1v1'),
    clutch1v2: getClutch(p, '1v2'),
    clutch1v3: getClutch(p, '1v3'),
    clutch1v4: getClutch(p, '1v4'),
    clutch1v5: getClutch(p, '1v5'),
  };
  return {
    name,
    kills: parseInt(p.kills ?? '0', 10) || 0,
    firstKills: parseInt(p.fk ?? '0', 10) || 0,
    firstDeaths: parseInt(p.fd ?? '0', 10) || 0,
    assists: parseInt(p.assists ?? '0', 10) || 0,
    acs: parseFloat(p.acs ?? '0') || 0,
    kastPercent: 0,
    adr: parseFloat(p.adr ?? '0') || 0,
    hsPercent: 0,
    team,
    clutches,
  };
}

export async function fetchEventStats(eventId: string): Promise<EventPlayerStatNorm[]> {
  const matches = await fetchEventMatches(eventId, 50);
  const realMatches = matches.filter((m) => m.team1Name !== 'TBD' && m.team2Name !== 'TBD');

  const accumulators = new Map<
    string,
    {
      playerName: string;
      teamName: string;
      totalAcs: number;
      totalKills: number;
      totalDeaths: number;
      totalAssists: number;
      totalFirstKills: number;
      totalFirstDeaths: number;
      totalRating: number;
      totalAdr: number;
      mapCount: number;
    }
  >();

  for (const match of realMatches) {
    const detail = await fetchMatchDetail(match.id);
    if (!detail) continue;

    const team1Name = detail.teams?.[0]?.name ?? match.team1Name;
    const team2Name = (detail.teams?.length ?? 0) > 1 ? detail.teams![1].name : match.team2Name;

    for (const map of detail.maps ?? []) {
      const team1 = map.players?.team1 ?? [];
      const team2 = map.players?.team2 ?? [];
      const hasStats = team1.some((pl) => parseInt(pl.kills ?? '', 10) !== undefined);

      for (const player of team1) {
        const key = `${player.name}|${team1Name}`;
        let acc = accumulators.get(key);
        if (!acc) {
          acc = {
            playerName: player.name ?? '',
            teamName: team1Name,
            totalAcs: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalFirstKills: 0,
            totalFirstDeaths: 0,
            totalRating: 0,
            totalAdr: 0,
            mapCount: 0,
          };
          accumulators.set(key, acc);
        }
        if (hasStats) {
          acc.totalAcs += parseFloat(player.acs ?? '0') || 0;
          acc.totalKills += parseInt(player.kills ?? '0', 10) || 0;
          acc.totalDeaths += parseInt(player.deaths ?? '0', 10) || 0;
          acc.totalAssists += parseInt(player.assists ?? '0', 10) || 0;
          acc.totalFirstKills += parseInt(player.fk ?? '0', 10) || 0;
          acc.totalFirstDeaths += parseInt(player.fd ?? '0', 10) || 0;
          acc.totalRating += parseFloat(player.rating ?? '0') || 0;
          acc.totalAdr += parseFloat(player.adr ?? '0') || 0;
          acc.mapCount += 1;
        }
      }
      for (const player of team2) {
        const key = `${player.name}|${team2Name}`;
        let acc = accumulators.get(key);
        if (!acc) {
          acc = {
            playerName: player.name ?? '',
            teamName: team2Name,
            totalAcs: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalAssists: 0,
            totalFirstKills: 0,
            totalFirstDeaths: 0,
            totalRating: 0,
            totalAdr: 0,
            mapCount: 0,
          };
          accumulators.set(key, acc);
        }
        if (hasStats) {
          acc.totalAcs += parseFloat(player.acs ?? '0') || 0;
          acc.totalKills += parseInt(player.kills ?? '0', 10) || 0;
          acc.totalDeaths += parseInt(player.deaths ?? '0', 10) || 0;
          acc.totalAssists += parseInt(player.assists ?? '0', 10) || 0;
          acc.totalFirstKills += parseInt(player.fk ?? '0', 10) || 0;
          acc.totalFirstDeaths += parseInt(player.fd ?? '0', 10) || 0;
          acc.totalRating += parseFloat(player.rating ?? '0') || 0;
          acc.totalAdr += parseFloat(player.adr ?? '0') || 0;
          acc.mapCount += 1;
        }
      }
    }
  }

  const stats: EventPlayerStatNorm[] = Array.from(accumulators.values()).map((acc) => {
    const maps = Math.max(acc.mapCount, 1);
    const avgAcs = acc.mapCount > 0 ? acc.totalAcs / maps : 0;
    const avgRating = acc.mapCount > 0 ? acc.totalRating / maps : 0;
    const avgAdr = acc.mapCount > 0 ? acc.totalAdr / maps : 0;
    const kd = acc.totalDeaths > 0 ? acc.totalKills / acc.totalDeaths : 0;
    return {
      playerName: acc.playerName,
      playerUrl: undefined,
      teamName: acc.teamName,
      roundsPlayed: 0,
      rating: avgRating,
      acs: avgAcs,
      kdRatio: kd,
      adr: avgAdr,
      kills: acc.totalKills,
      deaths: acc.totalDeaths,
      assists: acc.totalAssists,
      firstKills: acc.totalFirstKills,
      firstDeaths: acc.totalFirstDeaths,
    };
  });

  stats.sort(
    (a, b) =>
      a.teamName.localeCompare(b.teamName) || a.playerName.localeCompare(b.playerName)
  );
  return stats;
}

export type MatchFilter = (m: EventMatchItemNorm) => boolean;

export interface PerPlayerMapPointsResult {
  mapPoints: Record<string, number[]>;
  mapBreakdowns: Record<string, MapPointsBreakdown[]>;
}

export async function fetchPerPlayerMapPoints(
  eventId: string,
  matchFilter?: MatchFilter
): Promise<PerPlayerMapPointsResult> {
  const matches = await fetchEventMatches(eventId, 50);
  const scoreableStatuses: MatchStatus[] = ['completed', 'live', 'ongoing'];
  let toScore = matches.filter(
    (m) => scoreableStatuses.includes(m.status) && m.team1Name !== 'TBD' && m.team2Name !== 'TBD'
  );
  if (matchFilter) toScore = toScore.filter(matchFilter);

  const mapPoints: Record<string, number[]> = {};
  const mapBreakdowns: Record<string, MapPointsBreakdown[]> = {};

  for (const match of toScore) {
    const detail = await fetchMatchDetail(match.id);
    if (!detail) continue;

    const team1Name = detail.teams?.[0]?.name ?? match.team1Name;
    const team2Name = (detail.teams?.length ?? 0) > 1 ? detail.teams![1].name : match.team2Name;
    const s1 = parseScore(detail.teams?.[0]?.score);
    const s2 = (detail.teams?.length ?? 0) > 1 ? parseScore(detail.teams?.[1]?.score) : undefined;
    let winningTeamName: string | null = null;
    if (s1 != null && s2 != null) {
      if (s1 > s2) winningTeamName = team1Name;
      else if (s2 > s1) winningTeamName = team2Name;
    }

    const maps = detail.maps ?? [];
    const numMaps = Math.max(maps.length, 1);
    const winBonusPerMap = fantasyScoring.teamWinBonusPerMap(numMaps);

    const isCompleted = match.status === 'completed';
    const advancedStats = isCompleted ? (detail.performance?.advanced_stats ?? []) : [];
    const clutchMap = buildClutchMapFromAdvancedStats(advancedStats);

    for (const map of maps) {
      const t1 = map.players?.team1 ?? [];
      const t2 = map.players?.team2 ?? [];
      let allInputs: MapPlayerStatsInput[] = [
        ...t1.map((p) => v2ToInput(p, team1Name)).filter(Boolean),
        ...t2.map((p) => v2ToInput(p, team2Name)).filter(Boolean),
      ] as MapPlayerStatsInput[];

      if (isCompleted) {
        allInputs = allInputs.map((i) => ({ ...i, clutches: undefined }));
      }

      const mapPlayed =
        allInputs.length > 0 &&
        allInputs.some((i) => i.kills > 0 || i.firstDeaths > 0 || i.assists > 0);
      if (!mapPlayed) continue;

      for (const input of allInputs) {
        const winBonus =
          match.status === 'completed' && winningTeamName === input.team ? winBonusPerMap : 0;
        const breakdown = fantasyScoring.pointsForMapBreakdown(input, allInputs, winBonus);

        if (isCompleted) {
          const lookupKey = playerKeyForClutchLookup(input.name, input.team);
          const matchClutches = clutchMap.get(lookupKey);
          if (matchClutches) {
            const totalClutchPts = clutchPointsFromCounts(matchClutches);
            const clutchPerMap = totalClutchPts / numMaps;
            breakdown.total += clutchPerMap;
            breakdown.points.clutch += clutchPerMap;
            breakdown.stats.clutches = matchClutches;
          }
        }

        const key = `${input.name}|${input.team}`;
        const ptsList = mapPoints[key] ?? [];
        ptsList.push(breakdown.total);
        mapPoints[key] = ptsList;
        const bdList = mapBreakdowns[key] ?? [];
        bdList.push(breakdown);
        mapBreakdowns[key] = bdList;
      }
    }
  }

  return { mapPoints, mapBreakdowns };
}

const PHASE_STAGE_HINTS: Record<string, string[]> = {
  '0-0': ['round 1', '0-0', 'r1'],
  '1-0/0-1': ['round 2', '1-0', '0-1', 'r2'],
  '1-1': ['round 3', '1-1', 'r3'],
};

function phaseMatchFilter(phase: string): MatchFilter {
  const hints = PHASE_STAGE_HINTS[phase] ?? [];
  return (m) => {
    const s = (m.stage ?? '').toLowerCase();
    if (!s) return true;
    return hints.some((h) => s.includes(h));
  };
}

export async function fetchPerPlayerMapPointsForPhase(
  eventId: string,
  phase: string
): Promise<PerPlayerMapPointsResult> {
  return fetchPerPlayerMapPoints(eventId, phaseMatchFilter(phase));
}
