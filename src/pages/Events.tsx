import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function Events() {
  const { events, isLoading, selectedEventId, selectedEventName, eventMatches, selectEvent, loadEvents, loadEventMatches, errorMessage, clearError } = useApp();

  const handleSelect = (id: string, name: string) => {
    selectEvent(id, name);
    loadEventMatches();
  };

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
