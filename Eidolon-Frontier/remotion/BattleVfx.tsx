import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { getWeaponContactPoint } from "../game/battle-choreography";

export type BurstUnitId = "kael" | "lyra" | "brannock" | "zephyra" | "solenne" | "nyx";
export type BattleStageId = "field" | "emberwood" | "causeway" | "citadel" | "reliquary";

type BurstVfxProps = {
  unitId: BurstUnitId;
  stars?: 2 | 3 | 4 | 5;
  hitCount: number;
  targetLeft?: number;
  targetBottom?: number;
  /** Mirrors the player's existing "Reduced effects" setting. Scales particle
   * counts and drops the most expensive optional layers rather than turning
   * any element's identity off outright. */
  reducedEffects?: boolean;
};

type AttackImpactProps = {
  unitId: BurstUnitId;
  stars?: 2 | 3 | 4 | 5;
  targetLeft?: number;
  targetBottom?: number;
  hitIndex?: number;
  critical?: boolean;
  spark?: boolean;
  reducedEffects?: boolean;
};

type KaelFireBurstIntroProps = {
  burstName: string;
  keyArtSrc: string;
  /** Defaults to kael so the original Kael-only composition is unchanged. */
  unitId?: BurstUnitId;
  stars?: 2 | 3 | 4 | 5;
};

type StageMotionProps = {
  stageId: BattleStageId;
  stageSrc: string;
};

const BURST_STYLE: Record<BurstUnitId, {
  primary: string;
  secondary: string;
  deep: string;
  impact: "flame" | "tide" | "earth" | "lightning" | "radiance" | "void";
  angle: number;
}> = {
  kael: { primary: "#ff4c1f", secondary: "#ffd65a", deep: "#530705", impact: "flame", angle: -34 },
  lyra: { primary: "#35c7ff", secondary: "#c7f9ff", deep: "#03265f", impact: "tide", angle: 18 },
  brannock: { primary: "#77d35d", secondary: "#e5bd60", deep: "#193a19", impact: "earth", angle: -8 },
  zephyra: { primary: "#ffe54d", secondary: "#75eaff", deep: "#242052", impact: "lightning", angle: -56 },
  solenne: { primary: "#fff0a0", secondary: "#ffffff", deep: "#493815", impact: "radiance", angle: 0 },
  nyx: { primary: "#a44cff", secondary: "#ff76eb", deep: "#19042e", impact: "void", angle: 42 },
};

// The full-screen burst cut-in was previously fire-only, so Kael got a staged
// awakening sequence and the other five units fell back to a flat CSS banner.
// The composition is now palette-driven: same authored timing and layout, six
// elemental readings. `dim` is the screen wash, `deep`→`bright` runs the banner
// gradient from its darkest edge to its hottest highlight.
const BURST_INTRO_STYLE: Record<BurstUnitId, {
  dim: string;
  deep: string;
  core: string;
  mid: string;
  glow: string;
  bright: string;
  label: string;
}> = {
  kael: { dim: "#020000", deep: "#5b0906", core: "#c9290f", mid: "#ff781f", glow: "#ffd557", bright: "#fff7c9", label: "FIRE UNIT AWAKENING" },
  lyra: { dim: "#000610", deep: "#03265f", core: "#0d6fc4", mid: "#35c7ff", glow: "#8fe8ff", bright: "#e8fdff", label: "TIDE UNIT AWAKENING" },
  brannock: { dim: "#030a03", deep: "#193a19", core: "#3f7f2c", mid: "#77d35d", glow: "#d8b85a", bright: "#f4ffd9", label: "GROVE UNIT AWAKENING" },
  zephyra: { dim: "#04030f", deep: "#242052", core: "#4b46c9", mid: "#75eaff", glow: "#ffe54d", bright: "#fdffe0", label: "STORM UNIT AWAKENING" },
  solenne: { dim: "#0a0803", deep: "#493815", core: "#b58a24", mid: "#ffd964", glow: "#fff0a0", bright: "#ffffff", label: "RADIANCE UNIT AWAKENING" },
  nyx: { dim: "#060010", deep: "#19042e", core: "#6d1fb8", mid: "#a44cff", glow: "#ff76eb", bright: "#ffe4fb", label: "VEIL UNIT AWAKENING" },
};

const STAGE_STYLE: Record<BattleStageId, { glow: string; haze: string; mote: string }> = {
  field: { glow: "#ffe79a", haze: "#70a96f", mote: "#fff6bd" },
  emberwood: { glow: "#e96f36", haze: "#5b170d", mote: "#ffc461" },
  causeway: { glow: "#58d8d5", haze: "#123a4b", mote: "#a8ffff" },
  citadel: { glow: "#b694ff", haze: "#251b46", mote: "#dfcaff" },
  reliquary: { glow: "#4aa8e7", haze: "#092842", mote: "#a8e8ff" },
};

export const getBurstDurationInFrames = (hitCount: number) => 28 + hitCount * 11;
export const ATTACK_IMPACT_DURATION = 16;
const RPG_EFFECT_CELL = 80;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

type RpgEffectStrip = {
  src: string;
  frames: number;
  scale: number;
  filter: string;
};

type RpgBurstPreset = {
  charge: RpgEffectStrip;
  impact: RpgEffectStrip;
  finisher: RpgEffectStrip;
  chargeAnchor: "caster" | "target";
  finisherAnchor: "caster" | "target";
};

