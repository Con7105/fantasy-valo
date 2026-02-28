import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from '../context/TeamsContext';
import { PlayerStatsBreakdownModal } from '../components/PlayerStatsBreakdownModal';

export function Matchups() {
  const {
    selectedEventId,
    pointsForPlayer,
    loadFantasyData,
  } = useApp();
  const { teams } = useTeams();

  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
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

  const teamA = teams.find((t) => t.id === teamAId) ?? null;
  const teamB = teams.find((t) => t.id === teamBId) ?? null;

  const totalA = teamA
    ? teamA.players.reduce((sum, p) => sum + (pointsForPlayer(p.playerName, p.teamName) ?? 0), 0)
    : 0;
  const totalB = teamB
    ? teamB.players.reduce((sum, p) => sum + (pointsForPlayer(p.playerName, p.teamName) ?? 0), 0)
    : 0;

  const hasTwoTeams = teams.length >= 2;
  const bothSelected = teamA && teamB;

  return (
    <div className="page">
      <h1>Matchups</h1>
      <p className="caption">
        Select two teams to compare their players&apos; points for the selected event. Use Refresh to load latest match data.
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

      {!hasTwoTeams ? (
        <p className="empty">Create at least two teams in the Teams tab to compare matchups.</p>
      ) : (
        <>
          <section className="section matchup-selectors">
            <div className="matchup-select">
              <label htmlFor="team-a">Team A</label>
              <select
                id="team-a"
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="matchup-select">
              <label htmlFor="team-b">Team B</label>
              <select
                id="team-b"
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </section>

          {bothSelected && (
            <section className="section matchup-comparison">
              <div className="matchup-columns">
                <div className={`matchup-column ${totalA >= totalB && totalA > totalB ? 'ahead' : ''}`}>
                  <h2>{teamA.label}</h2>
                  <p className="matchup-total">{totalA.toFixed(1)} pts</p>
                  <ul className="list roster-list">
                    {teamA.players.map((slot) => (
                      <li key={`${slot.playerName}-${slot.teamName}`} className="roster-slot">
                        <button
                          type="button"
                          className="roster-slot-info"
                          onClick={() => setSelectedPlayer({ playerName: slot.playerName, teamName: slot.teamName })}
                          title="View points breakdown"
                        >
                          <span className="player-name">{slot.playerName}</span>
                          <span className="team-name">{slot.teamName}</span>
                          <span className="slot-pts">
                            {pointsForPlayer(slot.playerName, slot.teamName)?.toFixed(1) ?? '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="matchup-vs">vs</div>
                <div className={`matchup-column ${totalB >= totalA && totalB > totalA ? 'ahead' : ''}`}>
                  <h2>{teamB.label}</h2>
                  <p className="matchup-total">{totalB.toFixed(1)} pts</p>
                  <ul className="list roster-list">
                    {teamB.players.map((slot) => (
                      <li key={`${slot.playerName}-${slot.teamName}`} className="roster-slot">
                        <button
                          type="button"
                          className="roster-slot-info"
                          onClick={() => setSelectedPlayer({ playerName: slot.playerName, teamName: slot.teamName })}
                          title="View points breakdown"
                        >
                          <span className="player-name">{slot.playerName}</span>
                          <span className="team-name">{slot.teamName}</span>
                          <span className="slot-pts">
                            {pointsForPlayer(slot.playerName, slot.teamName)?.toFixed(1) ?? '—'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </>
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
