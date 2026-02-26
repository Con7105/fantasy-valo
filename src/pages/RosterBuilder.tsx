import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function RosterBuilder() {
  const { selectedEventId, eventStats, roster, isRosterFull, rosterLocked, addPlayer, loadFantasyData } = useApp();

  useEffect(() => {
    if (selectedEventId && eventStats.length === 0) loadFantasyData();
  }, [selectedEventId, eventStats.length, loadFantasyData]);

  return (
    <div className="page">
      <Link to="/fantasy">← Back to Fantasy</Link>
      <h1>Select players</h1>
      <p className="caption">Roster: 5 players max, 2 per team.</p>
      <ul className="list player-list">
        {eventStats.map((stat) => {
          const alreadyInRoster = roster.some((s) => s.playerName === stat.playerName);
          const disabled = rosterLocked || isRosterFull || alreadyInRoster;
          return (
            <li key={`${stat.playerName}-${stat.teamName}`}>
              <button
                type="button"
                className="player-row"
                disabled={disabled}
                onClick={() => addPlayer(stat)}
              >
                <span className="player-name">{stat.playerName}</span>
                <span className="team-name">{stat.teamName}</span>
                <span className="acs">{stat.acs.toFixed(1)} ACS</span>
              </button>
            </li>
          );
        })}
      </ul>
      {eventStats.length === 0 && (
        <p className="empty">Load event stats from Fantasy tab first.</p>
      )}
    </div>
  );
}