// Every strip below is a single elemental row cropped from the user-supplied
// RPG Effect All Free sheets. Remotion advances the source frame explicitly,
// so no GIF/CSS loop can drift away from the combat hit cadence.
const RPG_BURST_PRESETS: Record<BurstUnitId, RpgBurstPreset> = {
  kael: {
    charge: { src: "/effects/rpg-bursts/kael-flame-lance.webp", frames: 10, scale: 2.8, filter: "saturate(1.22) brightness(1.18) drop-shadow(0 0 8px #ff401f) drop-shadow(0 0 16px #ffb02e)" },
    impact: { src: "/effects/rpg-bursts/kael-cinder-hit.webp", frames: 8, scale: 3.35, filter: "saturate(1.3) brightness(1.22) drop-shadow(0 0 9px #ff381c) drop-shadow(0 0 18px #ffc03c)" },
    finisher: { src: "/effects/rpg-bursts/kael-solar-bloom.webp", frames: 8, scale: 4.7, filter: "saturate(1.2) brightness(1.15) drop-shadow(0 0 13px #ff3d18) drop-shadow(0 0 27px #ffc840)" },
    chargeAnchor: "caster",
    finisherAnchor: "target",
  },
  lyra: {
    charge: { src: "/effects/rpg-bursts/lyra-moon-orb.webp", frames: 14, scale: 3.1, filter: "saturate(1.2) brightness(1.18) drop-shadow(0 0 10px #2fcaff) drop-shadow(0 0 19px #baf8ff)" },
    impact: { src: "/effects/rpg-bursts/lyra-current-ring.webp", frames: 10, scale: 3.65, filter: "saturate(1.18) brightness(1.2) drop-shadow(0 0 10px #31c9ff) drop-shadow(0 0 21px #a6f4ff)" },
    finisher: { src: "/effects/rpg-bursts/lyra-vortex.webp", frames: 10, scale: 5.05, filter: "saturate(1.2) brightness(1.16) drop-shadow(0 0 13px #22bfff) drop-shadow(0 0 27px #c9fbff)" },
    chargeAnchor: "target",
    finisherAnchor: "target",
  },
  brannock: {
    charge: { src: "/effects/rpg-bursts/brannock-stone-rise.webp", frames: 13, scale: 3.25, filter: "saturate(1.12) brightness(1.06) drop-shadow(0 4px 4px #201509) drop-shadow(0 0 11px #d3a34a)" },
    impact: { src: "/effects/rpg-bursts/brannock-root-bloom.webp", frames: 13, scale: 3.55, filter: "saturate(1.18) brightness(1.08) drop-shadow(0 0 9px #5fcf4c) drop-shadow(0 0 17px #d8b85a)" },
    finisher: { src: "/effects/rpg-bursts/brannock-dust-crown.webp", frames: 14, scale: 5.1, filter: "saturate(1.08) brightness(1.08) drop-shadow(0 5px 6px #201409) drop-shadow(0 0 20px #cf9e46)" },
    chargeAnchor: "target",
    finisherAnchor: "target",
  },
  zephyra: {
    charge: { src: "/effects/rpg-bursts/zephyra-arc.webp", frames: 12, scale: 4.15, filter: "sepia(.34) saturate(3.1) hue-rotate(352deg) brightness(1.55) drop-shadow(0 0 8px #ffe64b) drop-shadow(0 0 17px #67eaff)" },
    impact: { src: "/effects/rpg-bursts/zephyra-bolt.webp", frames: 10, scale: 4.05, filter: "sepia(.28) saturate(3.5) hue-rotate(351deg) brightness(1.68) drop-shadow(0 0 8px #fff26b) drop-shadow(0 0 19px #58dcff)" },
    finisher: { src: "/effects/rpg-bursts/zephyra-star.webp", frames: 14, scale: 5.35, filter: "sepia(.24) saturate(3.2) hue-rotate(350deg) brightness(1.72) drop-shadow(0 0 11px #fff36a) drop-shadow(0 0 28px #63e3ff)" },
    chargeAnchor: "target",
    finisherAnchor: "target",
  },
  solenne: {
    charge: { src: "/effects/rpg-bursts/solenne-halo.webp", frames: 7, scale: 4.25, filter: "sepia(.18) saturate(2) brightness(1.55) drop-shadow(0 0 10px #fff4a5) drop-shadow(0 0 22px #ffffff)" },
    impact: { src: "/effects/rpg-bursts/solenne-star.webp", frames: 14, scale: 3.4, filter: "sepia(.16) saturate(2.1) brightness(1.7) drop-shadow(0 0 9px #fff1a1) drop-shadow(0 0 20px #ffffff)" },
    finisher: { src: "/effects/rpg-bursts/solenne-aurora.webp", frames: 14, scale: 5.2, filter: "sepia(.15) saturate(1.9) brightness(1.62) drop-shadow(0 0 13px #fff0a0) drop-shadow(0 0 29px #ffffff)" },
    chargeAnchor: "caster",
    finisherAnchor: "caster",
  },
  nyx: {
    charge: { src: "/effects/rpg-bursts/nyx-rift-ring.webp", frames: 15, scale: 4.2, filter: "saturate(1.62) brightness(1.25) drop-shadow(0 0 10px #7b2fff) drop-shadow(0 0 22px #e34dff)" },
    impact: { src: "/effects/rpg-bursts/nyx-chaos-arc.webp", frames: 14, scale: 3.75, filter: "saturate(1.7) brightness(1.28) drop-shadow(0 0 9px #7a2dff) drop-shadow(0 0 19px #ff5fe7)" },
    finisher: { src: "/effects/rpg-bursts/nyx-void-smoke.webp", frames: 15, scale: 5.45, filter: "saturate(1.55) brightness(1.16) drop-shadow(0 0 13px #6827e8) drop-shadow(0 0 29px #ed57ff)" },
    chargeAnchor: "target",
    finisherAnchor: "target",
  },
};

export const RPG_BURST_ASSET_SOURCES = Object.values(RPG_BURST_PRESETS).flatMap((preset) => [
  preset.charge.src,
  preset.impact.src,
  preset.finisher.src,
]);

const spriteFrame = (progress: number, frames: number) => Math.min(frames - 1, Math.max(0, Math.floor(clamp(progress) * frames)));

