// API and app types (ported from Swift)

export type MatchStatus =
  | 'upcoming'
  | 'live'
  | 'ongoing'
  | 'completed'
  | 'unknown';

export interface EventItem {
  id: string;
  name: string;
  url: string;
  logo_url?: string;
  region?: string;
  status: MatchStatus;
  start_date?: string;
  end_date?: string;
  prize_pool?: string;
}

export interface EventMatchItem {
  id: string;
  url: string;
  stage?: string;
  team1_name: string;
  team2_name: string;
  team1_score?: number;
  team2_score?: number;
  status: MatchStatus;
  time?: string;
}

export interface EventPlayerStat {
  player_name: string;
  player_url?: string;
  team_name: string;
  rounds_played: number;
  rating: number;
  acs: number;
  kd_ratio: number;
  adr: number;
  kills: number;
  deaths: number;
  assists: number;
  first_kills: number;
  first_deaths: number;
}

export interface FantasyRosterSlot {
  playerName: string;
  teamName: string;
  playerUrl?: string;
}

export interface MapPlayerStatsInput {
  name: string;
  kills: number;
  firstKills: number;
  firstDeaths: number;
  assists: number;
  acs: number;
  kastPercent: number;
  adr: number;
  hsPercent: number;
  team: string;
}

// Normalized (camelCase) for app use
export interface EventItemNorm {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  region?: string;
  status: MatchStatus;
  startDate?: string;
  endDate?: string;
  prizePool?: string;
}

export interface EventMatchItemNorm {
  id: string;
  url: string;
  stage?: string;
  team1Name: string;
  team2Name: string;
  team1Score?: number;
  team2Score?: number;
  status: MatchStatus;
  time?: string;
}

export interface EventPlayerStatNorm {
  playerName: string;
  playerUrl?: string;
  teamName: string;
  roundsPlayed: number;
  rating: number;
  acs: number;
  kdRatio: number;
  adr: number;
  kills: number;
  deaths: number;
  assists: number;
  firstKills: number;
  firstDeaths: number;
}

export function eventItemFromApi(e: EventItem): EventItemNorm {
  return {
    id: e.id,
    name: e.name,
    url: e.url,
    logoUrl: e.logo_url,
    region: e.region,
    status: e.status,
    startDate: e.start_date,
    endDate: e.end_date,
    prizePool: e.prize_pool,
  };
}

export function eventMatchFromApi(m: EventMatchItem): EventMatchItemNorm {
  return {
    id: m.id,
    url: m.url,
    stage: m.stage,
    team1Name: m.team1_name,
    team2Name: m.team2_name,
    team1Score: m.team1_score,
    team2Score: m.team2_score,
    status: m.status,
    time: m.time,
  };
}

export function eventPlayerStatFromApi(s: EventPlayerStat): EventPlayerStatNorm {
  return {
    playerName: s.player_name,
    playerUrl: s.player_url,
    teamName: s.team_name,
    roundsPlayed: s.rounds_played,
    rating: s.rating,
    acs: s.acs,
    kdRatio: s.kd_ratio,
    adr: s.adr,
    kills: s.kills,
    deaths: s.deaths,
    assists: s.assists,
    firstKills: s.first_kills,
    firstDeaths: s.first_deaths,
  };
}
