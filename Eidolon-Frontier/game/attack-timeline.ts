import type { BattleUnitId } from "./battle-choreography";
import type {
  AttackFx,
  AttackScope,
  AttackStage,
  BattleSpriteSet,
  NormalAttackBeat,
  SfxKind,
  StarTier,
  UnitCombatProfile,
} from "../app/page";

// A single global 10 ms gap made every authored chain read as the same
// machine-gun rattle. Cadence is characterisation: `tick` is the pause between
// beats inside one phrase, `phrase` the pause between authored phrases.
type NormalCadence = { tick: number; phrase: number };

const LYRA_STEP_SEQUENCES: Record<StarTier, readonly { frame: number; stage: AttackStage; hold: number }[]> = {
  2: [{ frame: 0, stage: "windup", hold: 48 }, { frame: 1, stage: "release", hold: 30 }],
  3: [{ frame: 0, stage: "windup", hold: 34 }, { frame: 1, stage: "release", hold: 24 }],
  4: [{ frame: 0, stage: "windup", hold: 24 }, { frame: 1, stage: "release", hold: 18 }],
  5: [{ frame: 0, stage: "windup", hold: 15 }, { frame: 1, stage: "release", hold: 11 }],
};

const DEFAULT_NORMAL_CADENCE: NormalCadence = { tick: 10, phrase: 140 };

const NORMAL_CADENCE: Partial<Record<BattleUnitId, NormalCadence>> = {
  zephyra: { tick: 10, phrase: 140 },
  solenne: { tick: 10, phrase: 140 },
  kael: { tick: 34, phrase: 150 },
  lyra: { tick: 26, phrase: 96 },
  brannock: { tick: 96, phrase: 190 },
  // Nyx's 5-star cadence read noticeably faster than every other unit's —
  // slowed toward Kael's pacing so hits have time to register.
  nyx: { tick: 24, phrase: 118 },
};

export function getNormalCadence(unitId: BattleUnitId, stars: StarTier): NormalCadence {
  if (unitId === "lyra") {
    // 5-star in particular read as a blur — slowed every tier down while
    // keeping the same escalating-speed shape across 2-5 star.
    return stars === 2
      ? { tick: 90, phrase: 180 }
      : stars === 3
        ? { tick: 62, phrase: 140 }
        : stars === 4
          ? { tick: 38, phrase: 108 }
          : { tick: 24, phrase: 92 };
  }
  const base = NORMAL_CADENCE[unitId] ?? DEFAULT_NORMAL_CADENCE;
  const pace = stars === 2 ? 1.24 : stars === 3 ? 1.08 : stars === 4 ? 0.94 : 0.8;
  return { tick: Math.round(base.tick * pace), phrase: Math.round(base.phrase * pace) };
}

export function getNormalCastSequence(unitId: BattleUnitId, stars: StarTier) {
  if (unitId === "lyra") return LYRA_STEP_SEQUENCES[stars];
  const hold = stars === 2 ? 72 : stars === 3 ? 58 : stars === 4 ? 46 : 36;
  return [
    { frame: 0, stage: "windup" as const, hold },
    { frame: 1, stage: "windup" as const, hold },
    { frame: 2, stage: "release" as const, hold: Math.max(24, hold - 12) },
  ];
}

// One owned attack lifecycle, built once as pure data (no live state, no
// RNG) and walked start-to-finish by a single generic player. Replaces the
// old approach of replaying wind-up logic per hit packet with scattered
// timers duplicated between JS waits and CSS durations.

export type FxPatch = Partial<Pick<AttackFx, "stage" | "frame" | "volley" | "phase">>;

export type PoseNode = { patch: FxPatch; holdMs: number; sfx?: SfxKind };

export type ImpactNode = {
  step: number;
  lands: boolean;
  hitMultiplier: number;
  isFinisherBeat: boolean;
  heartDropEligible: boolean;
  attackFrame: number;
  hitNumber: number;
  nonLandingHoldMs: number;
  strikeHoldMs: number;
  hitstopHoldMs: number;
  recoverHoldMs: number;
  extraHoldMs: number;
  cadenceHoldMs: number;
  beatWeight: number;
};

export type TimelineBeat = { step: number; poses: PoseNode[]; impact: ImpactNode };

