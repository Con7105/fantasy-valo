import { useParams, Link } from 'react-router-dom';
import { useDraft } from '../context/DraftContext';
import { DraftBoard } from '../components/DraftBoard';
import { playerKey } from '../types/draft';
import type { PlayerRole } from '../types/draft';

export function DraftRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const {
    room,
    picks,
    playerPool,
    loading,
    error,
    currentTurnParticipantIndex,
    myParticipantIndex,
    setMyParticipantIndex,
    makePick,
    generateMatchups,
  } = useDraft();

  const pickedKeys = new Set(picks.map((p) => p.player_key));
  const availablePlayers = playerPool.filter(
    (s) => !pickedKeys.has(playerKey(s.playerName, s.teamName))
  );

  const myName =
    myParticipantIndex != null && room ? room.participant_names[myParticipantIndex] : null;
  const isMyTurn =
    currentTurnParticipantIndex != null && myParticipantIndex != null &&
    currentTurnParticipantIndex === myParticipantIndex;
  const totalPicks = room
    ? room.participant_names.length * room.slot_count
    : 0;
  const draftComplete = room && room.current_pick_index >= totalPicks;

  if (roomId && !room && !loading) {
    return (
      <div className="page">
        <Link to="/league">← League</Link>
        <h1>Draft room</h1>
        <p className="empty">Room not found or invalid ID.</p>
      </div>
    );
  }

  if (loading || !room) {
    return (
      <div className="page">
        <Link to="/league">← League</Link>
        <h1>Draft room</h1>
        <p className="loading">Loading…</p>
      </div>
    );
  }

  const requiredRole: PlayerRole | null =
    room.role_constraints && room.current_round <= room.role_constraints.length
      ? room.role_constraints[room.current_round - 1]?.role ?? null
      : null;

  const filteredPool = requiredRole && room.player_roles
    ? availablePlayers.filter((s) => {
        const key = playerKey(s.playerName, s.teamName);
        const role = room.player_roles![key];
        if (requiredRole === 'senti_controller_initiator')
          return role === 'senti' || role === 'controller' || role === 'initiator' || role === 'senti_controller_initiator';
        return role === requiredRole;
      })
    : availablePlayers;

  const leagueLink = room.league_id ? `/league/${room.league_id}` : '/league';
  return (
    <div className="page">
      <Link to={leagueLink}>← League</Link>
      <h1>{room.event_name}</h1>
      <p className="caption">
        Phase: {room.phase} — {room.slot_count} slots · {room.participant_names.length} participants
      </p>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {myParticipantIndex == null ? (
        <section className="section">
          <h2>Join as</h2>
          <p className="caption">Select your name to make picks when it’s your turn.</p>
          <ul className="list">
            {room.participant_names.map((name, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="event-row"
                  onClick={() => setMyParticipantIndex(i)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <p><strong>You:</strong> {myName}</p>
          {isMyTurn && !draftComplete && (
            <p className="cell-turn" style={{ padding: '0.5rem' }}>It’s your turn to pick.</p>
          )}
        </>
      )}

      <section className="section">
        <DraftBoard
          room={room}
          picks={picks}
          currentTurnParticipantIndex={currentTurnParticipantIndex}
        />
      </section>

      {isMyTurn && !draftComplete && filteredPool.length > 0 && (
        <section className="section">
          <h2>Pick a player</h2>
          <div className="draft-pick-list">
            {filteredPool.map((stat) => {
              const key = playerKey(stat.playerName, stat.teamName);
              return (
                <button
                  key={key}
                  type="button"
                  className="player-row"
                  onClick={() =>
                    makePick(key, stat.playerName, stat.teamName, requiredRole)
                  }
                >
                  <span className="player-name">{stat.playerName}</span>
                  <span className="team-name">{stat.teamName}</span>
                  <span className="acs">{stat.acs.toFixed(1)} ACS</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {draftComplete && (
        <section className="section">
          <h2>Draft complete</h2>
          {room.matchups && room.matchups.length > 0 ? (
            <>
              <h3>Matchups</h3>
              {room.matchups.map((r) => (
                <div key={r.round}>
                  <strong>Round {r.round}</strong>
                  <ul className="list">
                    {r.pairs.map(([a, b], i) => (
                      <li key={i}>{a} vs {b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <button type="button" onClick={generateMatchups}>
              Generate matchups (wheel of names)
            </button>
          )}
        </section>
      )}

      <section className="section">
        <p className="caption">Share this link so others can join: {window.location.href}</p>
      </section>
    </div>
  );
}
