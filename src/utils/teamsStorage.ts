import type { FantasyTeam, FantasyRosterSlot } from '../types';

const FANTASY_TEAMS_KEY = 'fantasyTeams';

export function getTeams(): FantasyTeam[] {
  try {
    const raw = localStorage.getItem(FANTASY_TEAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FantasyTeam[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeams(teams: FantasyTeam[]): void {
  localStorage.setItem(FANTASY_TEAMS_KEY, JSON.stringify(teams));
}

export function addTeam(label: string): FantasyTeam {
  const teams = getTeams();
  const team: FantasyTeam = {
    id: crypto.randomUUID(),
    label: label.trim() || 'Unnamed team',
    players: [],
  };
  teams.push(team);
  saveTeams(teams);
  return team;
}

export function updateTeam(id: string, updates: Partial<Pick<FantasyTeam, 'label'>>): FantasyTeam | null {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  if (updates.label !== undefined) teams[idx].label = updates.label.trim() || teams[idx].label;
  saveTeams(teams);
  return teams[idx];
}

export function deleteTeam(id: string): boolean {
  const teams = getTeams().filter((t) => t.id !== id);
  if (teams.length === getTeams().length) return false;
  saveTeams(teams);
  return true;
}

export function addPlayerToTeam(teamId: string, player: FantasyRosterSlot): FantasyTeam | null {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.id === teamId);
  if (idx === -1) return null;
  const already = teams[idx].players.some(
    (p) => p.playerName === player.playerName && p.teamName === player.teamName
  );
  if (!already) teams[idx].players.push(player);
  saveTeams(teams);
  return teams[idx];
}

export function removePlayerFromTeam(
  teamId: string,
  player: FantasyRosterSlot
): FantasyTeam | null {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.id === teamId);
  if (idx === -1) return null;
  teams[idx].players = teams[idx].players.filter(
    (p) => !(p.playerName === player.playerName && p.teamName === player.teamName)
  );
  saveTeams(teams);
  return teams[idx];
}
