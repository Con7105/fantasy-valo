/**
 * Snake draft: round 1 order = snake_order, round 2 = reversed, round 3 = same as 1, etc.
 * current_pick_index is the global index (0-based) across all rounds.
 */

export function getTotalPicks(participantCount: number, slotCount: number): number {
  return participantCount * slotCount;
}

export function getOrderForRound(snakeOrder: number[], round: number): number[] {
  return round % 2 === 1 ? [...snakeOrder] : [...snakeOrder].reverse();
}

/**
 * Given current_round and current_pick_index (0-based global), return the participant index whose turn it is.
 * Assumes picks are stored in order; current_pick_index is the index of the *next* pick to make.
 */
export function getCurrentParticipantIndex(
  snakeOrder: number[],
  currentRound: number,
  currentPickIndexInRound: number
): number {
  const order = getOrderForRound(snakeOrder, currentRound);
  return order[currentPickIndexInRound];
}

/**
 * From global pick index (0 .. totalPicks-1), get round (1-based) and pick index within round.
 */
export function globalPickToRoundAndIndex(
  globalPickIndex: number,
  participantCount: number
): { round: number; pickIndexInRound: number } {
  const round = Math.floor(globalPickIndex / participantCount) + 1;
  const pickIndexInRound = globalPickIndex % participantCount;
  return { round, pickIndexInRound };
}

/**
 * Who picks at the given global pick index?
 */
export function getParticipantIndexAtGlobalPick(
  snakeOrder: number[],
  globalPickIndex: number,
  participantCount: number
): number {
  const { round, pickIndexInRound } = globalPickToRoundAndIndex(globalPickIndex, participantCount);
  const order = getOrderForRound(snakeOrder, round);
  return order[pickIndexInRound];
}

/**
 * Shuffle array (Fisher–Yates) and return new array.
 */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Generate random snake order (indices 0 .. n-1).
 */
export function randomSnakeOrder(participantCount: number): number[] {
  return shuffle(Array.from({ length: participantCount }, (_, i) => i));
}
