export type DraftPhase = '0-0' | '1-0/0-1' | '1-1';

export type DraftStatus = 'setup' | 'drafting' | 'completed';

export type PlayerRole = 'duelist' | 'flex' | 'senti' | 'controller' | 'initiator' | 'senti_controller_initiator';

export interface RoleConstraint {
  slot: number;
  role: PlayerRole;
}

export interface DraftRoomRow {
  id: string;
  league_id?: string | null;
  event_id: string;
  event_name: string;
  phase: DraftPhase;
  slot_count: number;
  role_constraints: RoleConstraint[] | null;
  player_roles: Record<string, PlayerRole> | null;
  participant_names: string[];
  snake_order: number[];
  current_round: number;
  current_pick_index: number;
  status: DraftStatus;
  matchups: DraftMatchupRound[] | null;
  created_at: string;
  updated_at: string;
}

export interface DraftPickRow {
  id: string;
  room_id: string;
  round: number;
  pick_index: number;
  participant_index: number;
  player_key: string;
  player_name: string;
  team_name: string;
  role: string | null;
  created_at: string;
}

export interface DraftMatchupRound {
  round: number;
  pairs: [string, string][];
}

export function playerKey(playerName: string, teamName: string): string {
  return `${playerName}|${teamName}`;
}
