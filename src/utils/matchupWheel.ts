import type { DraftMatchupRound } from '../types/draft';

/**
 * "Wheel of names": generate matchups so each participant faces others with no repeat.
 * Round-robin: fix first person, rotate others; each round pairs position i with position n-1-i.
 */
export function generateMatchupRounds(participantNames: string[]): DraftMatchupRound[] {
  const n = participantNames.length;
  if (n < 2) return [];

  const rounds: DraftMatchupRound[] = [];
  const others = Array.from({ length: n - 1 }, (_, i) => i + 1);
  for (let r = 0; r < n - 1; r++) {
    const rotated = [0, ...others.map((_, i) => others[(i + r) % (n - 1)])];
    const pairs: [string, string][] = [];
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const a = rotated[i];
      const b = rotated[n - 1 - i];
      if (a !== b) pairs.push([participantNames[a], participantNames[b]]);
    }
    rounds.push({ round: r + 1, pairs });
  }
  return rounds;
}
