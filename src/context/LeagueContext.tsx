import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { fetchPerPlayerMapPointsForPhase } from '../api/vlrService';
import { fantasyScoring } from '../scoring';
import type { LeagueRow, LeagueMemberRow, LeagueWeekRow } from '../types/league';
import { randomSnakeOrder } from '../utils/snakeDraft';
import type { RoleConstraint } from '../types/draft';

interface LeagueState {
  league: LeagueRow | null;
  members: LeagueMemberRow[];
  weeks: LeagueWeekRow[];
  loading: boolean;
  error: string | null;
}

interface LeagueContextValue extends LeagueState {
  joinLeague: (name: string) => Promise<void>;
  startDraft: () => Promise<string | null>;
  scoreWeek: (weekNumber: number) => Promise<void>;
  refetch: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextValue | null>(null);

const DEFAULT_PHASE = '0-0';
const DEFAULT_SLOT_COUNT = 4;
const DEFAULT_ROLE_CONSTRAINTS: RoleConstraint[] = [
  { slot: 0, role: 'duelist' },
  { slot: 1, role: 'flex' },
  { slot: 2, role: 'controller' },
  { slot: 3, role: 'initiator' },
];

export function LeagueProvider({
  leagueId,
  children,
}: {
  leagueId: string | null;
  children: ReactNode;
}) {
  const [league, setLeague] = useState<LeagueRow | null>(null);
  const [members, setMembers] = useState<LeagueMemberRow[]>([]);
  const [weeks, setWeeks] = useState<LeagueWeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeague = useCallback(async (id: string): Promise<LeagueRow | null> => {
    if (!supabase) return null;
    const { data, error: fetchError } = await supabase.from('leagues').select('*').eq('id', id).single();
    if (fetchError) {
      setError(fetchError.message);
      return null;
    }
    return data as LeagueRow;
  }, []);

  const fetchMembers = useCallback(async (id: string): Promise<LeagueMemberRow[]> => {
    if (!supabase) return [];
    const { data, error: fetchError } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', id)
      .order('join_order');
    if (fetchError) return [];
    return (data ?? []) as LeagueMemberRow[];
  }, []);

  const fetchWeeks = useCallback(async (id: string): Promise<LeagueWeekRow[]> => {
    if (!supabase) return [];
    const { data, error: fetchError } = await supabase
      .from('league_weeks')
      .select('*')
      .eq('league_id', id)
      .order('week_number');
    if (fetchError) return [];
    const rows = (data ?? []) as LeagueWeekRow[];
    return rows.map((r) => ({
      ...r,
      matchups: Array.isArray(r.matchups) ? r.matchups : [],
      scores: r.scores && typeof r.scores === 'object' ? r.scores as Record<string, number> : {},
    }));
  }, []);

  const refetch = useCallback(async () => {
    if (!leagueId || !supabase) return;
    const [l, m, w] = await Promise.all([
      fetchLeague(leagueId),
      fetchMembers(leagueId),
      fetchWeeks(leagueId),
    ]);
    if (l) setLeague(l);
    setMembers(m);
    setWeeks(w);
  }, [leagueId, fetchLeague, fetchMembers, fetchWeeks]);

  useEffect(() => {
    if (!leagueId || !supabase) {
      setLeague(null);
      setMembers([]);
      setWeeks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let mounted = true;
    (async () => {
      const [l, m, w] = await Promise.all([
        fetchLeague(leagueId),
        fetchMembers(leagueId),
        fetchWeeks(leagueId),
      ]);
      if (mounted) {
        setLeague(l ?? null);
        setMembers(m);
        setWeeks(w);
        setLoading(false);
      }
    })();
    const channel = supabase
      .channel('league-' + leagueId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_members', filter: `league_id=eq.${leagueId}` },
        () => fetchMembers(leagueId).then((m) => mounted && setMembers(m))
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_weeks', filter: `league_id=eq.${leagueId}` },
        () => fetchWeeks(leagueId).then((w) => mounted && setWeeks(w))
      )
      .subscribe();
    const pollInterval = setInterval(() => refetch(), 4000);
    return () => {
      mounted = false;
      clearInterval(pollInterval);
      if (supabase) supabase.removeChannel(channel);
    };
  }, [leagueId, fetchLeague, fetchMembers, fetchWeeks, refetch]);

  const joinLeague = useCallback(
    async (name: string) => {
      if (!supabase || !leagueId || !league) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      setError(null);
      const joinOrder = members.length;
      const { error: err } = await supabase.from('league_members').insert({
        league_id: leagueId,
        name: trimmed,
        join_order: joinOrder,
      });
      if (err) {
        setError(err.message);
        return;
      }
      await refetch();
    },
    [leagueId, league, members.length, refetch]
  );

  const startDraft = useCallback(async (): Promise<string | null> => {
    if (!supabase || !league || !leagueId) return null;
    if (league.status !== 'joining') return null;
    if (members.length < 2) {
      setError('Need at least 2 members to start the draft.');
      return null;
    }
    setError(null);
    const participantNames = [...members].sort((a, b) => a.join_order - b.join_order).map((m) => m.name);
    const snake_order = randomSnakeOrder(participantNames.length);
    const { data: room, error: roomErr } = await supabase
      .from('draft_rooms')
      .insert({
        league_id: leagueId,
        event_id: league.event_id,
        event_name: league.event_name,
        phase: DEFAULT_PHASE,
        slot_count: DEFAULT_SLOT_COUNT,
        role_constraints: DEFAULT_ROLE_CONSTRAINTS,
        participant_names: participantNames,
        snake_order,
        current_round: 1,
        current_pick_index: 0,
        status: 'drafting',
      })
      .select('id')
      .single();
    if (roomErr || !room) {
      setError(roomErr?.message ?? 'Failed to create draft');
      return null;
    }
    const { error: updateErr } = await supabase
      .from('leagues')
      .update({ draft_room_id: room.id, status: 'drafting' })
      .eq('id', league.id);
    if (updateErr) {
      setError(updateErr.message);
      return null;
    }
    await refetch();
    return room.id;
  }, [league, leagueId, members, refetch]);

  const scoreWeek = useCallback(
    async (weekNumber: number) => {
      if (!supabase || !league?.draft_room_id) return;
      const week = weeks.find((w) => w.week_number === weekNumber);
      if (!week || week.status === 'scored') return;
      setError(null);
      const { data: picks } = await supabase
        .from('draft_picks')
        .select('participant_index, player_key')
        .eq('room_id', league.draft_room_id);
      const { data: room } = await supabase
        .from('draft_rooms')
        .select('participant_names')
        .eq('id', league.draft_room_id)
        .single();
      if (!picks?.length || !room?.participant_names) return;
      const names = room.participant_names as string[];
      const memberRosterKeys: Record<string, string[]> = {};
      for (const p of picks as { participant_index: number; player_key: string }[]) {
        const name = names[p.participant_index];
        if (!name) continue;
        if (!memberRosterKeys[name]) memberRosterKeys[name] = [];
        memberRosterKeys[name].push(p.player_key);
      }
      const mapPoints = await fetchPerPlayerMapPointsForPhase(league.event_id, week.phase);
      const scores: Record<string, number> = {};
      for (const [name, keys] of Object.entries(memberRosterKeys)) {
        let total = 0;
        for (const key of keys) {
          const pts = mapPoints[key];
          if (pts?.length) total += fantasyScoring.finalScore(pts);
        }
        scores[name] = Math.round(total * 10) / 10;
      }
      await supabase
        .from('league_weeks')
        .update({ scores, status: 'scored' })
        .eq('id', week.id);
      const winnerNames: string[] = [];
      for (const [a, b] of week.matchups) {
        const scoreA = scores[a] ?? 0;
        const scoreB = scores[b] ?? 0;
        if (scoreA > scoreB) winnerNames.push(a);
        else if (scoreB > scoreA) winnerNames.push(b);
      }
      for (const m of members) {
        if (winnerNames.includes(m.name)) {
          await supabase
            .from('league_members')
            .update({ wins: m.wins + 1 })
            .eq('id', m.id);
        }
      }
      await refetch();
    },
    [league, members, weeks, refetch]
  );

  const value: LeagueContextValue = useMemo(
    () => ({
      league,
      members,
      weeks,
      loading,
      error,
      joinLeague,
      startDraft,
      scoreWeek,
      refetch,
    }),
    [league, members, weeks, loading, error, joinLeague, startDraft, scoreWeek, refetch]
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}
