import { useApp } from '../context/AppContext';
import type { MapPointsBreakdown } from '../types';
import { fantasyScoring } from '../scoring';

interface PlayerStatsBreakdownModalProps {
  playerName: string;
  teamName: string;
  onClose: () => void;
}

function MapBreakdownRow({ mapIndex, b }: { mapIndex: number; b: MapPointsBreakdown }) {
  const { stats, points } = b;
  return (
    <div className="breakdown-map">
      <h4>Map {mapIndex + 1}</h4>
      <table className="breakdown-table">
        <tbody>
          <tr>
            <td>Kills</td>
            <td>{stats.kills}</td>
            <td className="breakdown-formula">{stats.kills} × 3</td>
            <td className="breakdown-pts">{points.kills.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>First kills</td>
            <td>{stats.firstKills}</td>
            <td className="breakdown-formula">{stats.firstKills} × 2</td>
            <td className="breakdown-pts">{points.firstKills.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>Assists</td>
            <td>{stats.assists}</td>
            <td className="breakdown-formula">{stats.assists} × 1.5</td>
            <td className="breakdown-pts">{points.assists.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>First deaths</td>
            <td>{stats.firstDeaths}</td>
            <td className="breakdown-formula">{stats.firstDeaths} × (-1)</td>
            <td className="breakdown-pts">{points.firstDeaths.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>ACS (highest on map)</td>
            <td>{stats.acs.toFixed(1)}</td>
            <td className="breakdown-formula">{points.acsBonus > 0 ? '+2' : '—'}</td>
            <td className="breakdown-pts">{points.acsBonus.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>KAST% (highest on map)</td>
            <td>{stats.kastPercent.toFixed(0)}%</td>
            <td className="breakdown-formula">{points.kastBonus > 0 ? '+2' : '—'}</td>
            <td className="breakdown-pts">{points.kastBonus.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>ADR (highest on map)</td>
            <td>{stats.adr.toFixed(1)}</td>
            <td className="breakdown-formula">{points.adrBonus > 0 ? '+2' : '—'}</td>
            <td className="breakdown-pts">{points.adrBonus.toFixed(1)} pts</td>
          </tr>
          <tr>
            <td>HS% (highest on map)</td>
            <td>{stats.hsPercent.toFixed(0)}%</td>
            <td className="breakdown-formula">{points.hsBonus > 0 ? '+2' : '—'}</td>
            <td className="breakdown-pts">{points.hsBonus.toFixed(1)} pts</td>
          </tr>
          {points.winBonus !== 0 && (
            <tr>
              <td>Team match win</td>
              <td>—</td>
              <td className="breakdown-formula">+{points.winBonus.toFixed(1)}</td>
              <td className="breakdown-pts">{points.winBonus.toFixed(1)} pts</td>
            </tr>
          )}
          <tr className="breakdown-map-total">
            <td colSpan={3}>Map total</td>
            <td className="breakdown-pts">{b.total.toFixed(1)} pts</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PlayerStatsBreakdownModal({
  playerName,
  teamName,
  onClose,
}: PlayerStatsBreakdownModalProps) {
  const { getPlayerBreakdown, pointsForPlayer } = useApp();
  const breakdowns = getPlayerBreakdown(playerName, teamName);
  const finalScore = pointsForPlayer(playerName, teamName);

  if (!breakdowns?.length) {
    return (
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Points breakdown: {playerName}</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <p className="empty">No stats available for this player yet. Refresh points after matches are played.</p>
        </div>
      </div>
    );
  }

  const mapPoints = breakdowns.map((b) => b.total);
  const computedFinal = fantasyScoring.finalScore(mapPoints);
  const averagePts = finalScore ?? computedFinal;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content modal-content-breakdown" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Points breakdown: {playerName}</h2>
          <span className="breakdown-team">{teamName}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="breakdown-map-summary">
          <h3>Points by map</h3>
          <ul className="breakdown-map-pts-list">
            {breakdowns.map((b, i) => (
              <li key={i}>
                <span className="breakdown-map-label">Map {i + 1}</span>
                <span className="breakdown-map-pts">{b.total.toFixed(1)} pts</span>
              </li>
            ))}
            <li className="breakdown-average-row">
              <span className="breakdown-map-label">Average ({breakdowns.length} map{breakdowns.length !== 1 ? 's' : ''} played)</span>
              <span className="breakdown-map-pts">{averagePts.toFixed(1)} pts</span>
            </li>
          </ul>
        </div>
        <p className="breakdown-final">
          <strong>Final score: {averagePts.toFixed(1)} pts</strong>
        </p>
        <h3 className="breakdown-detail-heading">Stat breakdown per map</h3>
        <div className="breakdown-maps">
          {breakdowns.map((b, i) => (
            <MapBreakdownRow key={i} mapIndex={i} b={b} />
          ))}
        </div>
      </div>
    </div>
  );
}
