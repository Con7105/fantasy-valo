import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from '../context/TeamsContext';
import { PlayerStatsBreakdownModal } from '../components/PlayerStatsBreakdownModal';
import type { EventPlayerStatNorm } from '../types';

type SortOption = 'none' | 'avg-desc';

function isPlayerInAnyTeam(
  stat: EventPlayerStatNorm,
  teams: { players: { playerName: string; teamName: string }[] }[]
): boolean {
  return teams.some((t) =>
    t.players.some((p) => p.playerName === stat.playerName && p.teamName === stat.teamName)
  );
}

function sortStats(stats: EventPlayerStatNorm[], sortBy: SortOption, pointsForPlayer: (name: string, team: string) => number | null): EventPlayerStatNorm[] {
  if (sortBy === 'none') return stats;
  return [...stats].sort((a, b) => {
    const ptsA = pointsForPlayer(a.playerName, a.teamName) ?? 0;
    const ptsB = pointsForPlayer(b.playerName, b.teamName) ?? 0;
    return ptsB - ptsA;
  });
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
  const [sortBy, setSortBy] = useState<SortOption>('none');

  useEffect(() => {
    if (selectedEventId && eventStats.length === 0) loadFantasyData();
  }, [selectedEventId, eventStats.length, loadFantasyData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadFantasyData();
    setLoading(false);
  };

  const { inTeamStats, notInTeamStats } = useMemo(() => {
    const inTeam: EventPlayerStatNorm[] = [];
    const notInTeam: EventPlayerStatNorm[] = [];
    for (const stat of eventStats) {
      if (isPlayerInAnyTeam(stat, teams)) inTeam.push(stat);
      else notInTeam.push(stat);
    }
    return {
      inTeamStats: sortStats(inTeam, sortBy, pointsForPlayer),
      notInTeamStats: sortStats(notInTeam, sortBy, pointsForPlayer),
    };
  }, [eventStats, teams, sortBy, pointsForPlayer]);

  function renderPlayerRow(stat: EventPlayerStatNorm) {
    const userTeamLabels = teams.filter((t) =>
      t.players.some((p) => p.playerName === stat.playerName && p.teamName === stat.teamName)
    ).map((t) => t.label);
    const breakdowns = getPlayerBreakdown(stat.playerName, stat.teamName);
    return (
      <li key={`${stat.playerName}-${stat.teamName}`} className="roster-slot">
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
        {breakdowns && breakdowns.length > 0 ? (
          <span className="roster-map-pts" title={`Map scores: ${breakdowns.map((b, i) => `Map ${i + 1}: ${b.total.toFixed(1)}`).join(', ')}`}>
            {breakdowns.map((b, i) => (
              <span key={i} className="roster-map-pt">{b.total.toFixed(1)}</span>
            ))}
          </span>
        ) : null}
        <span className="slot-pts">
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
            <option value="none">None</option>
            <option value="avg-desc">Average points (high to low)</option>
          </select>
        </div>
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
