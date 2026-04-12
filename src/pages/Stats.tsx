import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from '../context/TeamsContext';
import { PlayerStatsBreakdownModal } from '../components/PlayerStatsBreakdownModal';
import type { EventPlayerStatNorm } from '../types';

type NumericStatKey = 'kills' | 'deaths' | 'assists' | 'firstKills' | 'firstDeaths' | 'acs' | 'adr' | 'kdRatio' | 'rating';

const STAT_OPTIONS: { key: NumericStatKey; label: string }[] = [
  { key: 'kills', label: 'Kills' },
  { key: 'deaths', label: 'Deaths' },
  { key: 'assists', label: 'Assists' },
  { key: 'firstKills', label: 'First kills' },
  { key: 'firstDeaths', label: 'First deaths' },
  { key: 'acs', label: 'ACS' },
  { key: 'adr', label: 'ADR' },
  { key: 'kdRatio', label: 'K/D ratio' },
  { key: 'rating', label: 'Rating' },
];

type SortOption = 'avg-desc' | NumericStatKey | 'custom';

function getStatValue(stat: EventPlayerStatNorm, key: NumericStatKey): number {
  const v = stat[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  return 0;
}

function isPlayerInAnyTeam(
  stat: EventPlayerStatNorm,
  teams: { players: { playerName: string; teamName: string }[] }[]
): boolean {
  return teams.some((t) =>
    t.players.some((p) => p.playerName === stat.playerName && p.teamName === stat.teamName)
  );
}

function sortStats(
  stats: EventPlayerStatNorm[],
  sortBy: SortOption,
  pointsForPlayer: (name: string, team: string) => number | null,
  customRatio?: { num: NumericStatKey; den: NumericStatKey }
): EventPlayerStatNorm[] {
  return [...stats].sort((a, b) => {
    if (sortBy === 'avg-desc') {
      const ptsA = pointsForPlayer(a.playerName, a.teamName) ?? 0;
      const ptsB = pointsForPlayer(b.playerName, b.teamName) ?? 0;
      return ptsB - ptsA;
    }
    if (sortBy === 'custom' && customRatio) {
      const denA = getStatValue(a, customRatio.den);
      const denB = getStatValue(b, customRatio.den);
      const numA = getStatValue(a, customRatio.num);
      const numB = getStatValue(b, customRatio.num);
      const ratioA = denA !== 0 ? numA / denA : (numA > 0 ? 1e9 : 0);
      const ratioB = denB !== 0 ? numB / denB : (numB > 0 ? 1e9 : 0);
      return ratioB - ratioA;
    }
    if (STAT_OPTIONS.some((o) => o.key === sortBy)) {
      const va = getStatValue(a, sortBy as NumericStatKey);
      const vb = getStatValue(b, sortBy as NumericStatKey);
      return vb - va;
    }
    return 0;
  });
}

function getSingleStatDisplay(
  stat: EventPlayerStatNorm,
  sortBy: SortOption,
  customRatio: { num: NumericStatKey; den: NumericStatKey } | undefined,
  mapCount: number
): { label: string; value: string } | null {
  if (sortBy === 'avg-desc') return null;
  const avg = (v: number) => (mapCount > 0 ? v / mapCount : 0);
  if (sortBy === 'custom' && customRatio) {
    const den = getStatValue(stat, customRatio.den);
    const num = getStatValue(stat, customRatio.num);
    const ratio = den !== 0 ? num / den : (num > 0 ? 1e9 : 0);
    const numLabel = STAT_OPTIONS.find((o) => o.key === customRatio.num)?.label ?? customRatio.num;
    const denLabel = STAT_OPTIONS.find((o) => o.key === customRatio.den)?.label ?? customRatio.den;
    return { label: `${numLabel} / ${denLabel}`, value: ratio.toFixed(2) };
  }
  const opt = STAT_OPTIONS.find((o) => o.key === sortBy);
  if (!opt) return null;
  const v = getStatValue(stat, sortBy as NumericStatKey);
  if (['acs', 'adr', 'kdRatio', 'rating'].includes(sortBy)) {
    return { label: opt.label, value: v.toFixed(2) };
  }
  return { label: opt.label, value: `${v} (${avg(v).toFixed(1)}/map)` };
}

export function Stats() {
  const {
    selectedEventId,
    eventStats,
    loadFantasyData,
    pointsForPlayer,
    getPlayerBreakdown,
  } = useApp();
  const { teams } = useTeams();
  const [selectedPlayer, setSelectedPlayer] = useState<{
    playerName: string;
    teamName: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('avg-desc');
  const [customNum, setCustomNum] = useState<NumericStatKey>('kills');
  const [customDen, setCustomDen] = useState<NumericStatKey>('deaths');

  useEffect(() => {
    if (selectedEventId && eventStats.length === 0) loadFantasyData();
  }, [selectedEventId, eventStats.length, loadFantasyData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadFantasyData();
    setLoading(false);
  };

  const customRatio = sortBy === 'custom' ? { num: customNum, den: customDen } : undefined;

  const { inTeamStats, notInTeamStats } = useMemo(() => {
    const stats = eventStats;
    const inTeam: EventPlayerStatNorm[] = [];
    const notInTeam: EventPlayerStatNorm[] = [];
    for (const stat of stats) {
      if (isPlayerInAnyTeam(stat, teams)) inTeam.push(stat);
      else notInTeam.push(stat);
    }
    return {
      inTeamStats: sortStats(inTeam, sortBy, pointsForPlayer, customRatio),
      notInTeamStats: sortStats(notInTeam, sortBy, pointsForPlayer, customRatio),
    };
  }, [eventStats, teams, sortBy, pointsForPlayer, customRatio]);

  function renderPlayerRow(stat: EventPlayerStatNorm) {
    const userTeamLabels = teams.filter((t) =>
      t.players.some((p) => p.playerName === stat.playerName && p.teamName === stat.teamName)
    ).map((t) => t.label);
    const breakdowns = getPlayerBreakdown(stat.playerName, stat.teamName);
    const mapCount = breakdowns?.length ?? 1;
    const singleStat = getSingleStatDisplay(stat, sortBy, customRatio, mapCount);
    return (
      <li key={`${stat.playerName}-${stat.teamName}`} className="roster-slot stats-roster-slot">
        <button
          type="button"
          className="roster-slot-info"
          onClick={() => setSelectedPlayer({ playerName: stat.playerName, teamName: stat.teamName })}
          title="View points breakdown"
        >
          <span className="player-name">{stat.playerName}</span>
          <span className="team-name"> {stat.teamName}</span>
          {userTeamLabels.length > 0 && (
            <span className="user-team-labels"> {userTeamLabels.join(', ')}</span>
          )}
        </button>
        {singleStat && (
          <div className="stats-row-raw stats-row-single" aria-label={singleStat.label}>
            <span className="stats-raw-item">{singleStat.label}: {singleStat.value}</span>
          </div>
        )}
        {breakdowns && breakdowns.length > 0 ? (
          <span className="roster-map-pts" title={`Map points: ${breakdowns.map((b, i) => `Map ${i + 1}: ${b.total.toFixed(1)}`).join(', ')}`}>
            {breakdowns.map((b, i) => (
              <span key={i} className="roster-map-pt">{b.total.toFixed(1)}</span>
            ))}
          </span>
        ) : null}
        <span className="slot-pts" title="Average fantasy points">
          {pointsForPlayer(stat.playerName, stat.teamName)?.toFixed(1) ?? '—'}
        </span>
      </li>
    );
  }

  if (!selectedEventId) {
    return (
      <div className="page">
        <h1>Stats</h1>
        <p className="empty">No event selected. Select an event in the Events tab first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Stats</h1>
      <p className="caption">
        All players in the selected event with their map-by-map points and average. Click a player for full breakdown.
      </p>
      <p className="caption stats-sort-note">
        All sort options order players from high to low.
      </p>

      <section className="section stats-actions">
        <button
          type="button"
          className="btn primary"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh points'}
        </button>
        <div className="stats-filter">
          <label htmlFor="stats-sort">Sort by</label>
          <select
            id="stats-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="avg-desc">Average points</option>
            {STAT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
            <option value="custom">Custom ratio…</option>
          </select>
        </div>
        {sortBy === 'custom' && (
          <div className="stats-custom-ratio">
            <span className="stats-custom-ratio-label">Ratio:</span>
            <select
              aria-label="Numerator stat"
              value={customNum}
              onChange={(e) => setCustomNum(e.target.value as NumericStatKey)}
            >
              {STAT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <span className="stats-custom-ratio-divider">/</span>
            <select
              aria-label="Denominator stat"
              value={customDen}
              onChange={(e) => setCustomDen(e.target.value as NumericStatKey)}
            >
              {STAT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="section">
        {eventStats.length === 0 ? (
          <p className="empty">No player data yet. Use Refresh points to load event stats.</p>
        ) : (
          <>
            {inTeamStats.length > 0 && (
              <>
                <h2>Players in your teams</h2>
                <ul className="list roster-list stats-player-list">
                  {inTeamStats.map((stat) => renderPlayerRow(stat))}
                </ul>
              </>
            )}
            <h2>{inTeamStats.length > 0 ? 'Players not on any team' : 'Players'}</h2>
            <ul className="list roster-list stats-player-list">
              {notInTeamStats.map((stat) => renderPlayerRow(stat))}
            </ul>
          </>
        )}
      </section>

      {selectedPlayer && (
        <PlayerStatsBreakdownModal
          playerName={selectedPlayer.playerName}
          teamName={selectedPlayer.teamName}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
