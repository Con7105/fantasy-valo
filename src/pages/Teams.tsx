import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeams } from '../context/TeamsContext';
import { PlayerStatsBreakdownModal } from '../components/PlayerStatsBreakdownModal';
import type { FantasyRosterSlot, FantasyTeam } from '../types';

export function Teams() {
  const {
    selectedEventId,
    eventStats,
    loadFantasyData,
    pointsForPlayer,
    getPlayerBreakdown,
  } = useApp();
  const {
    teams,
    addTeam,
    updateTeam,
    deleteTeam,
    addPlayerToTeam,
    removePlayerFromTeam,
  } = useTeams();

  const [newLabel, setNewLabel] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{ playerName: string; teamName: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedEventId && eventStats.length === 0) loadFantasyData();
  }, [selectedEventId, eventStats.length, loadFantasyData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadFantasyData();
    setLoading(false);
  };

  if (!selectedEventId) {
    return (
      <div className="page">
        <h1>Teams</h1>
        <p className="empty">No event selected. Select an event in the Events tab first.</p>
      </div>
    );
  }

  const handleCreateTeam = () => {
    const label = newLabel.trim() || 'Unnamed team';
    addTeam(label);
    setNewLabel('');
  };

  const startEditLabel = (team: FantasyTeam) => {
    setEditingLabelId(team.id);
    setEditingLabelValue(team.label);
  };

  const saveEditLabel = (id: string) => {
    if (editingLabelValue.trim()) updateTeam(id, { label: editingLabelValue.trim() });
    setEditingLabelId(null);
    setEditingLabelValue('');
  };

  const addPlayer = (teamId: string, stat: { playerName: string; teamName: string; playerUrl?: string }) => {
    const slot: FantasyRosterSlot = {
      playerName: stat.playerName,
      teamName: stat.teamName,
      playerUrl: stat.playerUrl,
    };
    addPlayerToTeam(teamId, slot);
  };

  const addingToTeam = addingToTeamId ? teams.find((t) => t.id === addingToTeamId) : null;

  return (
    <div className="page">
      <h1>Teams</h1>
      <p className="caption">Create teams and add players from the selected event. Use Matchups to compare two teams.</p>

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

      <section className="section">
        <h2>Create team</h2>
        <div className="create-team-row">
          <input
            type="text"
            className="input"
            placeholder="Team name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
          <button type="button" className="btn primary" onClick={handleCreateTeam}>
            Create team
          </button>
        </div>
      </section>

      <section className="section">
        <h2>Your teams</h2>
        {teams.length === 0 ? (
          <p className="empty">No teams yet. Create one above.</p>
        ) : (
          <ul className="list teams-list">
            {teams.map((team) => {
              const teamTotal = team.players.reduce((sum, slot) => {
                const pts = pointsForPlayer(slot.playerName, slot.teamName);
                return sum + (pts ?? 0);
              }, 0);
              return (
              <li key={team.id} className="team-card">
                <div className="team-header">
                  {editingLabelId === team.id ? (
                    <>
                      <input
                        type="text"
                        className="input inline-edit"
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditLabel(team.id);
                          if (e.key === 'Escape') setEditingLabelId(null);
                        }}
                        autoFocus
                      />
                      <button type="button" className="btn small" onClick={() => saveEditLabel(team.id)}>Save</button>
                      <button type="button" className="btn small" onClick={() => setEditingLabelId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="team-label">{team.label}</span>
                      <span className="team-meta">({team.players.length} players)</span>
                      <span className="team-total">Total: {teamTotal.toFixed(1)} pts</span>
                      <button type="button" className="btn small" onClick={() => startEditLabel(team)}>Edit label</button>
                      <button type="button" className="btn small" onClick={() => setAddingToTeamId(team.id)}>Add players</button>
                      <button type="button" className="btn small danger" onClick={() => deleteTeam(team.id)}>Delete</button>
                    </>
                  )}
                </div>
                <ul className="list roster-list">
                  {team.players.map((slot) => (
                    <li key={`${slot.playerName}-${slot.teamName}`} className="roster-slot">
                      <button
                        type="button"
                        className="roster-slot-info"
                        onClick={() => setSelectedPlayer({ playerName: slot.playerName, teamName: slot.teamName })}
                        title="View points breakdown"
                      >
                        <span className="player-name">{slot.playerName}</span>
                        <span className="team-name">{slot.teamName}</span>
                      </button>
                      {(() => {
                        const breakdowns = getPlayerBreakdown(slot.playerName, slot.teamName);
                        return breakdowns && breakdowns.length > 0 ? (
                          <span className="roster-map-pts" title={`Map scores: ${breakdowns.map((b, i) => `Map ${i + 1}: ${b.total.toFixed(1)}`).join(', ')}`}>
                            {breakdowns.map((b, i) => (
                              <span key={i} className="roster-map-pt">{b.total.toFixed(1)}</span>
                            ))}
                          </span>
                        ) : null;
                      })()}
                      <span className="slot-pts">
                        {pointsForPlayer(slot.playerName, slot.teamName)?.toFixed(1) ?? '—'}
                      </span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removePlayerFromTeam(team.id, slot)}
                        aria-label={`Remove ${slot.playerName}`}
                      >
                        −
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {addingToTeam && (
        <section className="section add-players-section">
          <h2>Add players to {addingToTeam.label}</h2>
          <button type="button" className="btn small" onClick={() => setAddingToTeamId(null)}>Close</button>
          {eventStats.length === 0 ? (
            <p className="empty">Load event stats first (they load when you open this page).</p>
          ) : (
            <ul className="list player-list">
              {eventStats.map((stat) => {
                const alreadyInTeam = addingToTeam.players.some(
                  (p) => p.playerName === stat.playerName && p.teamName === stat.teamName
                );
                return (
                  <li key={`${stat.playerName}-${stat.teamName}`}>
                    <button
                      type="button"
                      className="player-row"
                      disabled={alreadyInTeam}
                      onClick={() => addPlayer(addingToTeam.id, stat)}
                    >
                      <span className="player-name">{stat.playerName}</span>
                      <span className="team-name">{stat.teamName}</span>
                      <span className="acs">{stat.acs.toFixed(1)} ACS</span>
                      {alreadyInTeam && <span className="caption"> (in team)</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
