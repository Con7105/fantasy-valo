export type LeagueStatus = 'joining' | 'drafting' | 'active';

export type LeagueWeekPhase = '0-0' | '1-0/0-1' | '1-1';

export type LeagueWeekStatus = 'pending' | 'scored';

export interface LeagueRow {
  id: string;
  name: string | null;
  event_id: string;
  event_name: string;
  status: LeagueStatus;
  draft_room_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueMemberRow {
  id: string;
  league_id: string;
  name: string;
  join_order: number;
  wins: number;
  created_at: string;
}

export interface LeagueWeekRow {
  id: string;
  league_id: string;
  week_number: number;
  phase: LeagueWeekPhase;
  matchups: [string, string][];
  scores: Record<string, number>;
  status: LeagueWeekStatus;
  created_at: string;
  updated_at: string;
}
