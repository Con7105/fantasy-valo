import { useState, useEffect } from 'react';
import { getApiBaseUrl, setApiBaseUrl } from '../api/config';

export function Settings() {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(getApiBaseUrl());
  }, []);

  const handleChange = (value: string) => {
    setUrl(value);
    if (value.trim()) setApiBaseUrl(value.trim());
  };

  return (
    <div className="page">
      <h1>Settings</h1>
      <section className="section">
        <h2>VLR.gg API</h2>
        <label>
          API base URL
          <input
            type="url"
            value={url}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="https://vlrggapi.vercel.app"
            className="input-url"
          />
        </label>
        <p className="caption">Community API for VLR.gg data (default: vlrggapi.vercel.app).</p>
      </section>
      <section className="section">
        <h2>Fantasy</h2>
        <p className="caption">
          Roster size: 5 players. Scoring: Per-map points (Kill +3, First kill +2, Assists
          +1.5, First death -1, highest ACS/KAST/ADR/HS% +2 each, team win +3). Final =
          average of maps, rounded to tenths.
        </p>
      </section>
    </div>
  );
}
