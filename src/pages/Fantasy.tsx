import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function Fantasy() {
  const {
    selectedEventId,
    roster,
    rosterLocked,
    totalPoints,
    pointsForPlayer,
    removePlayer,
    loadFantasyData,
  } = useApp();

  useEffect(() => {
    if (selectedEventId) loadFantasyData();
  }, [selectedEventId, loadFantasyData]);

  if (!selectedEventId) {
    return (
      <div className="page">
        <h1>Fantasy</h1>
        <p className="empty">No event selected. Select an event in the Events tab first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Fantasy</h1>
      <section className="section">
        <h2>Your points</h2>
        <p className="total-points">{totalPoints.toFixed(1)} pts</p>
      </section>
      <section className="section">
        <h2>Roster</h2>
        {rosterLocked && <p className="caption">Roster locked</p>}
        <ul className="list roster-list">
          {roster.map((slot) => (
            <li key={`${slot.playerName}-${slot.teamName}`} className="roster-slot">
              <div>
                <span className="player-name">{slot.playerName}</span>
                <span className="team-name">{slot.teamName}</span>
              </div>
              <span className="slot-pts">
                {pointsForPlayer(slot.playerName, slot.teamName)?.toFixed(1) ?? '—'}
              </span>
              {!rosterLocked && (
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => removePlayer(slot)}
                  aria-label={`Remove ${slot.playerName}`}
                >
                  −
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {!rosterLocked && (
        <section className="section">
          <Link to="/fantasy/roster">Add players</Link>
        </section>
      )}
      <section className="section scoring-info">
        <h2>Scoring</h2>
        <p className="caption">
          Per map: Kill +3, First kill +2 extra, Assists +1.5, First death -1. Highest
          ACS/KAST/ADR/HS% on map +2 each. Team match win +3. Final = average of all maps,
          rounded to tenths.
        </p>
      </section>
    </div>
  );
}
