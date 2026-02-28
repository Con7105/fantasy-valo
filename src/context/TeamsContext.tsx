import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { FantasyTeam, FantasyRosterSlot } from '../types';
import {
  getTeams,
  addTeam as addTeamStorage,
  updateTeam as updateTeamStorage,
  deleteTeam as deleteTeamStorage,
  addPlayerToTeam as addPlayerToTeamStorage,
  removePlayerFromTeam as removePlayerFromTeamStorage,
} from '../utils/teamsStorage';

interface TeamsContextValue {
  teams: FantasyTeam[];
  refresh: () => void;
  addTeam: (label: string) => FantasyTeam;
  updateTeam: (id: string, updates: Partial<Pick<FantasyTeam, 'label'>>) => FantasyTeam | null;
  deleteTeam: (id: string) => boolean;
  addPlayerToTeam: (teamId: string, player: FantasyRosterSlot) => FantasyTeam | null;
  removePlayerFromTeam: (teamId: string, player: FantasyRosterSlot) => FantasyTeam | null;
}

const TeamsContext = createContext<TeamsContextValue | null>(null);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<FantasyTeam[]>(() => getTeams());

  const refresh = useCallback(() => {
    setTeams(getTeams());
  }, []);

  const addTeam = useCallback((label: string) => {
    const team = addTeamStorage(label);
    setTeams(getTeams());
    return team;
  }, []);

  const updateTeam = useCallback((id: string, updates: Partial<Pick<FantasyTeam, 'label'>>) => {
    const updated = updateTeamStorage(id, updates);
    if (updated) setTeams(getTeams());
    return updated;
  }, []);

  const deleteTeam = useCallback((id: string) => {
    const ok = deleteTeamStorage(id);
    if (ok) setTeams(getTeams());
    return ok;
  }, []);

  const addPlayerToTeam = useCallback((teamId: string, player: FantasyRosterSlot) => {
    const updated = addPlayerToTeamStorage(teamId, player);
    if (updated) setTeams(getTeams());
    return updated;
  }, []);

  const removePlayerFromTeam = useCallback((teamId: string, player: FantasyRosterSlot) => {
    const updated = removePlayerFromTeamStorage(teamId, player);
    if (updated) setTeams(getTeams());
    return updated;
  }, []);

  const value = useMemo<TeamsContextValue>(
    () => ({
      teams,
      refresh,
      addTeam,
      updateTeam,
      deleteTeam,
      addPlayerToTeam,
      removePlayerFromTeam,
    }),
    [
      teams,
      refresh,
      addTeam,
      updateTeam,
      deleteTeam,
      addPlayerToTeam,
      removePlayerFromTeam,
    ]
  );

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>;
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error('useTeams must be used within TeamsProvider');
  return ctx;
}
