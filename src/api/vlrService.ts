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
import type { ClutchCounts, MultikillCounts } from '../types';
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
  /** Headshot % (0–100). API may use hs, hs_pct, headshot, headshot_pct, hs%. */
  hs?: string | number;
  hs_pct?: string | number;
  headshot?: string | number;
  headshot_pct?: string | number;
  'hs%'?: string;
  /** KAST % (0–100). API may use kast, kast_pct, kast%. */
  kast?: string | number;
  kast_pct?: string | number;
  'kast%'?: string;
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
        date: seg.date,
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

/** Advanced stats columns: Col1 ignored; Col2–5 = 2K–5K; Col6–10 = 1v1–1v5 clutches. */
function clutchesFromAdvancedStat(entry: V2AdvancedStatEntry): ClutchCounts {
  return {
    clutch1v1: parseNum(entry['6']),
    clutch1v2: parseNum(entry['7']),
    clutch1v3: parseNum(entry['8']),
    clutch1v4: parseNum(entry['9']),
    clutch1v5: parseNum(entry['10']),
  };
}

/** Advanced stats columns: Col2 = 2K, Col3 = 3K, Col4 = 4K, Col5 = 5K. Col1 ignored. */
function multikillsFromAdvancedStat(entry: V2AdvancedStatEntry): MultikillCounts {
  return {
    k2: parseNum(entry['2']),
    k3: parseNum(entry['3']),
    k4: parseNum(entry['4']),
    k5: parseNum(entry['5']),
  };
}

function normalizePlayerKey(raw: string): string {
  return raw.replace(/\s/g, '').toLowerCase();
}

/** Find the advanced_stats row for a player by substring match on name (case/space-insensitive). */
function findAdvancedStatsEntryForPlayer(
  entries: V2AdvancedStatEntry[] | undefined,
  playerName: string
): V2AdvancedStatEntry | undefined {
  if (!entries || !entries.length) return undefined;
  const normName = normalizePlayerKey(playerName);
  for (const e of entries) {
    const raw = (e.player ?? '').trim();
    if (!raw) continue;
    const normPlayer = normalizePlayerKey(raw);
    if (normPlayer.includes(normName) || normName.includes(normPlayer)) {
      return e;
    }
  }
  return undefined;
}

/** Clutch points from counts: +1 per X (1v1=1, 1v2=2, ...). */
function clutchPointsFromCounts(c: ClutchCounts): number {
  return c.clutch1v1 * 1 + c.clutch1v2 * 2 + c.clutch1v3 * 3 + c.clutch1v4 * 4 + c.clutch1v5 * 5;
}