export type ActionTimeline = {
  attackId: string;
  unitId: BattleUnitId;
  burst: boolean;
  supportBurst: boolean;
  resolvesSpark: boolean;
  attackScope: AttackScope;
  lockedTargetIds: string[];
  hits: number;
  totalBase: number;
  gaugeGainPerHit: number;
  numeralLifeMs: number;
  crystalLifeMs: number;
  healRatio: number;
  cleanse: boolean;
  burstBuff: string;
  attackName: string;
  burstName: string;
  burstAilment: string;
  sparkAilment: string;
  critAilment: string;
  launchSfx: SfxKind;
  launchMessageWithFocus: string;
  launchMessageWithoutFocus: string;
  completeMessage: string;
  initialFx: Pick<AttackFx, "targetEnemyId" | "phase" | "frame" | "hits" | "label" | "contactX" | "contactY" | "scope">;
  approach: PoseNode[];
  beats: TimelineBeat[];
  burstRecovery: PoseNode[];
  returnNode: PoseNode;
};

function buildBeatPoses(args: {
  unitId: BattleUnitId;
  stars: StarTier;
  burst: boolean;
  battleSprites: BattleSpriteSet;
  normalAttackChain: readonly NormalAttackBeat[];
  step: number;
  hits: number;
}): { poses: PoseNode[]; attackFrame: number; beatWeight: number; cadenceHoldMs: number } {
  const { unitId, stars, burst, battleSprites, normalAttackChain, step, hits } = args;
  const normalBeat = normalAttackChain[Math.min(step, normalAttackChain.length - 1)];
  const previousNormalBeat = step > 0 ? normalAttackChain[Math.min(step - 1, normalAttackChain.length - 1)] : null;
  const nextNormalBeat = step < hits - 1 ? normalAttackChain[Math.min(step + 1, normalAttackChain.length - 1)] : null;
  const startsNormalPose = !burst && (!previousNormalBeat || previousNormalBeat.pose !== normalBeat.pose);
  const endsNormalPose = !burst && (!nextNormalBeat || nextNormalBeat.pose !== normalBeat.pose);

  // A Burst owns a complete rarity-scaled timeline instead of using four
  // attack-like drawings as a hit counter. The opening anticipation frames
  // play before the first damage packet, the middle action frames advance
  // across every hit, and the final anchored recovery plays after the last
  // packet.
  const burstOpeningFrames = Math.max(1, Math.round(battleSprites.burst.length * 0.18));
  const burstRecoveryFrames = Math.max(2, Math.round(battleSprites.burst.length * 0.18));
  const burstActionStart = burstOpeningFrames;
  const burstActionEnd = Math.max(burstActionStart, battleSprites.burst.length - burstRecoveryFrames - 1);
  const burstActionSpan = Math.max(1, burstActionEnd - burstActionStart + 1);
  const previousBurstFrame = step > 0
    ? Math.min(
        burstActionEnd,
        burstActionStart + Math.floor((step - 1) * Math.max(1, burstActionEnd - burstActionStart) / Math.max(1, hits - 1)),
      )
    : burstActionStart - 1;
  const attackFrame = burst
    ? Math.min(
        burstActionEnd,
        burstActionStart + Math.floor(step * Math.max(1, burstActionEnd - burstActionStart) / Math.max(1, hits - 1)),
      )
    : normalBeat.frame;

  // Every authored unit opens each damage packet with its own drawn
  // wind-up. One table drives all of them.
  const castSequence = !burst && startsNormalPose ? getNormalCastSequence(unitId, stars) : undefined;

  const poses: PoseNode[] = [];

  if (burst && step === 0) {
    for (const frame of Array.from({ length: burstOpeningFrames }, (_, index) => index)) {
      poses.push({ patch: { frame, volley: 0, stage: frame === 0 ? "windup" : "release" }, holdMs: frame === 0 ? 88 : 64 });
    }
  }

  if (burst) {
    // When a form owns more drawings than damage packets, show every
    // intermediate action pose before the next packet rather than skipping
    // directly to the contact drawing.
    const burstActionFrameStart = Math.max(burstActionStart, previousBurstFrame + 1);
    for (const frame of Array.from({ length: Math.max(0, attackFrame - burstActionFrameStart) }, (_, index) => burstActionFrameStart + index)) {
      poses.push({
        patch: { frame, volley: step, stage: frame < burstActionStart + burstActionSpan / 2 ? "release" : "flight" },
        holdMs: 46,
      });
    }
  }

  if (castSequence) {
    for (const drawing of castSequence) {
      poses.push({ patch: { frame: drawing.frame, volley: normalBeat.pose, stage: drawing.stage }, holdMs: drawing.hold });
    }
    // The wind-up owns the frames leading up to contact; the beat itself owns
    // the frame that connects. Ranged draws already end on their contact
    // frame, so this only moves the melee phrases into place.
    if (castSequence[castSequence.length - 1]?.frame !== attackFrame) {
      poses.push({ patch: { frame: attackFrame, volley: normalBeat.pose, stage: "impact" }, holdMs: 12 });
    }
  } else {
    poses.push({
      patch: { frame: attackFrame, volley: burst ? step : normalBeat.pose, stage: startsNormalPose || burst ? "windup" : "impact" },
      holdMs: burst ? 55 : startsNormalPose ? 42 : 10,
    });
  }

  // The reference project's authored attack clips hold their opening
  // anticipation frame and closing impact frame for two to three times as
  // long as the brief transition frames between them, rather than an even
  // beat-to-beat cadence throughout. Only the very first hit (anticipation)
  // and the finisher (impact) of a rapid normal chain get the extra hold —
  // the middle of a long combo stays snappy.
  const isAnticipationBeat = !burst && step === 0;
  const isImpactBeat = !burst && step === hits - 1;
  const holdWeight = isAnticipationBeat || isImpactBeat ? 1.7 : 1;
  const cadenceBase = burst
    ? 30
    : endsNormalPose && step < hits - 1
      ? getNormalCadence(unitId, stars).phrase
      : getNormalCadence(unitId, stars).tick;

  const beatWeight = burst ? 1 : Math.min(2.2, normalBeat.multiplier * normalAttackChain.length);

  return { poses, attackFrame, beatWeight, cadenceHoldMs: cadenceBase * holdWeight };
}