function RpgSpriteStrip({
  name,
  strip,
  progress,
  left,
  top,
  opacity,
  scale = 1,
  rotate = 0,
  flipX = false,
  blur = 0,
  zIndex = 1,
}: {
  name: string;
  strip: RpgEffectStrip;
  progress: number;
  left: number;
  top: number;
  opacity: number;
  scale?: number;
  rotate?: number;
  flipX?: boolean;
  blur?: number;
  zIndex?: number;
}) {
  const currentSpriteFrame = spriteFrame(progress, strip.frames);

  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        zIndex,
        left,
        top,
        width: RPG_EFFECT_CELL,
        height: RPG_EFFECT_CELL,
        marginLeft: -RPG_EFFECT_CELL / 2,
        marginTop: -RPG_EFFECT_CELL / 2,
        overflow: "visible",
        opacity: clamp(opacity),
        scale: `${(flipX ? -1 : 1) * strip.scale * scale} ${strip.scale * scale}`,
        rotate: `${rotate}deg`,
        transformOrigin: "50% 50%",
        mixBlendMode: "screen",
        filter: `${strip.filter}${blur ? ` blur(${blur}px)` : ""}`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {/* Native img keeps the supplied sprite strips reliable in the in-game Player. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={strip.src}
          decoding="sync"
          draggable={false}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: strip.frames * RPG_EFFECT_CELL,
            height: RPG_EFFECT_CELL,
            maxWidth: "none",
            translate: `${-currentSpriteFrame * RPG_EFFECT_CELL}px 0px`,
            imageRendering: "auto",
            userSelect: "none",
          }}
        />
      </div>
    </Interactive.Div>
  );
}

/**
 * Kael's one-shot Cinderfall cut-in. This adapts the supplied FireBraveBurst
 * concept to the game's transparent battle layer: every movement is driven by
 * the Remotion frame, the battlefield remains visible beneath the dim, and the
 * flames rise once instead of looping independently in CSS.
 */
export function KaelFireBurstIntro({ burstName, keyArtSrc, unitId = "kael", stars = 5 }: KaelFireBurstIntroProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = BURST_INTRO_STYLE[unitId] ?? BURST_INTRO_STYLE.kael;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "transparent", pointerEvents: "none" }}>
      <Interactive.Div
        name="Battlefield dim"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `${p.dim}`,
          opacity: interpolate(frame, [0, 7, durationInFrames - 11, durationInFrames - 1], [0, 0.58, 0.58, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
          }),
        }}
      />

      <Interactive.Div
        name="Ignition flash"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 28% 52%, ${p.bright} 0 2%, ${p.mid}aa 9%, ${p.core}38 31%, transparent 66%)`,
          opacity: interpolate(frame, [0, 3, 9], [0, 0.92, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0, 9], [0.35, 1.42], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.86, 0.22, 1),
            output: "perceptual-scale",
          }),
          mixBlendMode: "screen",
        }}
      />

      <Interactive.Div
        name="Cinderfall banner"
        style={{
          position: "absolute",
          left: "-8%",
          top: "33%",
          width: "116%",
          height: "29%",
          overflow: "hidden",
          clipPath: "polygon(0 12%,94% 0,100% 82%,5% 100%)",
          background: `linear-gradient(102deg, ${p.deep} 0%, ${p.core} 28%, ${p.mid} 63%, ${p.glow} 100%)`,
          borderTop: `3px solid ${p.bright}`,
          borderBottom: `3px solid ${p.glow}`,
          boxShadow: `0 0 34px ${p.core}99, 0 18px 35px #000b, inset 0 1px ${p.bright}`,
          opacity: interpolate(frame, [4, 8, durationInFrames - 9, durationInFrames - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: [Easing.linear, Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
          }),
          translate: interpolate(
            frame,
            [0, 6, 20, durationInFrames - 12, durationInFrames - 1],
            ["-510px 0px", "-510px 0px", "-9px 0px", "6px 0px", "520px 0px"],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [Easing.linear, Easing.spring({ damping: 13, mass: 0.55, stiffness: 112 }), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
            }
          ),
          rotate: "-1.5deg",
        }}
      >
        {/* A native img avoids Remotion's decoder rejecting these runtime-served game assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={keyArtSrc}
          decoding="sync"
          draggable={false}
          style={{
            position: "absolute",
            zIndex: 2,
            left: "-4%",
            bottom: "-8%",
            width: "72%",
            height: "126%",
            objectFit: "cover",
            objectPosition: "50% 16%",
            opacity: interpolate(frame, [7, 16, durationInFrames - 10, durationInFrames - 2], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
            }),
            translate: interpolate(frame, [6, 18], ["-46px 18px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 16, mass: 0.62, stiffness: 118 }),
            }),
            scale: interpolate(frame, [6, 20], [0.92, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 17, mass: 0.65, stiffness: 108 }),
              output: "perceptual-scale",
            }),
            filter: `saturate(1.08) contrast(1.08) drop-shadow(10px 7px 9px ${p.dim}) drop-shadow(0 0 13px ${p.glow})`,
            maskImage: "linear-gradient(90deg,#000 0 72%,transparent 96%)",
          }}
        />

        <Interactive.Div
          name="Burst title"
          style={{
            position: "absolute",
            zIndex: 4,
            right: "7%",
            top: "23%",
            width: "56%",
            textAlign: "right",
            color: "white",
            textShadow: `0 3px 6px ${p.dim}, 0 0 13px ${p.mid}`,
            opacity: interpolate(frame, [13, 20, durationInFrames - 9, durationInFrames - 2], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
            }),
            translate: interpolate(frame, [12, 22], ["38px 0px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 18, mass: 0.58, stiffness: 120 }),
            }),
          }}
        >
          <div style={{ color: `${p.bright}`, fontFamily: "Cinzel, Georgia, serif", fontSize: 13, fontWeight: 900, letterSpacing: "0.2em" }}>
            {stars}★ · {p.label}
          </div>
          <div style={{ marginTop: 8, color: "#ffffff", fontFamily: "Cinzel, Georgia, serif", fontSize: 39, fontWeight: 900, fontStyle: "italic", letterSpacing: "0.02em", lineHeight: 0.92 }}>
            {burstName}
          </div>
          <div style={{ marginTop: 10, color: `${p.glow}`, fontFamily: "Cinzel, Georgia, serif", fontSize: 15, fontWeight: 900, letterSpacing: "0.18em" }}>
            AETHER BURST!
          </div>
        </Interactive.Div>
      </Interactive.Div>

      <AbsoluteFill style={{ zIndex: 6, overflow: "hidden", mixBlendMode: "screen" }}>
        {Array.from({ length: 10 }, (_, index) => {
          const delay = index % 4 + Math.floor(index / 4);
          const start = 10 + delay;
          const peak = 19 + delay;
          const finish = durationInFrames - 1;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${-3 + index * 11.6}%`,
                bottom: -24,
                width: `${16 + (index % 3) * 4}%`,
                height: `${34 + (index % 4) * 7}%`,
                transformOrigin: "50% 100%",
                clipPath: index % 2 === 0
                  ? "polygon(49% 0,67% 26%,92% 42%,72% 59%,100% 100%,0 100%,24% 59%,8% 42%,34% 29%)"
                  : "polygon(53% 0,78% 36%,66% 49%,94% 66%,100% 100%,0 100%,13% 65%,37% 47%,27% 31%)",
                background: index % 3 === 0
                  ? `linear-gradient(90deg,${p.deep},${p.core} 48%,${p.glow})`
                  : `linear-gradient(90deg,${p.core},${p.mid} 54%,${p.bright})`,
                opacity: interpolate(frame, [start, peak, durationInFrames - 9, finish], [0, 0.94, 0.78, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
                }),
                scale: interpolate(frame, [start, peak, finish], ["0.72 0.08", "1 1.04", "0.82 0.7"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: [Easing.spring({ damping: 12, mass: 0.5, stiffness: 125 }), Easing.bezier(0.4, 0, 0.8, 1)],
                }),
                translate: interpolate(frame, [start, peak, finish], ["0px 70px", "0px 0px", `${index % 2 === 0 ? -18 : 18}px -38px`], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.bezier(0.4, 0, 0.8, 1)],
                }),
                rotate: `${-10 + (index % 5) * 5}deg`,
                filter: `drop-shadow(0 0 17px ${p.core}) brightness(1.18)`,
              }}
            />
          );
        })}

        {Array.from({ length: 22 }, (_, index) => {
          const start = 6 + index % 8;
          const end = durationInFrames - 2;
          return (
            <div
              key={`ember-${index}`}
              style={{
                position: "absolute",
                left: `${(index * 37) % 104 - 2}%`,
                bottom: `${3 + (index % 5) * 3}%`,
                width: 2 + index % 4,
                height: 7 + index % 8,
                borderRadius: "50% 50% 36% 64%",
                background: index % 4 === 0 ? `${p.bright}` : index % 2 === 0 ? `${p.mid}` : `${p.core}`,
                boxShadow: `0 0 9px ${p.core}`,
                opacity: interpolate(frame, [start, start + 5, end], [0, 0.9, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.bezier(0.4, 0, 0.8, 1)],
                }),
                translate: interpolate(frame, [start, end], ["0px 24px", `${index % 2 === 0 ? -28 : 28}px -${170 + (index % 6) * 34}px`], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 0.72, 0.32, 1),
                }),
                rotate: interpolate(frame, [start, end], ["0deg", `${90 + index * 21}deg`], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />
          );
        })}
      </AbsoluteFill>

      <Interactive.Div
        name="Final fire wipe"
        style={{
          position: "absolute",
          zIndex: 8,
          inset: 0,
          background: `linear-gradient(92deg,transparent 0 22%,${p.core}78 47%,${p.bright}c9 51%,${p.core}6b 56%,transparent 80%)`,
          opacity: interpolate(frame, [durationInFrames - 8, durationInFrames - 4, durationInFrames - 1], [0, 0.82, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [durationInFrames - 8, durationInFrames - 1], ["-360px 0px", "380px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.84, 0.44, 1),
          }),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
}

/* ==========================================================================
   Procedural elemental burst layer
   --------------------------------------------------------------------------
   The sprite-strip presets give each element its colour and its stock shape,
   but all six shared the same particle behaviour, so a Grove burst moved
   exactly like a Void one. This layer is authored per element instead: the
   motion itself carries the identity, and because it is procedural it scales
   to any resolution and follows the real hit cadence rather than a fixed GIF.

   Every element reads its own way:
     flame     rising licks that accelerate upward and shear sideways
     tide      orbiting ribbons that spiral inward to the contact point
     earth     shards thrown out on ballistic arcs that fall back to the floor
     lightning jagged multi-segment bolts that re-roll on every hit
     radiance  fixed rays from above with a widening ground bloom
     void      inward-collapsing rift shards, the inverse of earth
   ========================================================================== */
/* ==========================================================================
   Shared per-element particle physics
   --------------------------------------------------------------------------
   Originally authored only for ElementalBurstLayer's burst particles. Normal
   attacks used a single generic radial spray for all six units regardless of
   element, so a fire sword and a lightning bow read as the same recolored
   effect. Extracting the per-element motion into one function lets normal
   attacks use their unit's real elemental behaviour too, rather than
   duplicating six branches of physics a second time.
   ========================================================================== */
type ElementalParticleShape = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  radius: string;
  background: string;
  /** 0-1ish; the caller multiplies by its own fade-in/out envelope. */
  localOpacity: number;
};

