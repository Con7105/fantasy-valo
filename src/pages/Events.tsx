import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function Events() {
  const {
    events,
    isLoading,
    selectedEventId,
    selectedEventName,
    eventMatches,
    selectedMatchIndices,
    setSelectedMatchIndices,
    selectEvent,
    loadEvents,
    loadEventMatches,
    errorMessage,
    clearError,
  } = useApp();

  const handleSelect = (id: string, name: string) => {
    selectEvent(id, name);
    loadEventMatches();
  };

  const { roundCount, roundLabels } = useMemo(() => {
    const withTeams = eventMatches.filter((m) => m.team1Name !== 'TBD' && m.team2Name !== 'TBD');
    const teamToMatchIds: Record<string, string[]> = {};
    for (const m of withTeams) {
      const t1 = m.team1Name;
      const t2 = m.team2Name;
      if (!teamToMatchIds[t1]) teamToMatchIds[t1] = [];
      if (!teamToMatchIds[t1].includes(m.id)) teamToMatchIds[t1].push(m.id);
      if (!teamToMatchIds[t2]) teamToMatchIds[t2] = [];
      if (!teamToMatchIds[t2].includes(m.id)) teamToMatchIds[t2].push(m.id);
    }
    const counts = Object.values(teamToMatchIds).map((arr) => arr.length);
    const count = counts.length > 0 ? Math.max(...counts, 2) : 0;
    const labels: string[] = [];
    for (let i = 1; i <= count; i++) {
      const hasCompleted = withTeams.some((m) => {
        const r1 = (teamToMatchIds[m.team1Name]?.indexOf(m.id) ?? -1) + 1;
        const r2 = (teamToMatchIds[m.team2Name]?.indexOf(m.id) ?? -1) + 1;
        return (r1 === i || r2 === i) && m.status === 'completed';
      });
      labels.push(hasCompleted ? `Match ${i} (completed)` : `Match ${i}`);
    }
    return { roundCount: count, roundLabels: labels };
  }, [eventMatches]);

  const allSelected = selectedMatchIndices.length === 0;
  const isRoundSelected = (idx: number) =>
    allSelected || selectedMatchIndices.includes(idx);

  return (
    <div className="page">
      <h1>Events</h1>
      {errorMessage && (
        <div className="error-banner">
          {errorMessage}
          <button type="button" onClick={clearError}>OK</button>
        </div>
      )}
      {isLoading ? (
        <p className="loading">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="empty">No events. Check API URL in Settings or refresh.</p>
      ) : (
        <>
          {selectedEventId && selectedEventName && (
            <section className="section">
              <h2>Selected: {selectedEventName}</h2>
              <Link to="/matches">View matches ({eventMatches.length})</Link>
            </section>
          )}
          {selectedEventId && roundCount > 0 && (
            <section className="section score-period-section">
              <h2>Score period</h2>
              <p className="caption">
                Include points from each team&apos;s Match 1, Match 2, etc. (A match is 2–3 maps; each option is per team by match ID.) Use &quot;Refresh points&quot; on Teams or Matchups after changing.
              </p>
              <div className="week-selector">
                <button
                  type="button"
                  className={`btn small ${allSelected ? 'primary' : ''}`}
                  onClick={() => setSelectedMatchIndices([])}
                >
                  All matches
                </button>
                {roundLabels.map((label, i) => {
                  const idx = i + 1;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`btn small ${isRoundSelected(idx) ? 'primary' : ''}`}
                      onClick={() => setSelectedMatchIndices([idx])}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="date-checkboxes">
                <span className="date-checkboxes-label">Or select multiple:</span>
                {roundLabels.map((label, i) => {
                  const idx = i + 1;
                  const checked = allSelected || selectedMatchIndices.includes(idx);
                  return (
                    <label key={idx} className="date-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedMatchIndices(
                              Array.from({ length: roundCount }, (_, j) => j + 1).filter((j) => j !== idx)
                            );
                          } else if (selectedMatchIndices.includes(idx)) {
                            const next = selectedMatchIndices.filter((j) => j !== idx);
                            setSelectedMatchIndices(next.length > 0 ? next : []);
                          } else {
                            const next = [...selectedMatchIndices, idx].sort((a, b) => a - b);
                            setSelectedMatchIndices(next.length === roundCount ? [] : next);
                          }
                        }}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </section>
          )}
          <section className="section">
            <h2>All events</h2>
            <ul className="list">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className={`event-row ${selectedEventId === event.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(event.id, event.name)}
                  >
                    <span className="event-name">{event.name}</span>
                    {event.prizePool && (
                      <span className="event-prize">{event.prizePool}</span>
                    )}
                    {selectedEventId === event.id && <span className="check">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <button type="button" className="refresh" onClick={() => loadEvents()}>
        Refresh
      </button>
    </div>
  );
}
