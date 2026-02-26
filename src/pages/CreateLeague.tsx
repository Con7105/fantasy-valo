import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export function CreateLeague() {
  const navigate = useNavigate();
  const { events, selectedEventId, selectedEventName, selectEvent, loadEvents } = useApp();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventId = selectedEventId ?? events[0]?.id;
  const eventName = selectedEventName ?? events[0]?.name ?? '';

  const handleCreate = async () => {
    if (!supabase || !eventId || !eventName) return;
    setCreating(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('leagues')
      .insert({
        name: name.trim() || null,
        event_id: eventId,
        event_name: eventName,
        status: 'joining',
      })
      .select('id')
      .single();
    setCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data?.id) navigate(`/league/${data.id}`, { replace: true });
  };

  if (!supabase) {
    return (
      <div className="page">
        <Link to="/league">← League</Link>
        <h1>Create league</h1>
        <p className="empty">Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/league">← League</Link>
      <h1>Create league</h1>
      {error && (
        <div className="error-banner">
          {error}
          <button type="button" onClick={() => setError(null)}>OK</button>
        </div>
      )}
      <section className="section">
        <h2>League name (optional)</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Masters 2026"
          className="input-url"
        />
      </section>
      <section className="section">
        <h2>Event</h2>
        <p className="caption">Select the event for the draft and weekly scoring.</p>
        {events.length === 0 ? (
          <button type="button" onClick={loadEvents}>Load events</button>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`event-row ${e.id === eventId ? 'selected' : ''}`}
                  onClick={() => selectEvent(e.id, e.name)}
                >
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {eventId && <p><strong>Selected:</strong> {eventName}</p>}
      </section>
      <section className="section">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!eventId || creating}
        >
          {creating ? 'Creating…' : 'Create league'}
        </button>
      </section>
    </div>
  );
}
