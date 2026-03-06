import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { normalizeMatchDate } from '../api/vlrService';

const PLAYOFFS_MM_DD_START = '03-06';
const PLAYOFFS_MM_DD_END = '03-15';

function isPlayoffsDate(yyyyMmDd: string): boolean {
  if (yyyyMmDd.length < 10) return false;
  const mmdd = yyyyMmDd.slice(5, 10);
  return mmdd >= PLAYOFFS_MM_DD_START && mmdd <= PLAYOFFS_MM_DD_END;
}

const MONTHS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function formatPlayoffDateLabel(yyyyMmDd: string): string {
  const [, mm, dd] = yyyyMmDd.split('-');
  const month = MONTHS[mm ?? ''] ?? mm;
  const day = dd ? parseInt(dd, 10) : 0;
  return `${month} ${day}`;
}

export function Events() {
  const {
    events,
    isLoading,
    selectedEventId,
    selectedEventName,
    eventMatches,
    selectedPlayoffDates,
    setSelectedPlayoffDates,
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

  const { playoffDateOptions } = useMemo(() => {
    const dates = new Set<string>();
    for (const m of eventMatches) {
      const d = normalizeMatchDate(m.date);
      if (d && isPlayoffsDate(d)) dates.add(d);
    }
    const sorted = Array.from(dates).sort();
    const options = sorted.map((date) => ({
      date,
      label: formatPlayoffDateLabel(date),
    }));
    return { playoffDateOptions: options };
  }, [eventMatches]);

  const allSelected = selectedPlayoffDates.length === 0;
  const isDateSelected = (date: string) =>
    allSelected || selectedPlayoffDates.includes(date);

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
          {selectedEventId && playoffDateOptions.length > 0 && (
            <section className="section score-period-section">
              <h2>Score period (playoffs)</h2>
              <p className="caption">
                Points are from playoff matches only (Mar 6–Mar 15). Choose which days to include. Use &quot;Refresh points&quot; on Teams or Matchups after changing.
              </p>
              <div className="week-selector">
                <button
                  type="button"
                  className={`btn small ${allSelected ? 'primary' : ''}`}
                  onClick={() => setSelectedPlayoffDates([])}
                >
                  All playoffs
                </button>
                {playoffDateOptions.map(({ date, label }) => (
                  <button
                    key={date}
                    type="button"
                    className={`btn small ${isDateSelected(date) ? 'primary' : ''}`}
                    onClick={() => setSelectedPlayoffDates([date])}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="date-checkboxes">
                <span className="date-checkboxes-label">Or select multiple days:</span>
                {playoffDateOptions.map(({ date, label }) => {
                  const checked = allSelected || selectedPlayoffDates.includes(date);
                  return (
                    <label key={date} className="date-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedPlayoffDates(
                              playoffDateOptions.map((o) => o.date).filter((d) => d !== date)
                            );
                          } else if (selectedPlayoffDates.includes(date)) {
                            const next = selectedPlayoffDates.filter((d) => d !== date);
                            setSelectedPlayoffDates(next.length > 0 ? next : []);
                          } else {
                            const next = [...selectedPlayoffDates, date].sort();
                            setSelectedPlayoffDates(
                              next.length === playoffDateOptions.length ? [] : next
                            );
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
