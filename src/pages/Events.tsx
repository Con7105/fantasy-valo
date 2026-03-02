import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, normalizeMatchDate } from '../context/AppContext';
import type { EventMatchItemNorm } from '../types';

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
    const dateSet = new Set<string>();
    for (const m of eventMatches) {
      const d = normalizeMatchDate(m.date);
      if (d) dateSet.add(d);
    }
    const sortedDates = Array.from(dateSet).sort();
    const count = Math.max(sortedDates.length, eventMatches.length > 0 ? 1 : 0);
    const getRound = (m: EventMatchItemNorm): number => {
      const d = normalizeMatchDate(m.date);
      if (count === 0) return 0;
      if (!d && count === 1) return 1;
      if (!d) return 0;
      const idx = sortedDates.indexOf(d);
      return idx >= 0 ? idx + 1 : 0;
    };
    const labels: string[] = [];
    for (let i = 1; i <= count; i++) {
      const hasCompleted = eventMatches.some((m) => getRound(m) === i && m.status === 'completed');
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
                Include points from each team&apos;s Match 1, Match 2, etc. Options are based on how many match days are scheduled. Use &quot;Refresh points&quot; on Teams or Matchups after changing.
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