function elementalParticleShape(
  kind: (typeof BURST_STYLE)[BurstUnitId]["impact"],
  style: (typeof BURST_STYLE)[BurstUnitId],
  index: number,
  count: number,
  r1: number,
  r2: number,
  r3: number,
  life: number,
  spread: number,
  intensity: number,
  originX: number,
  originY: number,
): ElementalParticleShape {
  let x = originX;
  let y = originY;
  let w = 4 + r2 * 5;
  let h = 10 + r1 * 16;
  let rotate = 0;
  let radius = "50%";
  let localOpacity = 0.5 + r2 * 0.5;
  let background = `linear-gradient(180deg, ${style.secondary}, ${style.primary})`;

  if (kind === "flame") {
    // Licks accelerate upward and shear sideways as they thin out.
    const rise = life * life * (70 + r1 * 62) * intensity;
    x = originX + (r2 - 0.5) * spread + Math.sin(life * 5 + r1 * 6) * 9;
    y = originY - rise;
    w = (3 + r2 * 4) * (1 - life * 0.55) * intensity;
    h = (14 + r1 * 22) * (1 - life * 0.35) * intensity;
    rotate = (r3 - 0.5) * 34 + Math.sin(life * 4) * 12;
    background = `linear-gradient(180deg, ${style.secondary}, ${style.primary} 55%, ${style.deep})`;
    localOpacity = 1 - life * 0.7;
  } else if (kind === "tide") {
    // Ribbons orbit and spiral inward rather than flying outward.
    const angle = r1 * Math.PI * 2 + life * 3.1;
    const orbit = (1 - life) * spread * 1.5;
    x = originX + Math.cos(angle) * orbit;
    y = originY + Math.sin(angle) * orbit * 0.52;
    w = (16 + r2 * 22) * intensity;
    h = 3 + r3 * 3;
    rotate = angle * 57.2958 + 90;
    background = `linear-gradient(90deg, transparent, ${style.secondary}, ${style.primary}, transparent)`;
    localOpacity = 0.35 + r2 * 0.5;
  } else if (kind === "earth") {
    // Ballistic shards: thrown out, pulled back down by gravity.
    const vx = (r1 - 0.5) * 3.4 * intensity;
    const vy = -(1.4 + r2 * 2.2) * intensity;
    const t = life * 13;
    x = originX + vx * t;
    y = originY + vy * t + 0.14 * t * t;
    w = (5 + r2 * 8) * intensity;
    h = (5 + r3 * 9) * intensity;
    rotate = t * (24 + r3 * 46) * (r1 > 0.5 ? 1 : -1);
    radius = "22% 62% 34% 58%";
    background = `linear-gradient(140deg, ${style.secondary}, ${style.primary} 48%, ${style.deep})`;
  } else if (kind === "lightning") {
    // Segmented bolts that re-roll their break points every hit.
    const angle = r1 * Math.PI * 2;
    const reach = spread * (0.5 + life * 1.25);
    x = originX + Math.cos(angle) * reach * 0.6;
    y = originY + Math.sin(angle) * reach * 0.6;
    w = (20 + r2 * 34) * intensity;
    h = 2 + r3 * 2.5;
    rotate = angle * 57.2958 + (r3 - 0.5) * 46;
    radius = "0";
    background = `linear-gradient(90deg, transparent, ${style.secondary} 18%, #ffffff 46%, ${style.primary} 74%, transparent)`;
    // Bolts strobe rather than fade smoothly.
    localOpacity = Math.floor(life * 9 + r1 * 4) % 2 === 0 ? 1 : 0.24;
  } else if (kind === "radiance") {
    // Rays are fixed in place and descend; the ground bloom widens.
    const lane = (index / count - 0.5) * spread * 1.9;
    x = originX + lane;
    y = originY - 46 + life * 46;
    w = (3 + r2 * 5) * intensity;
    h = (34 + r1 * 46) * intensity * (0.35 + life * 0.8);
    rotate = lane * 0.13;
    background = `linear-gradient(180deg, transparent, ${style.secondary} 34%, #ffffff)`;
    localOpacity = 0.4 + r2 * 0.45;
  } else {
    // void — the inverse of earth: shards collapse inward and vanish.
    const angle = r1 * Math.PI * 2;
    const fall = (1 - life) * spread * 1.85;
    x = originX + Math.cos(angle) * fall;
    y = originY + Math.sin(angle) * fall * 0.78;
    w = (4 + r2 * 7) * intensity * (1 - life * 0.5);
    h = (12 + r3 * 20) * intensity * (1 - life * 0.5);
    rotate = angle * 57.2958 + life * 190;
    radius = "50% 4% 50% 4%";
    background = `linear-gradient(160deg, ${style.secondary}, ${style.primary} 60%, ${style.deep})`;
    localOpacity = (0.45 + r2 * 0.5) * (1 - life * 0.35);
  }

  return { x, y, w, h, rotate, radius, background, localOpacity };
}


