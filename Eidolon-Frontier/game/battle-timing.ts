export type BattleSpeed = 1 | 2;

// Combat keeps an exact 2:1 relationship between the two player-facing speed
// settings. A prior pass shortened both modes by 25%, but that made normal
// (1x) speed read as what 2x should feel like — restored to the earlier,
// slower cadence. These values are shared by React phase waits, CSS motion
// and Remotion playback so a pose change cannot drift away from its contact
// effect or enemy stagger.
export const BATTLE_TIME_SCALE: Record<BattleSpeed, number> = {
  1: 2,
  2: 1,
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
