import type { DraftRoomRow, DraftPickRow } from '../types/draft';

interface DraftBoardProps {
  room: DraftRoomRow;
  picks: DraftPickRow[];
  currentTurnParticipantIndex: number | null;
}

function getPickForCell(
  picks: DraftPickRow[],
  round: number,
  participantIndex: number
): DraftPickRow | undefined {
  return picks.find((p) => p.round === round && p.participant_index === participantIndex);
}

export function DraftBoard({ room, picks, currentTurnParticipantIndex }: DraftBoardProps) {
  const { participant_names, slot_count, current_round } = room;
  const rounds = Array.from({ length: slot_count }, (_, i) => i + 1);

  return (
    <div className="draft-board">
      <table>
        <thead>
          <tr>
            <th>Round</th>
            {participant_names.map((name, i) => (
              <th
                key={i}
                className={currentTurnParticipantIndex === i ? 'cell-turn' : ''}
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round}>
              <td><strong>{round}</strong></td>
              {participant_names.map((_, participantIndex) => {
                const pick = getPickForCell(picks, round, participantIndex);
                const isCurrentTurnCell =
                  round === current_round && participantIndex === currentTurnParticipantIndex;
                return (
                  <td
                    key={participantIndex}
                    className={`pick-cell ${isCurrentTurnCell ? 'cell-turn' : ''}`}
                  >
                    {pick ? (
                      <span title={pick.team_name}>{pick.player_name}</span>
                    ) : isCurrentTurnCell ? (
                      <span className="caption">Pick…</span>
                    ) : (
                      '—'
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
