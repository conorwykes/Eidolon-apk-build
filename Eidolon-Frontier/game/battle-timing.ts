export type BattleSpeed = 1 | 2;

// A prior pass shortened both modes by 25%, but that made normal (1x) speed
// read as what 2x should feel like — restored to the earlier, slower cadence.
// 1x was later found still too fast — every unit's whole attack (approach
// through return) reads as a blur at "normal" speed — so it now runs 1.25x
// slower than a plain 2:1 ratio would give. These values are shared by React
// phase waits, CSS motion and Remotion playback so a pose change cannot
// drift away from its contact effect or enemy stagger.
export const BATTLE_TIME_SCALE: Record<BattleSpeed, number> = {
  1: 2.5,
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
