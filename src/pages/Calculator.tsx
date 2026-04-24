import { useMemo, useState } from 'react';
import { fantasyScoring } from '../scoring';
import type { ClutchCounts, MapPlayerStatsInput, MultikillCounts } from '../types';

interface ManualCalcForm {
  playerName: string;
  teamName: string;
  mapName: string;
  kills: number;
  firstKills: number;
  assists: number;
  firstDeaths: number;
  acs: number;
  kastPercent: number;
  adr: number;
  hsPercent: number;
  mapAcsHigh: number;
  mapKastHigh: number;
  mapAdrHigh: number;
  mapHsHigh: number;
  clutch1v1: number;
  clutch1v2: number;
  clutch1v3: number;
  clutch1v4: number;
  clutch1v5: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  winBonus: number;
}

interface CalcHistoryItem {
  id: string;
  createdAtIso: string;
  playerName: string;
  teamName: string;
  mapName: string;
  total: number;
  form: ManualCalcForm;
}

const HISTORY_STORAGE_KEY = 'manual-map-score-history-v1';
const HISTORY_LIMIT = 50;

const initialForm: ManualCalcForm = {
  playerName: '',
  teamName: '',
  mapName: '',
  kills: 0,
  firstKills: 0,
  assists: 0,
  firstDeaths: 0,
  acs: 0,
  kastPercent: 0,
  adr: 0,
  hsPercent: 0,
  mapAcsHigh: 0,
  mapKastHigh: 0,
  mapAdrHigh: 0,
  mapHsHigh: 0,
  clutch1v1: 0,
  clutch1v2: 0,
  clutch1v3: 0,
  clutch1v4: 0,
  clutch1v5: 0,
  k2: 0,
  k3: 0,
  k4: 0,
  k5: 0,
  winBonus: 0,
};

function safeNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function loadHistory(): CalcHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CalcHistoryItem[];
  } catch {
    return [];
  }
}

