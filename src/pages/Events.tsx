import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const WEEK_OPTIONS = [1, 2, 3, 4, 5];

export function Events() {
  const {
    events,
    isLoading,
    selectedEventId,
    selectedEventName,
    eventMatches,
    selectedWeeks,
    setSelectedWeeks,
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

  const { weekOptions } = useMemo(() => {
    return { weekOptions: WEEK_OPTIONS };
  }, []);

  const allSelected = selectedWeeks.length === 0;
  const isWeekSelected = (week: number) =>
    allSelected || selectedWeeks.includes(week);

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
          {selectedEventId && weekOptions.length > 0 && (
            <section className="section score-period-section">
              <h2>Score period (weeks)</h2>
              <p className="caption">
                Points are based on VCT 2026 Americas Stage 1 week labels. Choose which weeks to include. Use &quot;Refresh points&quot; on Teams or Matchups after changing.
              </p>
              <div className="week-selector">
                <button
                  type="button"
                  className={`btn small ${allSelected ? 'primary' : ''}`}
                  onClick={() => setSelectedWeeks([])}
                >
                  All weeks
                </button>
                {weekOptions.map((week) => (
                  <button
                    key={week}
                    type="button"
                    className={`btn small ${isWeekSelected(week) ? 'primary' : ''}`}
                    onClick={() => setSelectedWeeks([week])}
                  >
                    Week {week}
                  </button>
                ))}
              </div>
              <div className="date-checkboxes">
                <span className="date-checkboxes-label">Or select multiple weeks:</span>
                {weekOptions.map((week) => {
                  const checked = allSelected || selectedWeeks.includes(week);
                  return (
                    <label key={week} className="date-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedWeeks(
                              weekOptions.filter((w) => w !== week)
                            );
                          } else if (selectedWeeks.includes(week)) {
                            const next = selectedWeeks.filter((w) => w !== week);
                            setSelectedWeeks(next.length > 0 ? next : []);
                          } else {
                            const next = [...selectedWeeks, week].sort((a, b) => a - b);
                            setSelectedWeeks(
                              next.length === weekOptions.length ? [] : next
                            );
                          }
                        }}
                      />
                      Week {week}
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
