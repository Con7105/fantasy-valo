import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';

export function LeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const {
    league,
    members,
    weeks,
    loading,
    error,
    joinLeague,
    startDraft,
    scoreWeek,
  } = useLeague();
  const [joinName, setJoinName] = useState('');
  const [starting, setStarting] = useState(false);
  const [scoringWeek, setScoringWeek] = useState<number | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinLeague(joinName);
    setJoinName('');
  };

  const handleStartDraft = async () => {
    setStarting(true);
    const roomId = await startDraft();
    setStarting(false);
    if (roomId) navigate(`/draft/${roomId}`);
  };

  if (leagueId && !league && !loading) {
    return (
      <div className="page">
        <Link to="/league">← League</Link>
        <h1>League</h1>
        <p className="empty">League not found.</p>
      </div>
    );
  }

  if (loading || !league) {
    return (
      <div className="page">
        <Link to="/league">← League</Link>
        <h1>League</h1>
        <p className="loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/league">← League</Link>
      <h1>{league.name || league.event_name}</h1>
      <p className="caption">Event: {league.event_name} · Status: {league.status}</p>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {league.status === 'joining' && (
        <>
          <section className="section">
            <h2>Members ({members.length})</h2>
            <ul className="list">
              {members.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
            {members.length === 0 && <p className="caption">No members yet. Share the link and have people join.</p>}
          </section>
          <section className="section">
            <h2>Join league</h2>
            <form onSubmit={handleJoin}>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Your name"
                className="input-url"
              />
              <button type="submit" disabled={!joinName.trim()}>Join</button>
            </form>
          </section>
          <section className="section">
            <button
              type="button"
              onClick={handleStartDraft}
              disabled={members.length < 2 || starting}
            >
              {starting ? 'Starting…' : 'Start draft'}
            </button>
            <p className="caption">Need at least 2 members. Share link: {typeof window !== 'undefined' ? window.location.href : ''}</p>
          </section>
        </>
      )}

      {league.status === 'drafting' && league.draft_room_id && (
        <section className="section">
          <h2>Draft in progress</h2>
          <Link to={`/draft/${league.draft_room_id}`}>
            <button type="button">Go to draft</button>
          </Link>
        </section>
      )}

      {league.status === 'active' && (
        <>
          <section className="section">
            <h2>Standings</h2>
            <table className="draft-board" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Wins</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .slice()
                  .sort((a, b) => b.wins - a.wins)
                  .map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.wins}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
          <section className="section">
            <h2>Weeks</h2>
            {weeks.length === 0 ? (
              <p className="caption">No weeks yet. Week 1 will appear after the draft is complete.</p>
            ) : (
              weeks.map((w) => (
                <div key={w.id} className="section">
                  <h3>Week {w.week_number} ({w.phase})</h3>
                  {w.status === 'scored' && w.scores && Object.keys(w.scores).length > 0 ? (
                    <ul className="list">
                      {w.matchups.map((pair, i) => {
                        const [a, b] = pair;
                        const scoreA = w.scores[a] ?? 0;
                        const scoreB = w.scores[b] ?? 0;
                        const winner = scoreA > scoreB ? a : scoreB > scoreA ? b : null;
                        return (
                          <li key={i}>
                            {a} {scoreA.toFixed(1)} – {scoreB.toFixed(1)} {b}
                            {winner && ` (${winner} wins)`}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <>
                      <p className="caption">Matchups: {w.matchups.map(([a, b]) => `${a} vs ${b}`).join('; ')}</p>
                      <button
                        type="button"
                        disabled={scoringWeek !== null}
                        onClick={async () => {
                          setScoringWeek(w.week_number);
                          await scoreWeek(w.week_number);
                          setScoringWeek(null);
                        }}
                      >
                        {scoringWeek === w.week_number ? 'Scoring…' : 'Score week'}
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}

      <section className="section">
        <p className="caption">Share this link so others can join: {typeof window !== 'undefined' ? window.location.href : ''}</p>
      </section>
    </div>
  );
}
