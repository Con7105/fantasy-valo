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
import { fetchEventStats } from '../api/vlrService';
import type { EventPlayerStatNorm } from '../types';
import type { DraftRoomRow, DraftPickRow, PlayerRole } from '../types/draft';
import {
  getTotalPicks,
  getParticipantIndexAtGlobalPick,
  globalPickToRoundAndIndex,
} from '../utils/snakeDraft';
import type { DraftMatchupRound } from '../types/draft';
import { generateMatchupRounds } from '../utils/matchupWheel';

interface DraftState {
  room: DraftRoomRow | null;
  picks: DraftPickRow[];
  playerPool: EventPlayerStatNorm[];
  loading: boolean;
  error: string | null;
}

interface DraftContextValue extends DraftState {
  currentTurnParticipantIndex: number | null;
  myParticipantIndex: number | null;
  setMyParticipantIndex: (index: number | null) => void;
  makePick: (
    playerKeyVal: string,
    playerName: string,
    teamName: string,
    role: PlayerRole | null
  ) => Promise<void>;
  loadPlayerPool: () => Promise<void>;
  generateMatchups: () => Promise<void>;
}

const DraftContext = createContext<DraftContextValue | null>(null);

const MY_PARTICIPANT_KEY = 'draft_my_participant_';

export function DraftProvider({
  roomId,
  children,
}: {
  roomId: string | null;
  children: ReactNode;
}) {
  const [room, setRoom] = useState<DraftRoomRow | null>(null);
  const [picks, setPicks] = useState<DraftPickRow[]>([]);
  const [playerPool, setPlayerPool] = useState<EventPlayerStatNorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myParticipantIndex, setMyParticipantIndexState] = useState<number | null>(() => {
    if (!roomId || typeof window === 'undefined') return null;
    const raw = localStorage.getItem(MY_PARTICIPANT_KEY + roomId);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  });

  const setMyParticipantIndex = useCallback(
    (index: number | null) => {
      setMyParticipantIndexState(index);
      if (roomId && typeof window !== 'undefined') {
        if (index === null) localStorage.removeItem(MY_PARTICIPANT_KEY + roomId);
        else localStorage.setItem(MY_PARTICIPANT_KEY + roomId, String(index));
      }
    },
    [roomId]
  );

  const fetchRoom = useCallback(async (id: string) => {
    if (!supabase) return null;
    const { data, error: e } = await supabase
      .from('draft_rooms')
      .select('*')
      .eq('id', id)
      .single();
    if (e) {
      setError(e.message);
      return null;
    }
    return data as DraftRoomRow;
  }, []);

  const fetchPicks = useCallback(async (id: string) => {
    if (!supabase) return [];
    const { data, error: e } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('room_id', id)
      .order('round')
      .order('pick_index');
    if (e) return [];
    return (data ?? []) as DraftPickRow[];
  }, []);

  useEffect(() => {
    if (!roomId || !supabase) {
      setRoom(null);
      setPicks([]);
      setLoading(false);
      setError(supabase ? null : 'Supabase not configured');
      return;
    }
    setLoading(true);
    setError(null);
    let mounted = true;

    (async () => {
      const r = await fetchRoom(roomId);
      const p = await fetchPicks(roomId);
      if (mounted) {
        setRoom(r);
        setPicks(p);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel('draft-' + roomId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draft_rooms', filter: `id=eq.${roomId}` },
        () => {
          fetchRoom(roomId).then((r) => mounted && r && setRoom(r));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draft_picks', filter: `room_id=eq.${roomId}` },
        () => {
          fetchPicks(roomId).then((p) => mounted && setPicks(p));
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (!mounted) return;
      fetchRoom(roomId).then((r) => mounted && r && setRoom(r));
      fetchPicks(roomId).then((p) => mounted && setPicks(p));
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      if (supabase) supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoom, fetchPicks]);

  const currentTurnParticipantIndex = useMemo(() => {
    if (!room || room.status !== 'drafting') return null;
    const n = room.participant_names.length;
    const total = getTotalPicks(n, room.slot_count);
    if (room.current_pick_index >= total) return null;
    return getParticipantIndexAtGlobalPick(
      room.snake_order,
      room.current_pick_index,
      n
    );
  }, [room]);

  const loadPlayerPool = useCallback(async () => {
    if (!room?.event_id) return;
    setError(null);
    try {
      const stats = await fetchEventStats(room.event_id);
      setPlayerPool(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPlayerPool([]);
    }
  }, [room?.event_id]);

  useEffect(() => {
    if (room?.event_id && room.status === 'drafting') loadPlayerPool();
  }, [room?.event_id, room?.status, loadPlayerPool]);

  const makePick = useCallback(
    async (
      playerKeyVal: string,
      playerName: string,
      teamName: string,
      role: PlayerRole | null
    ) => {
      if (!supabase || !room) return;
      if (room.status !== 'drafting') return;
      const n = room.participant_names.length;
      const total = getTotalPicks(n, room.slot_count);
      if (room.current_pick_index >= total) return;
      const participantIndex = getParticipantIndexAtGlobalPick(
        room.snake_order,
        room.current_pick_index,
        n
      );
      const { round, pickIndexInRound } = globalPickToRoundAndIndex(
        room.current_pick_index,
        n
      );

      const { data: insertedRow, error: insertErr } = await supabase
        .from('draft_picks')
        .insert({
          room_id: room.id,
          round,
          pick_index: pickIndexInRound,
          participant_index: participantIndex,
          player_key: playerKeyVal,
          player_name: playerName,
          team_name: teamName,
          role,
        })
        .select('id, room_id, round, pick_index, participant_index, player_key, player_name, team_name, role, created_at')
        .single();
      if (insertErr) {
        setError(insertErr.message);
        if (insertErr.code === '23505') {
          fetchPicks(room.id).then((p) => setPicks(p));
          fetchRoom(room.id).then((r) => r && setRoom(r));
        }
        return;
      }

      const nextIndex = room.current_pick_index + 1;
      const roomUpdates: Partial<DraftRoomRow> = {
        current_pick_index: nextIndex,
        current_round: globalPickToRoundAndIndex(nextIndex, n).round,
      };
      if (nextIndex >= total) roomUpdates.status = 'completed';

      const { error: updateErr } = await supabase
        .from('draft_rooms')
        .update(roomUpdates)
        .eq('id', room.id);
      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      setError(null);
      setPicks((prev) => (insertedRow ? [...prev, insertedRow as DraftPickRow] : prev));
      setRoom((prev) =>
        prev
          ? { ...prev, ...roomUpdates, updated_at: new Date().toISOString() }
          : null
      );
    },
    [room, fetchPicks, fetchRoom]
  );

  const generateMatchups = useCallback(async () => {
    if (!supabase || !room) return;
    const rounds: DraftMatchupRound[] = generateMatchupRounds(room.participant_names);
    await supabase
      .from('draft_rooms')
      .update({ matchups: rounds })
      .eq('id', room.id);

    if (room.league_id) {
      const weekPhases: ['0-0', '1-0/0-1', '1-1'] = ['0-0', '1-0/0-1', '1-1'];
      for (let w = 0; w < 3 && w < rounds.length; w++) {
        await supabase.from('league_weeks').insert({
          league_id: room.league_id,
          week_number: w + 1,
          phase: weekPhases[w],
          matchups: rounds[w].pairs,
          status: 'pending',
        });
      }
      await supabase
        .from('leagues')
        .update({ status: 'active' })
        .eq('id', room.league_id);
    }
  }, [room]);

  const value: DraftContextValue = useMemo(
    () => ({
      room,
      picks,
      playerPool,
      loading,
      error,
      currentTurnParticipantIndex,
      myParticipantIndex,
      setMyParticipantIndex,
      makePick,
      loadPlayerPool,
      generateMatchups,
    }),
    [
      room,
      picks,
      playerPool,
      loading,
      error,
      currentTurnParticipantIndex,
      myParticipantIndex,
      setMyParticipantIndex,
      makePick,
      loadPlayerPool,
      generateMatchups,
    ]
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}