function ElementalBurstLayer({
  unitId,
  style,
  frame,
  hitActive,
  hitProgress,
  hitIndex,
  hitRamp,
  impactX,
  impactY,
  finisherX,
  finisherY,
  finisherStart,
  finisherProgress,
  width,
  height,
  reducedEffects = false,
}: {
  unitId: BurstUnitId;
  style: (typeof BURST_STYLE)[BurstUnitId];
  frame: number;
  hitActive: boolean;
  hitProgress: number;
  hitIndex: number;
  hitRamp: number;
  impactX: number;
  impactY: number;
  finisherX: number;
  finisherY: number;
  finisherStart: number;
  finisherProgress: number;
  width: number;
  height: number;
  reducedEffects?: boolean;
}) {
  const kind = BURST_STYLE[unitId].impact;
  const isFinisher = frame >= finisherStart;
  // The finisher reuses the same generator at a larger radius and count, so a
  // burst ends with more of what it already was rather than a different effect.
  const originX = isFinisher ? finisherX : impactX;
  const originY = isFinisher ? finisherY : impactY;
  const localProgress = isFinisher ? finisherProgress : hitProgress;
  // The sprite strips are 80x80 per cell but render up to ~5.4x, so they are
  // soft by construction. Weight is deliberately shifted onto this layer,
  // which draws at stage resolution and stays sharp at any scale.
  const intensity = isFinisher ? 1.85 : hitRamp * 1.2;
  // Reduced effects roughly halves particle count rather than disabling the
  // layer outright, so bursts still read correctly on low-power devices.
  const count = reducedEffects ? (isFinisher ? 13 : 8) : isFinisher ? 26 : 15;
  // `hitIndex` seeds the randomiser so each hit in a chain throws a different
  // pattern instead of replaying one canned spray.
  const seed = `${unitId}-${isFinisher ? "fin" : hitIndex}`;
  if (!hitActive && !isFinisher) return null;

  const fade = interpolate(localProgress, [0, 0.12, 0.7, 1], [0, 1, 0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 0.86, 0.22, 1),
  });
  if (fade <= 0.001) return null;

  return (
    // A separate drop-shadow filter per particle (up to 26 at a finisher)
    // forced a per-element blur pass each frame - the single largest cost in
    // this layer. One filter on the shared compositing layer produces the
    // same glow for a fraction of the paint cost.
    <AbsoluteFill
      style={{
        zIndex: 7,
        overflow: "hidden",
        mixBlendMode: "screen",
        pointerEvents: "none",
        filter: `drop-shadow(0 0 ${5 + intensity * 3}px ${style.primary})`,
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const r1 = random(`${seed}-a-${index}`);
        const r2 = random(`${seed}-b-${index}`);
        const r3 = random(`${seed}-c-${index}`);
        const spread = 26 + r1 * 46 * intensity;
        const life = clamp(localProgress / (0.55 + r3 * 0.4));
        const shape = elementalParticleShape(kind, style, index, count, r1, r2, r3, life, spread, intensity, originX, originY);
        const { x, y, w, h, rotate, radius, background } = shape;
        const opacity = fade * shape.localOpacity;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: Math.max(-40, Math.min(width + 40, x)),
              top: Math.max(-40, Math.min(height + 40, y)),
              width: Math.max(1, w),
              height: Math.max(1, h),
              marginLeft: -w / 2,
              marginTop: -h / 2,
              borderRadius: radius,
              background,
              opacity: Math.max(0, Math.min(1, opacity)),
              rotate: `${rotate}deg`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/* ==========================================================================
   Procedural charge buildup
   --------------------------------------------------------------------------
   Replaces the raster preset.charge sprite strip. Where the strip was one
   fixed 80px loop for every unit, this converges element-appropriate energy
   inward toward the caster - the literal inverse motion of the hit/finisher
   layer's outward burst, which is what makes a charge read as "gathering"
   rather than "another explosion, but smaller".
   ========================================================================== */
function BurstChargeLayer({
  unitId,
  style,
  chargeProgress,
  casterX,
  casterY,
  reducedEffects = false,
}: {
  unitId: BurstUnitId;
  style: (typeof BURST_STYLE)[BurstUnitId];
  chargeProgress: number;
  casterX: number;
  casterY: number;
  reducedEffects?: boolean;
}) {
  const kind = BURST_STYLE[unitId].impact;
  if (chargeProgress <= 0 || chargeProgress >= 1) return null;
  const fade = interpolate(chargeProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const count = reducedEffects ? 6 : 11;
  return (
    <AbsoluteFill
      style={{
        zIndex: 2,
        overflow: "hidden",
        mixBlendMode: "screen",
        pointerEvents: "none",
        filter: `drop-shadow(0 0 6px ${style.primary})`,
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const r1 = random(`${unitId}-charge-a-${index}`);
        const r2 = random(`${unitId}-charge-b-${index}`);
        const r3 = random(`${unitId}-charge-c-${index}`);
        const angle = r1 * Math.PI * 2;
        // 1 at the start (far out), 0 at the moment of release (at the caster).
        const drawIn = 1 - chargeProgress;
        let x = casterX;
        let y = casterY;
        let w = 4 + r2 * 6;
        let h = 10 + r1 * 14;
        let rotate = angle * 57.2958;
        let opacity = fade * (0.4 + r2 * 0.5);
        let background = `linear-gradient(180deg, ${style.secondary}, ${style.primary})`;

        if (kind === "flame") {
          // Embers spiral inward and up, coalescing into the caster.
          const reach = (28 + r2 * 46) * drawIn;
          x = casterX + Math.cos(angle + chargeProgress * 4) * reach;
          y = casterY + Math.sin(angle + chargeProgress * 4) * reach * 0.6 - drawIn * 10;
          h = (10 + r1 * 16) * (0.5 + chargeProgress * 0.6);
          opacity = fade * (0.35 + r2 * 0.45);
        } else if (kind === "tide") {
          // Rings contract steadily, no spiral - a calm gather rather than a storm.
          const reach = (40 + r2 * 30) * drawIn;
          x = casterX + Math.cos(angle) * reach;
          y = casterY + Math.sin(angle) * reach * 0.5;
          w = (14 + r2 * 16) * (0.6 + chargeProgress * 0.5);
          h = 3 + r3 * 2;
          rotate = angle * 57.2958 + 90;
          background = `linear-gradient(90deg, transparent, ${style.secondary}, ${style.primary}, transparent)`;
        } else if (kind === "earth") {
          // Shards rise up from the ground and settle at the caster's feet.
          const reach = (24 + r2 * 34) * drawIn;
          x = casterX + (r1 - 0.5) * reach * 2;
          y = casterY + 30 * drawIn - r3 * 6;
          rotate = (r1 - 0.5) * 40;
          background = `linear-gradient(140deg, ${style.secondary}, ${style.primary} 48%, ${style.deep})`;
        } else if (kind === "lightning") {
          // Short strobing arcs snap toward the caster, faster as release nears.
          const reach = (30 + r2 * 50) * drawIn;
          x = casterX + Math.cos(angle) * reach;
          y = casterY + Math.sin(angle) * reach * 0.6;
          w = (12 + r2 * 20) * (0.5 + chargeProgress * 0.6);
          h = 2 + r3 * 2;
          background = `linear-gradient(90deg, transparent, ${style.secondary} 20%, #ffffff 50%, ${style.primary} 78%, transparent)`;
          opacity = fade * (Math.floor(chargeProgress * 22 + r1 * 5) % 2 === 0 ? 0.9 : 0.2);
        } else if (kind === "radiance") {
          // Rays draw down from above the caster rather than converging sideways.
          const lane = (index / count - 0.5) * 60;
          x = casterX + lane;
          y = casterY - 50 * drawIn;
          w = 3 + r2 * 4;
          h = (24 + r1 * 30) * (0.4 + chargeProgress * 0.6);
          rotate = lane * 0.1;
          background = `linear-gradient(180deg, transparent, ${style.secondary} 34%, #ffffff)`;
        } else {
          // void — shadow wisps drawn inward and swallowed at the caster.
          const reach = (34 + r2 * 40) * drawIn;
          x = casterX + Math.cos(angle - chargeProgress * 3) * reach;
          y = casterY + Math.sin(angle - chargeProgress * 3) * reach * 0.7;
          rotate = angle * 57.2958 + chargeProgress * 160;
          background = `linear-gradient(160deg, ${style.secondary}, ${style.primary} 60%, ${style.deep})`;
        }

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: Math.max(1, w),
              height: Math.max(1, h),
              marginLeft: -w / 2,
              marginTop: -h / 2,
              borderRadius: "50%",
              background,
              opacity: Math.max(0, Math.min(1, opacity)),
              rotate: `${rotate}deg`,
            }}
          />
        );
      })}
      {/* A gathering core so the many small draws-in read as feeding one point. */}
      <div
        style={{
          position: "absolute",
          left: casterX,
          top: casterY,
          width: 20 + chargeProgress * 26,
          height: 20 + chargeProgress * 26,
          marginLeft: -(10 + chargeProgress * 13),
          marginTop: -(10 + chargeProgress * 13),
          borderRadius: "50%",
          background: `radial-gradient(circle, #ffffff, ${style.secondary} 40%, ${style.primary}00 72%)`,
          opacity: fade * (0.3 + chargeProgress * 0.5),
          filter: `blur(1px) drop-shadow(0 0 ${6 + chargeProgress * 10}px ${style.primary})`,
        }}
      />
    </AbsoluteFill>
  );
}

/* ==========================================================================
   Per-unit finisher signature
   --------------------------------------------------------------------------
   Ports the large-scale silhouette identity that the removed .burst-signature
   CSS system used to provide (flame pillars, water vortex, root eruption,
   lightning volley, aurora bloom, rift + black sun) into one procedural,
   resolution-independent layer so each unit's climax still reads as a
   distinct shape, not just more particles at a bigger radius.
   ========================================================================== */