export function Calculator() {
  const [form, setForm] = useState<ManualCalcForm>(initialForm);
  const [history, setHistory] = useState<CalcHistoryItem[]>(() => loadHistory());
  const [lastResult, setLastResult] = useState<number | null>(null);

  const clutches: ClutchCounts = useMemo(
    () => ({
      clutch1v1: form.clutch1v1,
      clutch1v2: form.clutch1v2,
      clutch1v3: form.clutch1v3,
      clutch1v4: form.clutch1v4,
      clutch1v5: form.clutch1v5,
    }),
    [form.clutch1v1, form.clutch1v2, form.clutch1v3, form.clutch1v4, form.clutch1v5]
  );

  const multikills: MultikillCounts = useMemo(
    () => ({ k2: form.k2, k3: form.k3, k4: form.k4, k5: form.k5 }),
    [form.k2, form.k3, form.k4, form.k5]
  );

  function persistHistory(next: CalcHistoryItem[]) {
    setHistory(next);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  }

  function updateNumeric<K extends keyof ManualCalcForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: safeNumber(value) }));
  }

  function updateText<K extends keyof ManualCalcForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function calculate() {
    const playerInput: MapPlayerStatsInput = {
      name: form.playerName.trim() || 'Manual Player',
      team: form.teamName.trim() || 'Manual Team',
      kills: form.kills,
      firstKills: form.firstKills,
      assists: form.assists,
      firstDeaths: form.firstDeaths,
      acs: form.acs,
      kastPercent: form.kastPercent,
      adr: form.adr,
      hsPercent: form.hsPercent,
      clutches,
    };

    const allPlayersOnMap: MapPlayerStatsInput[] = [
      playerInput,
      {
        ...playerInput,
        name: '__manual_map_highs__',
        kills: 0,
        firstKills: 0,
        assists: 0,
        firstDeaths: 0,
        acs: form.mapAcsHigh,
        kastPercent: form.mapKastHigh,
        adr: form.mapAdrHigh,
        hsPercent: form.mapHsHigh,
      },
    ];

    const breakdown = fantasyScoring.pointsForMapBreakdown(
      playerInput,
      allPlayersOnMap,
      form.winBonus,
      { clutches, multikills }
    );

    const rounded = Math.round(breakdown.total * 10) / 10;
    setLastResult(rounded);

    const item: CalcHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAtIso: new Date().toISOString(),
      playerName: playerInput.name,
      teamName: playerInput.team,
      mapName: form.mapName.trim() || 'Unknown map',
      total: rounded,
      form,
    };

    const next = [item, ...history].slice(0, HISTORY_LIMIT);
    persistHistory(next);
  }

  function clearHistory() {
    persistHistory([]);
  }

  return (
    <div className="page">
      <h1>Calculator</h1>
      <p className="caption">
        Manual map score calculator for downtime. Enter a player's map stats and map highs to compute fantasy points by hand.
      </p>

      <section className="section calculator-grid">
        <label className="calculator-field">
          <span>Player</span>
          <input className="input" value={form.playerName} onChange={(e) => updateText('playerName', e.target.value)} />
        </label>
        <label className="calculator-field">
          <span>Team</span>
          <input className="input" value={form.teamName} onChange={(e) => updateText('teamName', e.target.value)} />
        </label>
        <label className="calculator-field">
          <span>Map</span>
          <input className="input" value={form.mapName} onChange={(e) => updateText('mapName', e.target.value)} />
        </label>
      </section>

      <section className="section">
        <h2>Player map stats</h2>
        <div className="calculator-grid">
          <label className="calculator-field"><span>Kills</span><input className="input" type="number" value={form.kills} onChange={(e) => updateNumeric('kills', e.target.value)} /></label>
          <label className="calculator-field"><span>First Kills</span><input className="input" type="number" value={form.firstKills} onChange={(e) => updateNumeric('firstKills', e.target.value)} /></label>
          <label className="calculator-field"><span>Assists</span><input className="input" type="number" value={form.assists} onChange={(e) => updateNumeric('assists', e.target.value)} /></label>
          <label className="calculator-field"><span>First Deaths</span><input className="input" type="number" value={form.firstDeaths} onChange={(e) => updateNumeric('firstDeaths', e.target.value)} /></label>
          <label className="calculator-field"><span>ACS</span><input className="input" type="number" value={form.acs} onChange={(e) => updateNumeric('acs', e.target.value)} /></label>
          <label className="calculator-field"><span>KAST %</span><input className="input" type="number" value={form.kastPercent} onChange={(e) => updateNumeric('kastPercent', e.target.value)} /></label>
          <label className="calculator-field"><span>ADR</span><input className="input" type="number" value={form.adr} onChange={(e) => updateNumeric('adr', e.target.value)} /></label>
          <label className="calculator-field"><span>HS %</span><input className="input" type="number" value={form.hsPercent} onChange={(e) => updateNumeric('hsPercent', e.target.value)} /></label>
        </div>
      </section>

      <section className="section">
        <h2>Map highs for bonus checks</h2>
        <div className="calculator-grid">
          <label className="calculator-field"><span>Highest ACS on map</span><input className="input" type="number" value={form.mapAcsHigh} onChange={(e) => updateNumeric('mapAcsHigh', e.target.value)} /></label>
          <label className="calculator-field"><span>Highest KAST % on map</span><input className="input" type="number" value={form.mapKastHigh} onChange={(e) => updateNumeric('mapKastHigh', e.target.value)} /></label>
          <label className="calculator-field"><span>Highest ADR on map</span><input className="input" type="number" value={form.mapAdrHigh} onChange={(e) => updateNumeric('mapAdrHigh', e.target.value)} /></label>
          <label className="calculator-field"><span>Highest HS % on map</span><input className="input" type="number" value={form.mapHsHigh} onChange={(e) => updateNumeric('mapHsHigh', e.target.value)} /></label>
        </div>
      </section>

      <section className="section">
        <h2>Clutches and multikills</h2>
        <div className="calculator-grid">
          <label className="calculator-field"><span>1v1 Clutches</span><input className="input" type="number" value={form.clutch1v1} onChange={(e) => updateNumeric('clutch1v1', e.target.value)} /></label>
          <label className="calculator-field"><span>1v2 Clutches</span><input className="input" type="number" value={form.clutch1v2} onChange={(e) => updateNumeric('clutch1v2', e.target.value)} /></label>
          <label className="calculator-field"><span>1v3 Clutches</span><input className="input" type="number" value={form.clutch1v3} onChange={(e) => updateNumeric('clutch1v3', e.target.value)} /></label>
          <label className="calculator-field"><span>1v4 Clutches</span><input className="input" type="number" value={form.clutch1v4} onChange={(e) => updateNumeric('clutch1v4', e.target.value)} /></label>
          <label className="calculator-field"><span>1v5 Clutches</span><input className="input" type="number" value={form.clutch1v5} onChange={(e) => updateNumeric('clutch1v5', e.target.value)} /></label>
          <label className="calculator-field"><span>2K rounds</span><input className="input" type="number" value={form.k2} onChange={(e) => updateNumeric('k2', e.target.value)} /></label>
          <label className="calculator-field"><span>3K rounds</span><input className="input" type="number" value={form.k3} onChange={(e) => updateNumeric('k3', e.target.value)} /></label>
          <label className="calculator-field"><span>4K rounds</span><input className="input" type="number" value={form.k4} onChange={(e) => updateNumeric('k4', e.target.value)} /></label>
          <label className="calculator-field"><span>5K rounds</span><input className="input" type="number" value={form.k5} onChange={(e) => updateNumeric('k5', e.target.value)} /></label>
          <label className="calculator-field"><span>Win bonus points</span><input className="input" type="number" step="0.1" value={form.winBonus} onChange={(e) => updateNumeric('winBonus', e.target.value)} /></label>
        </div>
      </section>

      <section className="section calculator-actions">
        <button type="button" className="btn primary" onClick={calculate}>Calculate map score</button>
        {lastResult !== null && <p className="total-points">Map score: {lastResult.toFixed(1)}</p>}
      </section>

      <section className="section">
        <div className="calculator-history-header">
          <h2>History</h2>
          <button type="button" className="btn small danger" onClick={clearHistory} disabled={history.length === 0}>
            Clear history
          </button>
        </div>
        {history.length === 0 ? (
          <p className="empty">No saved calculations yet.</p>
        ) : (
          <ul className="list">
            {history.map((item) => (
              <li key={item.id} className="match-row calculator-history-row">
                <div className="calculator-history-top">
                  <strong>{item.playerName}</strong>
                  <span className="team-name">{item.teamName}</span>
                </div>
                <div className="calculator-history-bottom">
                  <span>{item.mapName}</span>
                  <span>{new Date(item.createdAtIso).toLocaleString()}</span>
                  <span className="slot-pts">{item.total.toFixed(1)} pts</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
