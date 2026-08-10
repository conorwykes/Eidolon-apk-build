"use client";

/* eslint-disable @next/next/no-img-element */

import { Player } from "@remotion/player";
import {
  ATTACK_IMPACT_DURATION,
  AttackImpactComposition,
  BurstVfxComposition,
  KaelFireBurstIntro,
  RPG_BURST_ASSET_SOURCES,
  StageMotionComposition,
  getBurstDurationInFrames,
  type BattleStageId,
  type BurstUnitId,
} from "../../remotion/BattleVfx";
import { getBattlePlaybackRate } from "../../game/battle-timing";

export function AnimatedBattleStage({ stageId, stageSrc }: { stageId: BattleStageId; stageSrc: string }) {
  return (
    <>
      <div className={`remotion-stage remotion-stage-${stageId}`} aria-hidden="true">
        <Player
          component={StageMotionComposition}
          durationInFrames={240}
          compositionWidth={430}
          compositionHeight={355}
          fps={30}
          inputProps={{ stageId, stageSrc }}
          autoPlay
          loop
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <span className="rpg-burst-preloader" aria-hidden="true">
        {RPG_BURST_ASSET_SOURCES.map((src) => <img key={src} src={src} alt="" />)}
      </span>
    </>
  );
}

export function BurstRemotionOverlay({
  instanceId,
  unitId,
  hitCount,
  speed,
  targetLeft,
  targetBottom,
  reducedEffects = false,
}: {
  instanceId: string;
  unitId: string;
  hitCount: number;
  speed: 1 | 2;
  targetLeft: number;
  targetBottom: number;
  reducedEffects?: boolean;
}) {
  return (
    <div className="remotion-burst" data-burst-instance={instanceId} aria-hidden="true">
      <Player
        key={instanceId}
        component={BurstVfxComposition}
        durationInFrames={getBurstDurationInFrames(hitCount)}
        compositionWidth={430}
        compositionHeight={355}
        fps={30}
        inputProps={{ unitId: unitId as BurstUnitId, hitCount, targetLeft, targetBottom, reducedEffects }}
        autoPlay
        playbackRate={getBattlePlaybackRate(speed)}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      />
    </div>
  );
}

export function AttackImpactOverlay({
  instanceId,
  unitId,
  speed,
  targetLeft,
  targetBottom,
  hitIndex,
  critical,
  spark,
  reducedEffects = false,
}: {
  instanceId: string;
  unitId: string;
  speed: 1 | 2;
  targetLeft: number;
  targetBottom: number;
  hitIndex: number;
  critical: boolean;
  spark: boolean;
  reducedEffects?: boolean;
}) {
  return (
    <div className="remotion-attack" data-attack-instance={instanceId} aria-hidden="true">
      <Player
        key={instanceId}
        component={AttackImpactComposition}
        durationInFrames={ATTACK_IMPACT_DURATION}
        compositionWidth={430}
        compositionHeight={355}
        fps={30}
        inputProps={{
          unitId: unitId as BurstUnitId,
          targetLeft,
          targetBottom,
          hitIndex,
          critical,
          spark,
          reducedEffects,
        }}
        autoPlay
        playbackRate={getBattlePlaybackRate(speed)}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      />
    </div>
  );
}

export function BurstIntroOverlay({
  instanceId,
  burstName,
  keyArtSrc,
  speed,
  unitId = "kael",
}: {
  instanceId: string;
  burstName: string;
  keyArtSrc: string;
  speed: 1 | 2;
  unitId?: BurstUnitId;
}) {
  return (
    <div className={`kael-remotion-intro burst-intro-${unitId}`} data-burst-instance={instanceId} aria-hidden="true">
      <Player
        key={instanceId}
        component={KaelFireBurstIntro}
        durationInFrames={46}
        compositionWidth={430}
        compositionHeight={760}
        fps={30}
        inputProps={{ burstName, keyArtSrc, unitId }}
        autoPlay
        playbackRate={getBattlePlaybackRate(speed)}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

/** Retained alias: this overlay is no longer Kael-specific. */
export const KaelBurstIntroOverlay = BurstIntroOverlay;
