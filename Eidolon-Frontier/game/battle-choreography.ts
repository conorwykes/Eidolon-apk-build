export type BattleUnitId = "kael" | "lyra" | "brannock" | "zephyra" | "solenne" | "nyx";

export type WeaponContactOffset = {
  x: number;
  y: number;
  angle: number;
};

export type EnemyStaggerProfile = {
  recoilX: number;
  recoilY: number;
  recoilRotate: number;
  reboundX: number;
  reboundRotate: number;
  squashX: number;
  squashY: number;
  durationSeconds: number;
  flashBrightness: number;
};

const point = (x: number, y: number, angle: number): WeaponContactOffset => ({ x, y, angle });

// The elemental drawing belongs in the small overlap between the attacker and
// the target, not in the enemy's upper body. Keep this final screen-space shift
// shared by normal attacks, Bursts, damage text and the contact pin so none of
// those layers drift away from one another.
export const BATTLE_CONTACT_GAP_X = 22;
export const BATTLE_CONTACT_DROP_Y = 14;

// Coordinates are measured from the enemy slot's visual centre. Positive X
// moves the effect towards the incoming weapon on the enemy's right edge;
// positive Y moves it towards the grounded foot line. Each entry follows the
// matching source sprite so consecutive attacks do not all strike one generic
// point in the middle of the target.
const NORMAL_WEAPON_CONTACTS: Record<BattleUnitId, WeaponContactOffset[]> = {
  kael: [
    point(19, 8, -34),
    point(21, -3, -4),
    point(18, 10, -17),
    point(20, -12, -58),
    point(17, 14, -72),
  ],
  lyra: [
    point(18, -5, 20),
    point(20, -10, -24),
    point(17, 8, 8),
    point(19, -6, 32),
    point(17, 2, -8),
    point(19, -9, 17),
  ],
  brannock: [
    point(21, 1, -5),
    point(17, 15, -58),
    point(12, 14, -82),
  ],
  zephyra: [
    point(17, -3, -8),
    point(18, -9, -3),
    point(16, -13, -24),
    point(19, -4, 3),
    point(17, 2, 7),
    point(18, -7, -5),
    point(16, -11, -18),
    point(19, -2, 2),
  ],
  solenne: [
    // Her normal attack falls vertically through the enemy's centre instead
    // of connecting from the party-facing weapon edge.
    point(-22, -12, 90),
    point(-22, 1, 90),
    point(-22, -6, 90),
    point(-22, 7, 90),
    point(-22, -9, 90),
    point(-22, 3, 90),
  ],
  nyx: [
    point(20, 7, -33),
    point(19, -7, 39),
    point(17, -12, 63),
    point(20, 8, -21),
    point(18, -3, 11),
    point(21, 5, -12),
    point(17, -14, 52),
    point(20, 0, -40),
    point(16, 12, -76),
  ],
};

// Burst frames use wider arcs and projectiles than ordinary attacks. These
// paths keep every typed effect on the target-facing weapon edge while adding
// a small authored spread across a multi-hit chain.
const BURST_WEAPON_CONTACTS: Record<BattleUnitId, WeaponContactOffset[]> = {
  kael: [
    point(18, 8, -34), point(21, -4, -8), point(17, 11, -22), point(20, -12, -57),
    point(18, 4, -31), point(22, -8, -4), point(17, 13, -70), point(20, -2, -18),
    point(19, -11, -51), point(21, 6, -29), point(18, -5, -9), point(15, 13, -76),
  ],
  lyra: [
    point(18, -7, 18), point(20, 3, -14), point(17, -11, 31), point(19, 7, -5), point(18, -3, 22),
    point(20, -9, -27), point(17, 4, 9), point(19, -13, 39), point(18, 8, -11), point(16, -4, 18),
  ],
  brannock: [
    point(19, 4, -12), point(16, 14, -52), point(13, 13, -79), point(20, -1, -5),
    point(16, 15, -61), point(12, 12, -84), point(19, 5, -18), point(10, 15, -88),
  ],
  zephyra: [
    point(17, -4, -12), point(19, -11, 8), point(16, 3, -18), point(18, -14, 19),
    point(20, -2, -7), point(17, 7, 13), point(19, -9, -21), point(16, -13, 4),
  ],
  solenne: [
    point(17, -11, 15), point(19, -3, -4), point(16, 5, -18), point(18, -8, 24),
    point(20, 1, -7), point(16, -13, 31), point(18, 7, -16), point(15, -5, 9),
  ],
  nyx: [
    point(20, 8, -34), point(18, -9, 42), point(17, -14, 61), point(21, 5, -23),
    point(18, -2, 13), point(20, 10, -45), point(16, -12, 55), point(21, 1, -17), point(17, 13, -74),
  ],
};

export function getWeaponContactOffset(unitId: BattleUnitId, hitIndex: number, burst: boolean) {
  const path = burst ? BURST_WEAPON_CONTACTS[unitId] : NORMAL_WEAPON_CONTACTS[unitId];
  const safeHit = Math.max(1, Math.floor(hitIndex));
  return path[(safeHit - 1) % path.length];
}

export function getWeaponContactPoint({
  unitId,
  hitIndex,
  burst,
  targetLeft,
  targetBottom,
  stageHeight = 355,
}: {
  unitId: BattleUnitId;
  hitIndex: number;
  burst: boolean;
  targetLeft: number;
  targetBottom: number;
  stageHeight?: number;
}) {
  const offset = getWeaponContactOffset(unitId, hitIndex, burst);
  return {
    x: targetLeft + 41 + offset.x + BATTLE_CONTACT_GAP_X,
    y: stageHeight - targetBottom - 46 + offset.y + BATTLE_CONTACT_DROP_Y,
    angle: offset.angle,
  };
}

export function getEnemyStaggerProfile({
  contactY,
  burst,
  finisher,
  critical,
  spark,
  boss,
  compact,
}: {
  contactY: number;
  burst: boolean;
  finisher: boolean;
  critical: boolean;
  spark: boolean;
  boss: boolean;
  compact: boolean;
}): EnemyStaggerProfile {
  const force = (finisher ? 1.72 : burst ? 1.08 : 1)
    * (critical ? 1.27 : 1)
    * (spark ? 1.16 : 1)
    * (boss ? 0.58 : compact ? 1.12 : 1);
  const recoil = Math.max(4, Math.min(16, Math.round(8.5 * force)));
  const highHit = contactY < -7;
  const lowHit = contactY > 8;
  const rotation = (highHit ? -2.55 : lowHit ? 1.35 : -1.7) * Math.min(1.35, force);

  return {
    recoilX: -recoil,
    // The foot plane remains planted. A one-pixel compression on low blows is
    // enough to sell weight without bringing back whole-enemy floating.
    recoilY: lowHit ? 1 : 0,
    recoilRotate: Number(rotation.toFixed(2)),
    reboundX: Math.max(1, Math.round(recoil * 0.24)),
    reboundRotate: Number((-rotation * 0.28).toFixed(2)),
    squashX: Number(Math.max(0.86, 0.96 - force * 0.035).toFixed(3)),
    squashY: Number(Math.min(1.08, 1.015 + force * 0.027).toFixed(3)),
    durationSeconds: finisher ? 0.34 : burst ? 0.165 : critical || spark ? 0.27 : 0.235,
    flashBrightness: Number(Math.min(2.45, 1.68 + force * 0.36).toFixed(2)),
  };
}