function buildBurstRecoveryNodes(battleSprites: BattleSpriteSet): PoseNode[] {
  const recoveryStart = Math.max(0, battleSprites.burst.length - Math.max(2, Math.round(battleSprites.burst.length * 0.18)));
  return Array.from({ length: Math.max(0, battleSprites.burst.length - recoveryStart) }, (_, index) => {
    const frame = recoveryStart + index;
    const isLast = frame === battleSprites.burst.length - 1;
    return { patch: { frame, stage: (isLast ? "anchored" : "recover") as AttackStage }, holdMs: isLast ? 120 : 54 };
  });
}

export function buildActionTimeline(args: {
  unitId: BattleUnitId;
  unitName: string;
  stars: StarTier;
  burst: boolean;
  attackId: string;
  combatProfile: UnitCombatProfile;
  battleSprites: BattleSpriteSet;
  normalAttackChain: readonly NormalAttackBeat[];
  attackScope: AttackScope;
  lockedTargetIds: string[];
  attackPower: number;
  burstLevelBonus: number;
  contactAnchor: { x: number; y: number };
}): ActionTimeline {
  const {
    unitId, unitName, stars, burst, attackId, combatProfile, battleSprites,
    normalAttackChain, attackScope, lockedTargetIds, attackPower, burstLevelBonus, contactAnchor,
  } = args;

  const hits = burst ? combatProfile.burstHits : normalAttackChain.length;
  const supportBurst = burst && !combatProfile.burstDoesDamage;
  const isZephyraBurstVolley = burst && unitId === "zephyra";
  const totalBase = attackPower * (burst ? combatProfile.burstMultiplier + burstLevelBonus : combatProfile.attackMultiplier);

  const beats: TimelineBeat[] = Array.from({ length: hits }, (_, step) => {
    const { poses, attackFrame, beatWeight, cadenceHoldMs } = buildBeatPoses({
      unitId, stars, burst, battleSprites, normalAttackChain, step, hits,
    });
    const lands = !isZephyraBurstVolley || step === hits - 1;
    const normalBeat = normalAttackChain[Math.min(step, normalAttackChain.length - 1)];
    const impact: ImpactNode = {
      step,
      lands,
      hitMultiplier: burst ? (isZephyraBurstVolley ? 1 : 1 / hits) : normalBeat.multiplier,
      isFinisherBeat: burst && step === hits - 1,
      heartDropEligible: step % 4 === 3,
      attackFrame,
      hitNumber: burst ? step + 1 : attackFrame + 1,
      nonLandingHoldMs: burst ? 18 : 12,
      strikeHoldMs: burst ? 18 : 12,
      hitstopHoldMs: burst ? 48 : 26,
      recoverHoldMs: burst ? 32 : 16,
      extraHoldMs: 34,
      cadenceHoldMs,
      beatWeight,
    };
    return { step, poses, impact };
  });

  const approach: PoseNode[] = burst
    ? [
        // Keep the named character intro, then hand straight to the authored
        // sprite anticipation.
        { patch: {}, holdMs: 760 },
        { patch: { phase: "burst", stage: "approach" }, holdMs: 90, sfx: "burst" },
      ]
    : [
        // Matches the approach-stage CSS animation duration (globals.css,
        // attack-stage-approach) so the JS phase change and the visible
        // travel finish together instead of one cutting the other off.
        { patch: {}, holdMs: 320 },
      ];

  const launchMessageWithFocus = burst
    ? `${combatProfile.burstName}!${combatProfile.burstDoesDamage ? (attackScope === "all" ? " All enemies caught in range." : " Focus locked.") : " Restorative light spreads across the squad."}`
    : unitId === "solenne"
      ? `${unitName} invokes judgement above the focused target.`
      : unitId === "zephyra"
        ? `${unitName} draws on the focused target.`
        : `${unitName} rushes the focused target.`;
  const launchMessageWithoutFocus = burst
    ? `${combatProfile.burstName}!${combatProfile.burstDoesDamage ? (attackScope === "all" ? " All enemies caught in range." : " Upper-foe priority.") : " Restorative light spreads across the squad."}`
    : unitId === "solenne"
      ? `${unitName} invokes judgement above the upper-priority target.`
      : unitId === "zephyra"
        ? `${unitName} draws on the upper-priority target.`
        : `${unitName} rushes the upper-priority target.`;

  return {
    attackId,
    unitId,
    burst,
    supportBurst,
    resolvesSpark: !supportBurst,
    attackScope,
    lockedTargetIds,
    hits,
    totalBase,
    gaugeGainPerHit: Math.ceil(combatProfile.gaugeGain / hits),
    numeralLifeMs: !burst ? (normalAttackChain.length <= 4 ? 470 : normalAttackChain.length >= 8 ? 300 : 380) : 450,
    crystalLifeMs: 500,
    healRatio: combatProfile.healRatio,
    cleanse: combatProfile.cleanse,
    burstBuff: combatProfile.burstBuff,
    attackName: combatProfile.attackName,
    burstName: combatProfile.burstName,
    burstAilment: unitId === "kael" ? "Burn" : "",
    sparkAilment: unitId === "zephyra" ? "Shock" : "",
    critAilment: unitId === "nyx" ? "Def Down" : "",
    launchSfx: burst ? "burst" : "tap",
    launchMessageWithFocus,
    launchMessageWithoutFocus,
    completeMessage: `${unitName} completes ${burst ? combatProfile.burstName : combatProfile.attackName}. Tap another unit—overlap attacks to Spark.`,
    initialFx: {
      targetEnemyId: lockedTargetIds[0] ?? "",
      phase: burst ? "burst-intro" : "attack",
      frame: burst || unitId === "zephyra" || unitId === "solenne" ? 0 : normalAttackChain[0]?.frame ?? 0,
      hits,
      label: burst ? combatProfile.burstName : combatProfile.attackName,
      contactX: contactAnchor.x,
      contactY: contactAnchor.y,
      scope: attackScope,
    },
    approach,
    beats,
    burstRecovery: burst ? buildBurstRecoveryNodes(battleSprites) : [],
    returnNode: {
      // Equal weight to the approach travel (see attack-stage-return in
      // globals.css) — going to the target and coming back read as the same
      // deliberate motion instead of a slow approach and a rushed snap home.
      patch: { stage: "return" },
      holdMs: 320,
    },
  };
}
