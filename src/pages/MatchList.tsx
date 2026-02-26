import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { EventMatchItemNorm, MatchStatus } from '../types';

function statusText(s: MatchStatus): string {
  switch (s) {
    case 'upcoming':
      return 'Upcoming';
    case 'live':
    case 'ongoing':
      return 'Live';
    case 'completed':
      return 'Completed';
    default:
      return '—';
  }
}

function statusClass(s: MatchStatus): string {
  switch (s) {
    case 'live':
    case 'ongoing':
      return 'status-live';
    case 'completed':
      return 'status-completed';
    default:
      return 'status-default';
  }
}

function MatchRow({ match }: { match: EventMatchItemNorm }) {
  return (
    <li className="match-row">
      {match.stage && <div className="match-stage">{match.stage}</div>}
      <div className="match-teams">
        <span className="team">{match.team1Name}</span>
        <span className="score">
          {match.team1Score != null && match.team2Score != null
            ? `${match.team1Score} - ${match.team2Score}`
            : 'vs'}
        </span>
        <span className="team">{match.team2Name}</span>
      </div>
      <div className={`match-status ${statusClass(match.status)}`}>
        {statusText(match.status)}
      </div>
    </li>
  );
}

export function MatchList() {
  const { eventMatches, selectedEventName } = useApp();

  return (
    <div className="page">
      <Link to="/">← Back</Link>
      <h1>{selectedEventName ?? 'Matches'}</h1>
      <ul className="list match-list">
        {eventMatches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ul>
      {eventMatches.length === 0 && (
        <p className="empty">No matches for this event yet.</p>
      )}
    </div>
  );
}
