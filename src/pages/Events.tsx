import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp, normalizeMatchDate } from '../context/AppContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.split('-').map(Number);
  if (!m || !d) return yyyyMmDd;
  const month = MONTHS[(m ?? 1) - 1] ?? '';
  return `${month} ${d}`;
}

export function Events() {
  const {
    events,
    isLoading,
    selectedEventId,
    selectedEventName,
    eventMatches,
    selectedMatchDates,
    setSelectedMatchDates,
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

  const { sortedDates, weekPresets } = useMemo(() => {
    const dateSet = new Set<string>();
    for (const m of eventMatches) {
      const d = normalizeMatchDate(m.date);
      if (d) dateSet.add(d);
    }
    const sorted = Array.from(dateSet).sort();
    const presets: { label: string; dates: string[] }[] = [];
    if (sorted.length >= 2) presets.push({ label: `Week 1 (${formatDateLabel(sorted[0])} – ${formatDateLabel(sorted[1])})`, dates: sorted.slice(0, 2) });
    if (sorted.length >= 4) presets.push({ label: `Week 2 (${formatDateLabel(sorted[2])} – ${formatDateLabel(sorted[3])})`, dates: sorted.slice(2, 4) });
    if (sorted.length >= 5) presets.push({ label: `Week 3 (${formatDateLabel(sorted[4])})`, dates: sorted.slice(4, 5) });
    else if (sorted.length > 4) presets.push({ label: `Week 3 (${formatDateLabel(sorted[4])} – ${formatDateLabel(sorted[sorted.length - 1])})`, dates: sorted.slice(4) });
    return { sortedDates: sorted, weekPresets: presets };
  }, [eventMatches]);

  const allSelected = selectedMatchDates.length === 0;
  const isWeekSelected = (dates: string[]) =>
    dates.length > 0 && dates.every((d) => selectedMatchDates.includes(d)) && selectedMatchDates.length === dates.length;

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
          {selectedEventId && sortedDates.length > 0 && (
            <section className="section score-period-section">
              <h2>Score period</h2>
              <p className="caption">Include points from matches on selected days. Use &quot;Refresh points&quot; on Teams or Matchups after changing.</p>
              <div className="week-selector">
                <button
                  type="button"
                  className={`btn small ${allSelected ? 'primary' : ''}`}
                  onClick={() => setSelectedMatchDates([])}
                >
                  All matches
                </button>
                {weekPresets.map((week, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`btn small ${isWeekSelected(week.dates) ? 'primary' : ''}`}
                    onClick={() => setSelectedMatchDates(week.dates)}
                  >
                    {week.label}
                  </button>
                ))}
              </div>
              <div className="date-checkboxes">
                <span className="date-checkboxes-label">Or select specific days:</span>
                {sortedDates.map((d) => {
                  const checked = allSelected || selectedMatchDates.includes(d);
                  return (
                    <label key={d} className="date-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedMatchDates(sortedDates.filter((x) => x !== d));
                          } else if (selectedMatchDates.includes(d)) {
                            const next = selectedMatchDates.filter((x) => x !== d);
                            setSelectedMatchDates(next.length > 0 ? next : []);
                          } else {
                            const next = [...selectedMatchDates, d].sort();
                            setSelectedMatchDates(next.length === sortedDates.length ? [] : next);
                          }
                        }}
                      />
                      {formatDateLabel(d)}
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
