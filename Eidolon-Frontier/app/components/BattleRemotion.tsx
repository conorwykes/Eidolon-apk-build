"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Player } from "@remotion/player";
import {
  ATTACK_IMPACT_DURATION,
  AttackImpactComposition,
  KaelFireBurstIntro,
  StageMotionComposition,
  type BattleStageId,
  type BurstUnitId,
} from "../../remotion/BattleVfx";
import { getBattlePlaybackRate } from "../../game/battle-timing";

// Remotion's <Player> renders a fixed compositionWidth/compositionHeight
// canvas and letterbox-fits it into whatever space it's actually given —
// any mismatch between that fixed aspect ratio and the real container
// leaves solid-colour bars in the gap. StageMotionComposition's own
// background <Img> already uses width/height 100% + objectFit:"cover"
// relative to the composition canvas, so matching the composition's
// dimensions to the container's real, live-measured size (instead of a
// hardcoded 430x355) makes the canvas equal the container exactly at any
// viewport/resolution — no gap is left to letterbox, and cover-cropping
// (not stretching) is what keeps the source art unblurred.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 430, height: 355 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      if (nextWidth > 0 && nextHeight > 0) {
        setSize((current) => (current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight }));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

export function AnimatedBattleStage({ stageId, stageSrc }: { stageId: BattleStageId; stageSrc: string }) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  return (
    <>
      <div ref={ref} className={`remotion-stage remotion-stage-${stageId}`} aria-hidden="true">
        <Player
          component={StageMotionComposition}
          durationInFrames={240}
          compositionWidth={size.width}
          compositionHeight={size.height}
          fps={30}
          inputProps={{ stageId, stageSrc }}
          autoPlay
          loop
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </>
  );
}

export function AttackImpactOverlay({
  instanceId,
  unitId,
  stars,
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
  stars: 2 | 3 | 4 | 5;
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
          stars,
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
  stars = 5,
}: {
  instanceId: string;
  burstName: string;
  keyArtSrc: string;
  speed: 1 | 2;
  unitId?: BurstUnitId;
  stars?: 2 | 3 | 4 | 5;
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
        inputProps={{ burstName, keyArtSrc, unitId, stars }}
        autoPlay
        playbackRate={getBattlePlaybackRate(speed)}
        acknowledgeRemotionLicense
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
