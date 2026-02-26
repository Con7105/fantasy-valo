import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';

export function League() {
  const configured = isSupabaseConfigured();

  return (
    <div className="page">
      <h1>League</h1>
      <p className="caption">
        Create a league, share the link, and have friends join. Start the draft when ready, then track weekly matchups and wins.
      </p>
      {!configured ? (
        <p className="empty">
          Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.
          See <code>web/supabase/README.md</code>.
        </p>
      ) : (
        <section className="section">
          <Link to="/league/new">
            <button type="button" className="event-row" style={{ width: '100%' }}>
              Create league
            </button>
          </Link>
          <p className="caption" style={{ marginTop: '0.5rem' }}>
            To join a league, use the link shared by the league creator (e.g. …/league/abc-123).
          </p>
        </section>
      )}
    </div>
  );
}