/** Parse percentage from API (may be "42" or "42%" or 42). Clamp 0–100. */
function parsePercent(val: string | number | undefined): number {
  if (val == null) return 0;
  const s = typeof val === 'string' ? val.replace(/%/g, '').trim() : String(val);
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
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
  const hsPercent = parsePercent(p.hs ?? p.hs_pct ?? p['hs%'] ?? p.headshot ?? p.headshot_pct);
  const kastPercent = parsePercent(p.kast ?? p.kast_pct ?? p['kast%']);
  return {
    name,
    kills: parseInt(p.kills ?? '0', 10) || 0,
    firstKills: parseInt(p.fk ?? '0', 10) || 0,
    firstDeaths: parseInt(p.fd ?? '0', 10) || 0,
    assists: parseInt(p.assists ?? '0', 10) || 0,
    acs: parseFloat(p.acs ?? '0') || 0,
    kastPercent,
    adr: parseFloat(p.adr ?? '0') || 0,
    hsPercent,
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

const MONTH_NAMES =
  'january|february|march|april|may|june|july|august|september|october|november|december';
const MONTH_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Normalize API date to YYYY-MM-DD. Handles:
 * - ISO (2025-03-06)
 * - new Date() parseable strings
 * - "Friday, March 61:00 PM EST" (day and time concatenated → March 6)
 */
export function normalizeMatchDate(dateStr: string | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const re = new RegExp(
    `(${MONTH_NAMES})\\s+(?:the\\s+)?(\\d{1,2})`,
    'i'
  );
  const match = s.match(re);
  if (match) {
    const monthName = match[1].toLowerCase();
    let dayNum = parseInt(match[2], 10);
    if (dayNum > 31) dayNum = Math.floor(dayNum / 10);
    if (dayNum < 1 || dayNum > 31) return null;
    const month = MONTH_NUM[monthName];
    if (!month) return null;
    const year = new Date().getFullYear();
    const y = String(year);
    const m = String(month).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return null;
}

const WEEK_STAGE_RE = /\bweek\s*(\d+)\b/i;

function parseMatchWeek(stage: string | undefined): number | null {
  if (!stage || !stage.trim()) return null;
  const m = stage.match(WEEK_STAGE_RE);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isInteger(n) ? n : null;
}

/** True if match stage is Upper Quarterfinals or later (playoff bracket). */
export function isPlayoffsStage(stage: string | undefined): boolean {
  if (!stage || !stage.trim()) return false;
  const s = stage.toLowerCase().replace(/-/g, ' ');
  return (
    s.includes('upper quarterfinal') ||
    s.includes('quarterfinal') ||
    s.includes('quarter final') ||
    s.includes('upper semifinal') ||
    s.includes('semifinal') ||
    s.includes('upper final') ||
    s.includes('lower round') ||
    s.includes('lower final') ||
    s.includes('grand final') ||
    s.includes('playoff')
  );
}

/** True if match stage is a Lower bracket round (loser is eliminated). */
function isLowerBracketMatch(stage: string | undefined): boolean {
  if (!stage || !stage.trim()) return false;
  const s = stage.toLowerCase().replace(/-/g, ' ');
  return s.includes('lower round') || s.includes('lower final');
}

/**
 * Team names that (1) appear in at least one playoff-stage match (Upper Quarterfinals or later)
 * and (2) have not been eliminated by losing a Lower bracket match.
 * Excludes Swiss-eliminated teams (no playoff match) and Lower-bracket losers.
 */
export function getPlayoffTeamNames(matches: EventMatchItemNorm[]): Set<string> {
  const playoffTeams = new Set<string>();
  const eliminated = new Set<string>();

  for (const m of matches) {
    if (!isPlayoffsStage(m.stage)) continue;
    if (m.team1Name && m.team1Name !== 'TBD') playoffTeams.add(m.team1Name);
    if (m.team2Name && m.team2Name !== 'TBD') playoffTeams.add(m.team2Name);

    if (isLowerBracketMatch(m.stage) && m.status === 'completed') {
      const s1 = m.team1Score ?? -1;
      const s2 = m.team2Score ?? -1;
      if (s1 < s2 && m.team1Name && m.team1Name !== 'TBD') eliminated.add(m.team1Name);
      else if (s2 < s1 && m.team2Name && m.team2Name !== 'TBD') eliminated.add(m.team2Name);
    }
  }

  const names = new Set<string>();
  for (const t of playoffTeams) {
    if (!eliminated.has(t)) names.add(t);
  }
  return names;
}

/** Score group-stage matches for Week 1–5. Optionally restrict to selected week numbers. */
export async function fetchPerPlayerMapPoints(
  eventId: string,
  options?: { matchFilter?: MatchFilter; selectedWeeks?: number[] }
): Promise<PerPlayerMapPointsResult> {
  const matches = await fetchEventMatches(eventId, 50);
  const withTeams = matches.filter((m) => m.team1Name !== 'TBD' && m.team2Name !== 'TBD');
  const scoreableStatuses: MatchStatus[] = ['completed', 'live', 'ongoing'];
  const toScore = withTeams.filter((m) => scoreableStatuses.includes(m.status));
  let toScoreFiltered = toScore;
  if (options?.matchFilter) toScoreFiltered = toScoreFiltered.filter(options.matchFilter);

  // Restrict scoring to the regular-week labels on the event page (Week 1–Week 5).
  toScoreFiltered = toScoreFiltered.filter((m) => {
    const week = parseMatchWeek(m.stage);
    return week !== null && week >= 1 && week <= 5;
  });

  const selectedWeekSet =
    options?.selectedWeeks && options.selectedWeeks.length > 0
      ? new Set(options.selectedWeeks)
      : null;
  if (selectedWeekSet) {
    toScoreFiltered = toScoreFiltered.filter((m) => {
      const week = parseMatchWeek(m.stage);
      return week !== null && selectedWeekSet.has(week);
    });
  }

  const mapPoints: Record<string, number[]> = {};
  const mapBreakdowns: Record<string, MapPointsBreakdown[]> = {};

  for (const match of toScoreFiltered) {
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
          const entry = findAdvancedStatsEntryForPlayer(advancedStats, input.name);
          if (entry) {
            const matchClutches = clutchesFromAdvancedStat(entry);
            const totalClutchPts = clutchPointsFromCounts(matchClutches);
            const clutchPerMap = totalClutchPts / numMaps;
            breakdown.total += clutchPerMap;
            breakdown.points.clutch += clutchPerMap;
            breakdown.stats.clutches = matchClutches;

            const matchMultikills = multikillsFromAdvancedStat(entry);
            const totalMultikillPts =
              (matchMultikills.k2 + matchMultikills.k3 + matchMultikills.k4 + matchMultikills.k5) * 1;
            const multikillPerMap = totalMultikillPts / numMaps;
            breakdown.total += multikillPerMap;
            breakdown.points.multikill += multikillPerMap;
            breakdown.stats.multikills = matchMultikills;
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
  return fetchPerPlayerMapPoints(eventId, { matchFilter: phaseMatchFilter(phase) });
}
