import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchEvents,
  fetchEventMatches,
  fetchEventStats,
  fetchPerPlayerMapPoints,
} from '../api/vlrService';
import type {
  EventItemNorm,
  EventMatchItemNorm,
  EventPlayerStatNorm,
  FantasyRosterSlot,
  MapPointsBreakdown,
} from '../types';
import { fantasyScoring } from '../scoring';

const SELECTED_EVENT_ID_KEY = 'selectedEventId';
const SELECTED_EVENT_NAME_KEY = 'selectedEventName';
const ROSTER_KEY_PREFIX = 'fantasyRoster_';
const ROSTER_SIZE = 5;
const MAX_PER_TEAM = 2;

function loadSelectedEvent(): { id: string; name: string } | null {
  const id = localStorage.getItem(SELECTED_EVENT_ID_KEY);
  const name = localStorage.getItem(SELECTED_EVENT_NAME_KEY);
  if (id && name) return { id, name };
  return null;
}

function loadRoster(eventId: string): FantasyRosterSlot[] {
  try {
    const raw = localStorage.getItem(`${ROSTER_KEY_PREFIX}${eventId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FantasyRosterSlot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRoster(eventId: string, roster: FantasyRosterSlot[]): void {
  localStorage.setItem(`${ROSTER_KEY_PREFIX}${eventId}`, JSON.stringify(roster));
}

interface AppState {
  selectedEventId: string | null;
  selectedEventName: string | null;
  events: EventItemNorm[];
  eventMatches: EventMatchItemNorm[];
  eventStats: EventPlayerStatNorm[];
  perPlayerMapPoints: Record<string, number[]>;
  perPlayerMapBreakdowns: Record<string, MapPointsBreakdown[]>;
  roster: FantasyRosterSlot[];
  rosterLocked: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

interface AppContextValue extends AppState {
  selectEvent: (id: string, name: string) => void;
  loadEvents: () => Promise<void>;
  loadEventMatches: () => Promise<void>;
  setError: (msg: string | null) => void;
  clearError: () => void;
  addPlayer: (stat: EventPlayerStatNorm) => void;
  removePlayer: (slot: FantasyRosterSlot) => void;
  pointsForPlayer: (playerName: string, teamName: string) => number | null;
  getPlayerBreakdown: (playerName: string, teamName: string) => MapPointsBreakdown[] | null;
  totalPoints: number;
  isRosterFull: boolean;
  loadFantasyData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const MASTERS_ID = '2760';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const selected = loadSelectedEvent();
    const eventId = selected?.id ?? null;
    const eventName = selected?.name ?? null;
    return {
      selectedEventId: eventId,
      selectedEventName: eventName,
      events: [],
      eventMatches: [],
      eventStats: [],
      perPlayerMapPoints: {},
      perPlayerMapBreakdowns: {},
      roster: eventId ? loadRoster(eventId) : [],
      rosterLocked: false,
      isLoading: false,
      errorMessage: null,
    };
  });

  const selectEvent = useCallback((id: string, name: string) => {
    localStorage.setItem(SELECTED_EVENT_ID_KEY, id);
    localStorage.setItem(SELECTED_EVENT_NAME_KEY, name);
    setState((prev) => ({
      ...prev,
      selectedEventId: id,
      selectedEventName: name,
      eventMatches: [],
      roster: loadRoster(id),
      eventStats: [],
      perPlayerMapPoints: {},
      perPlayerMapBreakdowns: {},
    }));
  }, []);

  const setError = useCallback((msg: string | null) => {
    setState((prev) => ({ ...prev, errorMessage: msg }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, errorMessage: null }));
  }, []);

  const loadEvents = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));
    try {
      const all = await fetchEvents(60);
      const events = all.filter((e) => e.id === MASTERS_ID);
      setState((prev) => ({
        ...prev,
        events,
        isLoading: false,
      }));
      if (events.length > 0) {
        const first = events[0];
        selectEvent(first.id, first.name);
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [selectEvent]);

  const loadEventMatches = useCallback(async () => {
    const id = state.selectedEventId;
    if (!id) return;
    setState((prev) => ({ ...prev, errorMessage: null }));
    try {
      const matches = await fetchEventMatches(id, 50);
      setState((prev) => ({ ...prev, eventMatches: matches }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [state.selectedEventId]);

  const loadFantasyData = useCallback(async () => {
    const id = state.selectedEventId;
    if (!id) return;
    try {
      const [matches, stats, pointsResult] = await Promise.all([
        fetchEventMatches(id, 10),
        fetchEventStats(id),
        fetchPerPlayerMapPoints(id),
      ]);
      const hasStarted = matches.some(
        (m) =>
          m.status === 'completed' || m.status === 'live' || m.status === 'ongoing'
      );
      setState((prev) => ({
        ...prev,
        eventStats: stats,
        perPlayerMapPoints: pointsResult.mapPoints,
        perPlayerMapBreakdowns: pointsResult.mapBreakdowns,
        rosterLocked: hasStarted,
      }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        eventStats: [],
        perPlayerMapPoints: {},
        perPlayerMapBreakdowns: {},
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [state.selectedEventId]);

  const addPlayer = useCallback(
    (stat: EventPlayerStatNorm) => {
      if (state.rosterLocked || state.roster.length >= ROSTER_SIZE) return;
      const samePlayer = state.roster.some((s) => s.playerName === stat.playerName);
      const teamCount = state.roster.filter((s) => s.teamName === stat.teamName).length;
      if (samePlayer || teamCount >= MAX_PER_TEAM) return;
      const slot: FantasyRosterSlot = {
        playerName: stat.playerName,
        teamName: stat.teamName,
        playerUrl: stat.playerUrl,
      };
      const roster = [...state.roster, slot];
      if (state.selectedEventId) saveRoster(state.selectedEventId, roster);
      setState((prev) => ({ ...prev, roster }));
    },
    [state.roster, state.rosterLocked, state.selectedEventId]
  );

  const removePlayer = useCallback(
    (slot: FantasyRosterSlot) => {
      if (state.rosterLocked) return;
      const roster = state.roster.filter(
        (s) => !(s.playerName === slot.playerName && s.teamName === slot.teamName)
      );
      if (state.selectedEventId) saveRoster(state.selectedEventId, roster);
      setState((prev) => ({ ...prev, roster }));
    },
    [state.roster, state.rosterLocked, state.selectedEventId]
  );

  const pointsForPlayer = useCallback(
    (playerName: string, teamName: string): number | null => {
      const key = `${playerName}|${teamName}`;
      const mapPts = state.perPlayerMapPoints[key];
      if (!mapPts?.length) return null;
      return fantasyScoring.finalScore(mapPts);
    },
    [state.perPlayerMapPoints]
  );

  const getPlayerBreakdown = useCallback(
    (playerName: string, teamName: string): MapPointsBreakdown[] | null => {
      const key = `${playerName}|${teamName}`;
      const breakdowns = state.perPlayerMapBreakdowns[key];
      if (!breakdowns?.length) return null;
      return breakdowns;
    },
    [state.perPlayerMapBreakdowns]
  );

  const totalPoints = useMemo(() => {
    return state.roster.reduce((acc, slot) => {
      const key = `${slot.playerName}|${slot.teamName}`;
      const mapPts = state.perPlayerMapPoints[key];
      const pts = mapPts?.length ? fantasyScoring.finalScore(mapPts) : 0;
      return acc + pts;
    }, 0);
  }, [state.roster, state.perPlayerMapPoints]);

  const isRosterFull = state.roster.length >= ROSTER_SIZE;

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (state.selectedEventId) {
      loadEventMatches();
    }
  }, [state.selectedEventId]);

  useEffect(() => {
    if (state.selectedEventId) {
      setState((prev) => ({ ...prev, roster: loadRoster(state.selectedEventId!) }));
    }
  }, [state.selectedEventId]);

  const value: AppContextValue = useMemo(
    () => ({
      ...state,
      selectEvent,
      loadEvents,
      loadEventMatches,
      setError,
      clearError,
      addPlayer,
      removePlayer,
      pointsForPlayer,
      getPlayerBreakdown,
      totalPoints,
      isRosterFull,
      loadFantasyData,
    }),
    [state, selectEvent, loadEvents, loadEventMatches, setError, clearError, addPlayer, removePlayer, pointsForPlayer, getPlayerBreakdown, totalPoints, isRosterFull, loadFantasyData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
