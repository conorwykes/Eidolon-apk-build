export type BattleSpeed = 1 | 2;

// Combat keeps an exact 2:1 relationship between the two player-facing speed
// settings, but both modes run 25% shorter than the previous cadence. These
// values are shared by React phase waits, CSS motion and Remotion playback so
// a pose change cannot drift away from its contact effect or enemy stagger.
export const BATTLE_TIME_SCALE: Record<BattleSpeed, number> = {
  1: 1.5,
  2: 0.75,
};

export function getBattleTimeScale(speed: BattleSpeed) {
  return BATTLE_TIME_SCALE[speed];
}

export function getBattlePlaybackRate(speed: BattleSpeed) {
  return 2 / getBattleTimeScale(speed);
}

export function getBattleDuration(milliseconds: number, speed: BattleSpeed) {
  return Math.round(milliseconds * getBattleTimeScale(speed));
}
