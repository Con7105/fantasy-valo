import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from '../context/TeamsContext';
import { PlayerStatsBreakdownModal } from '../components/PlayerStatsBreakdownModal';
import type { FantasyTeam } from '../types';

export function Matchups() {
  const {
    selectedEventId,
    pointsForPlayer,
    loadFantasyData,
  } = useApp();
  const { teams } = useTeams();

  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    playerName: string;
    teamName: string;
  } | null>(null);

  useEffect(() => {
    if (selectedEventId) loadFantasyData();
  }, [selectedEventId, loadFantasyData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadFantasyData();
    setLoading(false);
  };

  if (!selectedEventId) {
    return (
      <div className="page">
        <h1>Matchups</h1>
        <p className="empty">No event selected. Select an event in the Events tab first.</p>
      </div>
    );
  }

  const teamsWithTotals: { team: FantasyTeam; total: number }[] = teams.map((team) => {
    const total = team.players.reduce(
      (sum, p) => sum + (pointsForPlayer(p.playerName, p.teamName) ?? 0),
      0
    );
    return { team, total };
  });

  const ranked = [...teamsWithTotals].sort((a, b) => b.total - a.total);

  return (
    <div className="page">
      <h1>Matchups</h1>
      <p className="caption">
        All your teams ranked by total points for the selected event. Use Refresh to load latest match data.
      </p>

      <section className="section">
        <button
          type="button"
          className="btn primary"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Refresh points'}
        </button>
      </section>

      {teams.length === 0 ? (
        <p className="empty">Create teams in the Teams tab to see them ranked here.</p>
      ) : (
        <section className="section matchup-rankings">
          <div className="matchup-rank-grid">
            {ranked.map(({ team, total }, index) => (
              <div key={team.id} className="matchup-rank-card">
                <div className="matchup-rank-header">
                  <span className="matchup-rank-number">#{index + 1}</span>
                  <h2 className="matchup-rank-label">{team.label}</h2>
                </div>
                <ul className="matchup-rank-players">
                  {team.players.map((slot) => {
                    const pts = pointsForPlayer(slot.playerName, slot.teamName);
                    return (
                      <li key={`${slot.playerName}-${slot.teamName}`} className="matchup-rank-player-row">
                        <button
                          type="button"
                          className="matchup-rank-player-btn"
                          onClick={() => setSelectedPlayer({ playerName: slot.playerName, teamName: slot.teamName })}
                          title="View points breakdown"
                        >
                          <span className="matchup-rank-player-name">{slot.playerName}</span>
                          <span className="matchup-rank-player-team">({slot.teamName})</span>
                          <span className="matchup-rank-player-pts">{pts != null ? pts.toFixed(1) : '—'}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="matchup-rank-total">Total: {total.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

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