function BurstFinisherFlourish({
  unitId,
  style,
  finisherProgress,
  finisherX,
  finisherY,
  width,
  height,
}: {
  unitId: BurstUnitId;
  style: (typeof BURST_STYLE)[BurstUnitId];
  finisherProgress: number;
  finisherX: number;
  finisherY: number;
  width: number;
  height: number;
}) {
  if (finisherProgress <= 0) return null;
  const rise = interpolate(finisherProgress, [0, 0.4, 1], [0, 1, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 0.86, 0.22, 1),
  });
  const fade = interpolate(finisherProgress, [0, 0.12, 0.7, 1], [0, 1, 0.85, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (fade <= 0.001) return null;

  const common: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: fade,
  };

  let node: ReactNode = null;
  switch (unitId) {
    case "kael": {
      // A nova ring that blooms outward from the finisher contact point.
      const size = 60 + rise * 340;
      node = (
        <div
          style={{
            ...common,
            left: finisherX,
            top: finisherY,
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderRadius: "50%",
            border: `${6 + rise * 4}px solid ${style.primary}`,
            boxShadow: `0 0 ${18 + rise * 30}px ${style.primary}, inset 0 0 ${14 + rise * 20}px ${style.secondary}`,
          }}
        />
      );
      break;
    }
    case "lyra": {
      // A converging spiral vortex ring, tightening as it fades.
      const size = 300 - rise * 160;
      node = (
        <div
          style={{
            ...common,
            left: finisherX,
            top: finisherY,
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderRadius: "48% 52% 46% 54%",
            border: `${14 - rise * 6}px double ${style.secondary}`,
            boxShadow: `0 0 24px ${style.primary}, inset 0 0 26px ${style.secondary}`,
            rotate: `${rise * 220}deg`,
          }}
        />
      );
      break;
    }
    case "brannock": {
      // Ground-crack spikes radiating from the impact point.
      const spikes = 8;
      node = (
        <>
          {Array.from({ length: spikes }, (_, i) => {
            const angle = (i / spikes) * 360;
            const length = 30 + rise * 150;
            return (
              <div
                key={i}
                style={{
                  ...common,
                  left: finisherX,
                  top: finisherY,
                  width: 8,
                  height: length,
                  marginLeft: -4,
                  background: `linear-gradient(180deg, ${style.primary}, ${style.deep})`,
                  clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                  transformOrigin: "50% 0%",
                  rotate: `${angle}deg`,
                }}
              />
            );
          })}
        </>
      );
      break;
    }
    case "zephyra": {
      // A converging burst of arced bolts, star-pattern.
      const bolts = 7;
      node = (
        <>
          {Array.from({ length: bolts }, (_, i) => {
            const angle = (i / bolts) * 360 + rise * 40;
            const length = 40 + rise * 180;
            return (
              <div
                key={i}
                style={{
                  ...common,
                  left: finisherX,
                  top: finisherY,
                  width: length,
                  height: 4,
                  marginTop: -2,
                  background: `linear-gradient(90deg, ${style.secondary}, #ffffff 50%, ${style.primary}, transparent)`,
                  transformOrigin: "0% 50%",
                  rotate: `${angle}deg`,
                }}
              />
            );
          })}
        </>
      );
      break;
    }
    case "solenne": {
      // An expanding light pillar with a widening halo ring.
      const haloSize = 40 + rise * 300;
      node = (
        <>
          <div
            style={{
              ...common,
              left: finisherX,
              top: 0,
              width: 26 - rise * 8,
              height,
              marginLeft: -13,
              background: `linear-gradient(180deg, transparent, ${style.secondary}, #ffffff, ${style.secondary}, transparent)`,
              filter: `blur(1px) drop-shadow(0 0 16px ${style.primary})`,
            }}
          />
          <div
            style={{
              ...common,
              left: finisherX,
              top: finisherY,
              width: haloSize,
              height: haloSize,
              marginLeft: -haloSize / 2,
              marginTop: -haloSize / 2,
              borderRadius: "50%",
              border: `3px solid ${style.secondary}`,
              boxShadow: `0 0 20px ${style.primary}`,
            }}
          />
        </>
      );
      break;
    }
    default: {
      // nyx — a collapsing rift that resolves into a small black sun.
      const sunSize = 20 + rise * 90;
      node = (
        <>
          <div
            style={{
              ...common,
              left: finisherX,
              top: finisherY,
              width: 340 - rise * 200,
              height: 340 - rise * 200,
              marginLeft: -(340 - rise * 200) / 2,
              marginTop: -(340 - rise * 200) / 2,
              borderRadius: "50%",
              background: `repeating-conic-gradient(${style.primary} 0deg 3deg, transparent 4deg 14deg)`,
              maskImage: "radial-gradient(circle, transparent 0 30%, #000 34% 55%, transparent 60%)",
              rotate: `${rise * -180}deg`,
            }}
          />
          <div
            style={{
              ...common,
              left: finisherX,
              top: finisherY,
              width: sunSize,
              height: sunSize,
              marginLeft: -sunSize / 2,
              marginTop: -sunSize / 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, #030008 0 46%, ${style.primary} 52%, transparent 60%)`,
              boxShadow: `0 0 26px ${style.primary}`,
            }}
          />
        </>
      );
    }
  }

  // Brannock (8 spikes) and Zephyra (7 bolts) each had a drop-shadow filter
  // per element; one filter on this wrapper produces the same glow at a
  // fraction of the paint cost, matching the fix applied to the other
  // multi-element burst layers.
  return (
    <AbsoluteFill style={{ zIndex: 8, overflow: "visible", filter: `drop-shadow(0 0 7px ${style.primary})` }}>
      {node}
    </AbsoluteFill>
  );
}

export function BurstVfxComposition({ unitId, stars = 5, hitCount, targetLeft = 95, targetBottom = 120, reducedEffects = false }: BurstVfxProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const style = BURST_STYLE[unitId];
  const preset = RPG_BURST_PRESETS[unitId];
  const casterX = width * 0.77;
  const casterY = height * 0.55;
  const supportBurst = unitId === "solenne";
  const tierIntensity = stars === 2 ? 0.64 : stars === 3 ? 0.78 : stars === 4 ? 0.92 : 1.08;
  const targetX = supportBurst ? casterX : Math.min(width * 0.58, Math.max(42, targetLeft + 41));
  const targetY = supportBurst ? casterY : Math.min(height - 46, Math.max(54, height - targetBottom - 46));
  const impactFrame = frame - 12;
  const hitActive = impactFrame >= 0 && impactFrame < hitCount * 11;
  const hitIndex = hitActive ? Math.floor(impactFrame / 11) : Math.max(0, hitCount - 1);
  const weaponContact = getWeaponContactPoint({
    unitId,
    hitIndex: hitIndex + 1,
    burst: true,
    targetLeft,
    targetBottom,
    stageHeight: height,
  });
  const finisherContact = getWeaponContactPoint({
    unitId,
    hitIndex: hitCount,
    burst: true,
    targetLeft,
    targetBottom,
    stageHeight: height,
  });
  const hitProgress = hitActive ? (impactFrame % 11) / 10 : 1;
  const hitEnvelope = hitActive
    ? interpolate(hitProgress, [0, 0.14, 0.72, 1], [0, 1, 0.88, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 0.86, 0.22, 1),
    })
    : 0;
  const chargeProgress = clamp(frame / 20);
  const chargeOpacity = interpolate(frame, [0, 3, 14, 22], [0, 1, 0.96, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
  });
  const finisherStart = 10 + Math.max(0, hitCount - 1) * 11;
  const finisherProgress = clamp((frame - finisherStart) / 23);
  const finisherOpacity = interpolate(
    frame,
    [finisherStart, finisherStart + 3, finisherStart + 16, finisherStart + 25],
    [0, 1, 0.94, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
    }
  );
  const entrance = interpolate(frame, [0, 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.84, 0),
  });
  const impactX = supportBurst ? casterX : Math.min(width - 24, Math.max(24, weaponContact.x + (hitIndex % 3 - 1) * 2));
  const impactY = supportBurst ? casterY : Math.min(height - 28, Math.max(34, weaponContact.y + (hitIndex % 2 ? -1 : 1)));
  const impactRotation = weaponContact.angle + (hitIndex % 3 - 1) * 7;
  const chargeBaseX = preset.chargeAnchor === "caster" ? casterX : targetX;
  const chargeBaseY = preset.chargeAnchor === "caster" ? casterY : targetY;
  const chargeX = unitId === "kael"
    ? interpolate(frame, [0, 18], [casterX - 8, targetX + 26], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 0.84, 0.28, 1) })
    : chargeBaseX;
  const chargeY = unitId === "kael"
    ? interpolate(frame, [0, 18], [casterY + 8, targetY - 7], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 0.84, 0.28, 1) })
    : chargeBaseY + (unitId === "brannock" ? 18 : unitId === "solenne" ? -13 : 0);
  const finisherX = preset.finisherAnchor === "caster" ? casterX : finisherContact.x;
  const finisherY = preset.finisherAnchor === "caster" ? casterY : finisherContact.y;

  // Brave Frontier bursts read as a build, not a loop: every hit in the chain
  // is slightly larger, brighter and wider than the one before it, so the
  // finisher arrives as the peak of a curve the player has been watching rise.
  // Previously every hit used an identical envelope, which is what made long
  // chains (Nyx at 18 hits) read as one flash repeating.
  const chainPosition = hitCount > 1 ? hitIndex / (hitCount - 1) : 1;
  const hitRamp = interpolate(chainPosition, [0, 0.55, 1], [0.78, 1.02, 1.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.5, 1),
  });
  // Every fourth hit lands as a marked accent so the chain has internal
  // rhythm rather than a flat ramp.
  const accentHit = hitIndex > 0 && hitIndex % 4 === 3;
  const hitAccent = accentHit ? 1.24 : 1;

  // The launch streak covers Brave Frontier's "movement" phase — the moment
  // the burst leaves the caster and crosses to the target. Without it the
  // charge simply cut to the first contact.
  const launchProgress = interpolate(frame, [6, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 0.9, 0.3, 1),
  });
  const launchOpacity = interpolate(frame, [6, 9, 14, 18], [0, 0.92, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear, Easing.bezier(0.7, 0, 0.84, 0)],
  });
  const launchAngle = Math.atan2(targetY - casterY, targetX - casterX) * 180 / Math.PI;
  const launchLength = Math.hypot(targetX - casterX, targetY - casterY);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "transparent", opacity: exit, pointerEvents: "none" }}>
      <Interactive.Div
        name="Elemental focus field"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${targetX}px ${targetY}px, ${style.secondary}3d 0 3%, ${style.primary}24 18%, transparent 52%), linear-gradient(90deg, ${style.deep}22, transparent 42%, ${style.primary}12)`,
          opacity: entrance * tierIntensity,
          mixBlendMode: "screen",
        }}
      />

      <Interactive.Div
        name="Burst launch streak"
        style={{
          position: "absolute",
          left: casterX,
          top: casterY,
          width: launchLength,
          height: 16,
          transformOrigin: "0 50%",
          rotate: `${launchAngle}deg`,
          translate: "0 -8px",
          borderRadius: "50%",
          background: `linear-gradient(90deg, ${style.secondary}00 0%, ${style.secondary}d8 12%, ${style.primary}f0 46%, ${style.secondary}cc 78%, ${style.secondary}00 100%)`,
          opacity: supportBurst ? 0 : launchOpacity * tierIntensity,
          scale: `${launchProgress} ${0.4 + launchProgress * 0.6}`,
          filter: `blur(1.4px) drop-shadow(0 0 9px ${style.primary}) drop-shadow(0 0 18px ${style.secondary})`,
          mixBlendMode: "screen",
          zIndex: 4,
        }}
      />

      <Interactive.Div
        name="Per-hit contact flash"
        style={{
          position: "absolute",
          left: impactX,
          top: impactY,
          width: 214,
          height: 214,
          marginLeft: -107,
          marginTop: -107,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${style.secondary}f2 0 2%, ${style.primary}a8 9%, ${style.primary}3e 24%, transparent 64%)`,
          opacity: hitEnvelope * (supportBurst ? 0.54 : 0.86) * Math.min(1.25, hitRamp * hitAccent) * tierIntensity,
          scale: interpolate(hitProgress, [0, 1], [0.35 * hitRamp, 1.46 * hitRamp * hitAccent], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.86, 0.22, 1),
            output: "perceptual-scale",
          }),
          mixBlendMode: "screen",
          filter: `blur(${unitId === "zephyra" ? 1 : 3}px)`,
        }}
      />

      <BurstChargeLayer
        unitId={unitId}
        style={style}
        chargeProgress={chargeProgress}
        casterX={casterX}
        casterY={casterY}
        reducedEffects={reducedEffects}
      />

      {/* Per-hit raster strips removed here — ElementalBurstLayer below already
          renders this moment procedurally, per element, at stage resolution. */}

      <BurstFinisherFlourish
        unitId={unitId}
        style={style}
        finisherProgress={finisherProgress}
        finisherX={finisherX}
        finisherY={finisherY}
        width={width}
        height={height}
      />

      {Array.from({ length: 38 }, (_, index) => {
        const start = 7 + Math.floor(random(`${unitId}-rpg-start-${index}`) * Math.max(1, durationInFrames - 28));
        const life = 14 + Math.floor(random(`${unitId}-rpg-life-${index}`) * 18);
        const local = (frame - start) / life;
        if (local < 0 || local > 1) return null;
        const angle = random(`${unitId}-rpg-angle-${index}`) * Math.PI * 2;
        const lane = random(`${unitId}-rpg-lane-${index}`);
        const spread = 38 + lane * 128;
        let x = targetX + (lane - 0.5) * 72;
        let y = targetY;
        if (style.impact === "flame") {
          x += Math.sin(angle) * spread * local;
          y -= (58 + spread) * local;
        } else if (style.impact === "tide") {
          x += Math.sin(angle + local * 4.2) * (34 + spread * local);
          y += (lane - 0.35) * 46 + local * 72;
        } else if (style.impact === "earth") {
          x += Math.cos(angle) * spread * local;
          y += 10 + Math.abs(Math.sin(angle)) * 58 * local;
        } else if (style.impact === "lightning") {
          x += (lane - 0.5) * 155 + Math.sin(local * 20 + angle) * 12;
          y += -135 + local * 255;
        } else if (style.impact === "radiance") {
          x += Math.cos(angle) * spread * local;
          y += Math.sin(angle) * spread * local;
        } else {
          const radius = (1 - local) * (76 + spread);
          x += Math.cos(angle + local * 4.6) * radius;
          y += Math.sin(angle + local * 4.6) * radius * 0.62;
        }
        const particleWidth = style.impact === "lightning" ? 2 : style.impact === "earth" ? 5 + lane * 5 : 2 + lane * 4;
        const particleHeight = style.impact === "lightning" ? 20 + lane * 31 : style.impact === "tide" ? 3 + lane * 5 : style.impact === "earth" ? 5 + lane * 6 : 8 + lane * 15;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              zIndex: 5,
              left: x,
              top: y,
              width: particleWidth,
              height: particleHeight,
              borderRadius: style.impact === "earth" ? "18%" : style.impact === "lightning" ? 0 : "50%",
              clipPath: style.impact === "lightning" ? "polygon(35% 0,100% 0,60% 43%,92% 43%,18% 100%,38% 57%,0 57%)" : undefined,
              background: index % 3 === 0 ? style.secondary : style.primary,
              opacity: Math.sin(local * Math.PI) * (0.5 + lane * 0.42) * tierIntensity,
              rotate: `${angle * 57.2958 + local * 110}deg`,
              boxShadow: `0 0 ${5 + lane * 8}px ${style.primary}`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}

      <ElementalBurstLayer
        unitId={unitId}
        style={style}
        frame={frame}
        hitActive={hitActive}
        hitProgress={hitProgress}
        hitIndex={hitIndex}
        hitRamp={hitRamp}
        impactX={impactX}
        impactY={impactY}
        finisherX={finisherX}
        finisherY={finisherY}
        finisherStart={finisherStart}
        finisherProgress={finisherProgress}
        width={width}
        height={height}
        reducedEffects={reducedEffects}
      />

      <Interactive.Div
        name="Finisher flash"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${finisherX}px ${finisherY}px, ${style.secondary}f2 0 1%, ${style.primary}9c 8%, transparent 42%)`,
          opacity: interpolate(frame, [finisherStart, finisherStart + 3, finisherStart + 8, finisherStart + 22], [0, 0.72, 0.2, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.9, 0.22, 1),
          }),
          scale: interpolate(frame, [finisherStart, finisherStart + 22], [0.42, 1.52], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.86, 0.22, 1),
            output: "perceptual-scale",
          }),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
}

/**
 * A short contact layer for ordinary attacks. The sprite pose changes happen
 * beneath this flash/smear, so a combo reads as one continuous movement rather
 * than a sequence of exposed source-image swaps.
 */
export function AttackImpactComposition({
  unitId,
  stars = 5,
  targetLeft = 95,
  targetBottom = 120,
  hitIndex = 1,
  critical = false,
  spark = false,
  reducedEffects = false,
}: AttackImpactProps) {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const style = BURST_STYLE[unitId];
  const kind = style.impact;
  const preset = RPG_BURST_PRESETS[unitId];
  const progress = clamp(frame / Math.max(1, durationInFrames - 1));
  const weaponContact = getWeaponContactPoint({
    unitId,
    hitIndex,
    burst: false,
    targetLeft,
    targetBottom,
    stageHeight: height,
  });
  const targetX = Math.min(width - 24, Math.max(24, weaponContact.x));
  const targetY = Math.min(height - 28, Math.max(34, weaponContact.y));
  const impactProgress = clamp((frame - 1) / Math.max(1, durationInFrames - 4));
  const envelope = interpolate(frame, [0, 1, 5, durationInFrames - 1], [0, 1, 0.76, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 0.86, 0.22, 1),
  });
  const rotation = weaponContact.angle;
  const intensity = critical ? 1.2 : spark ? 1.1 : 1;
  const tierIntensity = stars === 2 ? 0.7 : stars === 3 ? 0.82 : stars === 4 ? 0.94 : 1.08;
  const normalSparkCount = reducedEffects ? (spark ? 8 : 5) : spark ? 15 : 10;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "transparent", pointerEvents: "none" }}>
      <Interactive.Div
        name="Attack contact light"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${targetX}px ${targetY}px, ${style.secondary}f2 0 1%, ${style.primary}9c 7%, ${style.primary}32 20%, transparent 46%)`,
          opacity: envelope * 0.78 * intensity * tierIntensity,
          transformOrigin: `${targetX}px ${targetY}px`,
          scale: interpolate(progress, [0, 1], [0.48, 1.38], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.84, 0.24, 1),
            output: "perceptual-scale",
          }),
          mixBlendMode: "screen",
        }}
      />

      <Interactive.Div
        name="Attack motion streak"
        style={{
          position: "absolute",
          zIndex: 2,
          left: targetX,
          top: targetY,
          width: critical ? 190 : 164,
          height: critical ? 17 : 12,
          marginLeft: -3,
          marginTop: -6,
          borderRadius: "50%",
          background: `linear-gradient(90deg, ${style.secondary} 0%, ${style.primary}e8 13%, ${style.primary}6f 48%, ${style.primary}18 74%, transparent 100%)`,
          boxShadow: `0 0 9px ${style.primary}, 0 0 22px ${style.primary}8c`,
          opacity: envelope * tierIntensity,
          scale: `${interpolate(progress, [0, 0.38, 1], [0.18, 1, 1.2], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 0.9, 0.22, 1),
          })} 1`,
          rotate: `${rotation}deg`,
          transformOrigin: "0% 50%",
          filter: "blur(.45px)",
          mixBlendMode: "screen",
        }}
      />

      <RpgSpriteStrip
        name={`${unitId} normal-hit glow`}
        strip={preset.impact}
        progress={impactProgress}
        left={targetX}
        top={targetY}
        opacity={envelope * 0.42 * intensity * tierIntensity}
        scale={critical ? 0.78 : 0.68}
        rotate={rotation - 8}
        flipX={hitIndex % 2 === 1}
        blur={2.4}
        zIndex={3}
      />
      <RpgSpriteStrip
        name={`${unitId} normal-hit element`}
        strip={preset.impact}
        progress={impactProgress}
        left={targetX}
        top={targetY}
        opacity={envelope * tierIntensity}
        scale={critical ? 0.66 : 0.56}
        rotate={rotation}
        flipX={hitIndex % 2 === 1}
        zIndex={5}
      />

      {/* Previously every unit's normal attack used the same generic radial
          spray, just recolored - a fire sword and a lightning bow read as the
          same effect. This now calls the exact per-element motion the burst
          layer uses (flame licks, tide ribbons, earth shards, strobing
          lightning, descending radiance, collapsing void), scaled down and
          anchored to the weapon contact point instead of the burst caster.

          This composition already had two mixBlendMode:"screen" layers above
          plus two blurred RpgSpriteStrips - a THIRD mixBlendMode layer with a
          filter on top of it forces an extra offscreen compositing pass, and
          this whole composition mounts a new Player once per hit, more often
          than anything else in the game. Reported as a black-screen crash on
          the very first attack on a real device - that combination is the
          leading suspect, so this uses per-particle box-shadow (no isolated
          compositing buffer needed) instead of a wrapper filter. */}
      <AbsoluteFill style={{ zIndex: 6, pointerEvents: "none" }}>
        {Array.from({ length: normalSparkCount }, (_, index) => {
        const r1 = random(`${unitId}-attack-a-${hitIndex}-${index}`);
        const r2 = random(`${unitId}-attack-b-${hitIndex}-${index}`);
        const r3 = random(`${unitId}-attack-c-${hitIndex}-${index}`);
        const life = clamp((frame - r3 * 3) / 12);
        const shape = elementalParticleShape(
          kind,
          style,
          index,
          normalSparkCount,
          r1,
          r2,
          r3,
          life,
          critical ? 30 : 22,
          critical ? 1.35 : 1.05,
          targetX,
          targetY,
        );
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: shape.x,
              top: shape.y,
              width: Math.max(1, shape.w),
              height: Math.max(1, shape.h),
              marginLeft: -shape.w / 2,
              marginTop: -shape.h / 2,
              borderRadius: shape.radius,
              background: shape.background,
              opacity: Math.max(0, Math.min(1, shape.localOpacity * intensity)),
              rotate: `${shape.rotate}deg`,
              boxShadow: `0 0 5px ${style.primary}`,
            }}
          />
        );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function StageMotionComposition({ stageId, stageSrc }: StageMotionProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const style = STAGE_STYLE[stageId];
  const isSunnyField = stageId === "field";
  const isRain = stageId === "causeway";
  const particleCount = isSunnyField ? 28 : isRain ? 48 : 36;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: isSunnyField ? "#8ed1ec" : "#061017" }}>
      <Img
        src={stageSrc}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: stageId === "field" ? "center 25%" : "center 63%",
          filter: isSunnyField
            ? "saturate(1.1) contrast(1.01) brightness(1.05)"
            : "saturate(.96) contrast(1.06) brightness(.74)",
        }}
      />

      {isSunnyField && (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle at 20% 3%, rgba(255,255,225,.58), transparent 24%), linear-gradient(112deg, rgba(255,252,207,.18), transparent 38%)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {Array.from({ length: particleCount }, (_, index) => {
        const lane = random(`${stageId}-lane-${index}`);
        const depth = 0.38 + random(`${stageId}-depth-${index}`) * 0.62;
        const speed = isRain ? (depth > 0.68 ? 3 : 2) : 1;
        const phase = (frame / durationInFrames * speed + random(`${stageId}-phase-${index}`)) % 1;
        const x = lane * 470 - 20 + (isRain
          ? phase * (18 + depth * 16)
          : Math.sin((phase + index * 0.17) * Math.PI * 2) * 7);
        const upward = stageId === "reliquary" || stageId === "emberwood";
        const y = isSunnyField
          ? 360 - phase * 390
          : upward
            ? 380 - phase * 420
            : -45 + phase * 445;
        const sunnyPetal = index % 4 === 0;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: isRain ? Math.max(1, depth * 1.5) : isSunnyField ? (sunnyPetal ? 7 : 3) : 2 + random(`${stageId}-size-${index}`) * 3,
              height: isRain ? 16 + depth * 28 : isSunnyField ? (sunnyPetal ? 4 : 3) : 2 + random(`${stageId}-height-${index}`) * 6,
              borderRadius: stageId === "citadel" ? "18%" : isSunnyField && sunnyPetal ? "70% 30% 70% 30%" : "50%",
              background: isSunnyField
                ? sunnyPetal
                  ? index % 8 === 0 ? "#fff7fb" : "#fff0a3"
                  : style.mote
                : `linear-gradient(${isRain ? "180deg" : "135deg"}, ${style.mote}, transparent)`,
              opacity: (isSunnyField ? 0.24 : 0.16) + random(`${stageId}-opacity-${index}`) * (isSunnyField ? 0.42 : 0.44) * depth,
              rotate: isRain ? "-13deg" : `${phase * 360 + index * 19}deg`,
              filter: isRain && depth < 0.58 ? "blur(.45px)" : undefined,
              boxShadow: isSunnyField || stageId === "emberwood" || stageId === "reliquary" ? `0 0 7px ${style.glow}` : undefined,
            }}
          />
        );
      })}

      <AbsoluteFill
        style={{
          background: isSunnyField
            ? "radial-gradient(ellipse at 48% 76%, transparent 0 44%, rgba(64,119,60,.2) 100%), linear-gradient(180deg, rgba(255,252,215,.08), transparent 48%, rgba(31,83,36,.24))"
            : `radial-gradient(ellipse at 48% 76%, transparent 0 26%, ${style.haze}9a 92%), linear-gradient(180deg, rgba(1,6,9,.52), transparent 31%, transparent 68%, rgba(1,5,8,.78))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-20%",
          right: "-20%",
          bottom: 42,
          height: 88,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${style.glow}24, transparent 69%)`,
          filter: "blur(14px)",
          opacity: isSunnyField ? 0.34 : 0.52,
        }}
      />
    </AbsoluteFill>
  );
}
