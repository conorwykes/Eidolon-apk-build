"use client";

import type { CSSProperties } from "react";
import type { BattleUnitId } from "../../game/battle-choreography";

export type FiveStarBurstStage = "approach" | "windup" | "release" | "flight" | "impact" | "hitstop" | "recover" | "anchored" | "return";

type BurstMotionProps = {
  instanceId: string;
  unitId: BattleUnitId;
  frame: number;
  frameCount: number;
  stage: FiveStarBurstStage;
  volley: number;
  casterX: number;
  casterY: number;
  casterFootY: number;
  targetX: number;
  targetY: number;
  reducedEffects?: boolean;
};

type BurstImpactProps = {
  instanceId: string;
  unitId: BattleUnitId;
  hitIndex: number;
  finisher: boolean;
  targetX: number;
  targetY: number;
  angle: number;
  reducedEffects?: boolean;
};

type MotionCoordinates = {
  progress: number;
  casterX: number;
  casterY: number;
  casterFootY: number;
  targetX: number;
  targetY: number;
  paint: string;
  glow: string;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const range = (value: number, start: number, end: number) => smooth((value - start) / Math.max(0.001, end - start));
const envelope = (value: number, start: number, peak: number, end: number) => (
  value <= peak ? range(value, start, peak) : 1 - range(value, peak, end)
);

const ELEMENT_COLORS: Record<BattleUnitId, { core: string; primary: string; secondary: string }> = {
  kael: { core: "#fff1a8", primary: "#ff6a24", secondary: "#be2517" },
  lyra: { core: "#e8fdff", primary: "#3fd3ff", secondary: "#1978d1" },
  brannock: { core: "#f5d58e", primary: "#9bd35f", secondary: "#7a4a25" },
  zephyra: { core: "#fffde0", primary: "#ffe85d", secondary: "#8d66ff" },
  solenne: { core: "#fffdf0", primary: "#ffe89a", secondary: "#f4b6e5" },
  nyx: { core: "#f3d9ff", primary: "#b65cff", secondary: "#5a1b91" },
};

const TEAM_FOOT_POINTS = [
  { x: 303, y: 241 },
  { x: 384, y: 241 },
  { x: 303, y: 285 },
  { x: 384, y: 285 },
  { x: 303, y: 327 },
] as const;

function KaelMotion({ progress, casterX, casterY, targetX, targetY, paint, glow }: MotionCoordinates) {
  const heat = envelope(progress, 0.03, 0.35, 0.84);
  const slash = range(progress, 0.22, 0.68);
  const trail = envelope(progress, 0.16, 0.57, 0.86);
  const endX = casterX + (targetX - casterX) * slash;
  const endY = casterY - 66 + (targetY - casterY + 66) * slash;
  return <>
    <g className="five-star-vfx-flame-cluster" opacity={heat * 0.92} style={{ transform: `translate(${casterX}px, ${casterY}px) scale(${0.72 + heat * 0.34})` }}>
      <path d="M-30 24 C-37 5-18-5-25-25 C-4-16-14 4 0 13 C14-4 10-20 25-31 C31-10 15 3 31 23 C16 15 9 32 0 35 C-8 25-15 17-30 24Z" fill={`url(#${glow})`} />
      <path d="M-14 26 C-18 10-5 6-8-10 C5-4 2 8 11 16 C18 11 19 4 23-3 C28 13 13 26 2 32Z" fill="#fff0a2" opacity={0.82} />
    </g>
    <g opacity={trail} className="five-star-vfx-ribbon">
      <path
        d={`M ${casterX + 22} ${casterY - 82} C ${casterX - 15} ${casterY - 145} ${endX + 58} ${endY - 56} ${endX - 5} ${endY + 4} C ${endX + 26} ${endY - 4} ${casterX - 8} ${casterY - 55} ${casterX + 22} ${casterY - 82} Z`}
        fill={`url(#${paint})`}
      />
      <path
        d={`M ${casterX + 13} ${casterY - 76} C ${casterX - 9} ${casterY - 112} ${endX + 29} ${endY - 29} ${endX + 1} ${endY} C ${endX + 22} ${endY - 5} ${casterX + 2} ${casterY - 62} ${casterX + 13} ${casterY - 76} Z`}
        fill="#fff3b0"
        opacity={0.86}
      />
      {[0, 1, 2, 3].map((index) => {
        const t = clamp(slash - index * 0.08);
        const x = casterX + (targetX - casterX) * t;
        const y = casterY - 45 + (targetY - casterY + 45) * t;
        return <path key={index} className="five-star-vfx-mote" d={`M ${x} ${y + 8} C ${x - 8} ${y - 3} ${x + 2} ${y - 14 - index * 2} ${x + 7} ${y - 23 - index * 2} C ${x + 14} ${y - 8} ${x + 10} ${y + 3} ${x} ${y + 8} Z`} fill={index % 2 ? "#ff982f" : "#ff4b1d"} />;
      })}
    </g>
  </>;
}

function LyraMotion({ progress, casterX, casterY, targetX, targetY, paint, glow }: MotionCoordinates) {
  const spin = range(progress, 0.08, 0.67);
  const water = envelope(progress, 0.03, 0.58, 0.91);
  const sweep = range(progress, 0.27, 0.72);
  const midX = (casterX + targetX) / 2;
  return <>
    <g className="five-star-vfx-water-swirl" opacity={water * 0.94} style={{ transform: `rotate(${spin * 310}deg)`, transformOrigin: `${casterX}px ${casterY + 8}px` }}>
      <path d={`M ${casterX - 53} ${casterY + 12} C ${casterX - 25} ${casterY - 8} ${casterX + 39} ${casterY - 7} ${casterX + 55} ${casterY + 11} C ${casterX + 27} ${casterY + 1} ${casterX - 22} ${casterY + 3} ${casterX - 46} ${casterY + 23} Z`} fill={`url(#${paint})`} />
      <path d={`M ${casterX - 27} ${casterY - 38} C ${casterX - 4} ${casterY - 61} ${casterX + 30} ${casterY - 35} ${casterX + 20} ${casterY + 2} C ${casterX + 20} ${casterY - 25} ${casterX - 4} ${casterY - 43} ${casterX - 22} ${casterY - 25} Z`} fill={`url(#${glow})`} opacity={0.78} />
      <path d={`M ${casterX + 42} ${casterY + 24} C ${casterX + 18} ${casterY + 48} ${casterX - 29} ${casterY + 45} ${casterX - 43} ${casterY + 23} C ${casterX - 20} ${casterY + 34} ${casterX + 15} ${casterY + 36} ${casterX + 42} ${casterY + 24} Z`} fill="#c9f9ff" opacity={0.66} />
    </g>
    <g opacity={water * envelope(sweep, 0, 0.78, 1)} className="five-star-vfx-ribbon">
      <path d={`M ${casterX + 17} ${casterY - 37} C ${midX + 18} ${casterY - 112} ${targetX + 51} ${targetY - 43} ${targetX - 4} ${targetY + 3} C ${targetX + 26} ${targetY - 4} ${midX - 9} ${casterY - 65} ${casterX - 3} ${casterY - 14} Z`} fill={`url(#${glow})`} style={{ transform: `translate(${casterX}px) scaleX(${sweep}) translate(${-casterX}px)`, transformOrigin: `${casterX}px ${casterY}px` }} />
      <path d={`M ${casterX - 15} ${casterY + 22} C ${midX + 5} ${targetY + 86} ${targetX + 43} ${targetY + 45} ${targetX + 3} ${targetY + 6} C ${targetX + 22} ${targetY + 24} ${midX - 22} ${targetY + 51} ${casterX + 8} ${casterY + 7} Z`} fill={`url(#${paint})`} style={{ transform: `translate(${casterX}px) scaleX(${sweep}) translate(${-casterX}px)`, transformOrigin: `${casterX}px ${casterY}px` }} />
      {[0, 1, 2, 3, 4].map((index) => {
        const t = clamp(sweep * 1.12 - index * 0.075);
        const x = casterX + (targetX - casterX) * t + (index - 2) * 5;
        const y = casterY + (targetY - casterY) * t - 10 - (index % 3) * 12;
        return <path key={index} className="five-star-vfx-mote" d={`M ${x} ${y - 8} C ${x - 7} ${y} ${x - 5} ${y + 8} ${x} ${y + 10} C ${x + 7} ${y + 5} ${x + 7} ${y} ${x} ${y - 8} Z`} fill={index % 2 ? "#e5fdff" : "#49d8ff"} />;
      })}
    </g>
  </>;
}

function BrannockMotion({ progress, casterX, casterY, casterFootY, targetX, targetY, paint }: MotionCoordinates) {
  const lift = range(progress, 0.06, 0.38);
  const slam = range(progress, 0.34, 0.68);
  const earth = envelope(progress, 0.11, 0.65, 0.9);
  const hammerX = casterX + (targetX - casterX) * slam;
  const hammerY = casterY - 78 + (targetY - casterY + 78) * slam;
  return <>
    <g opacity={earth * (0.45 + slam * 0.55)} className="five-star-vfx-earth-wake">
      <path d={`M ${casterX + 16} ${casterY - 27 - lift * 55} C ${casterX - 22} ${casterY - 121} ${hammerX + 52} ${hammerY - 42} ${hammerX} ${hammerY + 4} C ${hammerX + 26} ${hammerY - 2} ${casterX + 5} ${casterY - 45 - lift * 25} ${casterX + 16} ${casterY - 27 - lift * 55} Z`} fill={`url(#${paint})`} />
      <path d={`M ${casterX - 34} ${casterFootY - 3} C ${casterX - 18} ${casterFootY - 16} ${casterX + 25} ${casterFootY - 15} ${casterX + 36} ${casterFootY - 2} C ${casterX + 15} ${casterFootY - 8} ${casterX - 16} ${casterFootY - 8} ${casterX - 34} ${casterFootY - 3} Z`} fill="#9fd464" opacity={0.68} />
    </g>
    <g className="five-star-vfx-rock-burst" opacity={earth * slam}>
      <path d={`M ${targetX - 8} ${targetY + 16} L ${targetX - 45} ${targetY + 32} L ${targetX - 24} ${targetY + 7} L ${targetX - 54} ${targetY - 1} L ${targetX - 15} ${targetY - 4} L ${targetX} ${targetY - 35} L ${targetX + 9} ${targetY - 5} L ${targetX + 45} ${targetY - 12} L ${targetX + 20} ${targetY + 7} L ${targetX + 51} ${targetY + 31} L ${targetX + 8} ${targetY + 16} Z`} fill="#6d4929" opacity={0.82} />
      {[[-31, -8, -12, -34, -4, -2], [-7, -5, 2, -43, 12, -4], [16, -4, 34, -31, 32, 2], [-39, 10, -56, -10, -22, 7], [22, 10, 54, -6, 36, 15]].map((points, index) => {
        const [x1, y1, x2, y2, x3, y3] = points;
        return <polygon key={index} className="five-star-vfx-mote" points={`${targetX + x1},${targetY + y1 - slam * (8 + index * 3)} ${targetX + x2},${targetY + y2 - slam * (15 + index * 5)} ${targetX + x3},${targetY + y3 - slam * (9 + index * 2)}`} fill={index % 2 ? "#a5d26a" : "#c59c55"} />;
      })}
    </g>
  </>;
}

function ZephyraMotion({ progress, casterX, casterY, targetX, targetY, paint, glow }: MotionCoordinates) {
  const bowX = casterX - 25;
  const bowY = casterY - 25;
  const charge = envelope(progress, 0.13, 0.48, 0.82);
  const heldCharge = progress >= 0.41 && progress <= 0.72 ? 1 : charge;
  const travel = range(progress, 0.49, 0.72);
  const arrowX = bowX + (targetX - bowX) * travel;
  const arrowY = bowY + (targetY - bowY) * travel;
  const angle = Math.atan2(targetY - bowY, targetX - bowX) * 180 / Math.PI;
  const projectileOpacity = envelope(progress, 0.4, 0.62, 0.82);
  return <>
    <g className="five-star-vfx-lightning-charge" opacity={charge} style={{ transform: `translate(${bowX}px, ${bowY}px) rotate(${progress * 270}deg) scale(${0.72 + heldCharge * 0.45})` }}>
      <circle r={9 + heldCharge * 7} fill="#fffde0" />
      <path d="M-36-5 C-24-29 16-38 36-7 C15-20-15-20-29 2 Z" fill={`url(#${glow})`} />
      <path d="M35 6 C20 31-19 35-37 5 C-13 18 14 18 29-2 Z" fill={`url(#${paint})`} />
      <path d="M-7-44 L3-25 L-5-14 L12-17 L2 5 L25-22 L10-18 L18-34 L5-26 Z" fill="#fff47c" />
      <path d="M-39 12 L-18 6 L-13-7 L-5 4 L10-4 L-2 17 L-15 11 L-24 27 L-21 11 Z" fill="#a37bff" />
    </g>
    <g className="five-star-vfx-projectile" opacity={projectileOpacity} style={{ transform: `translate(${arrowX}px, ${arrowY}px) rotate(${angle}deg)`, transformOrigin: "0 0" }}>
      <path d="M-54-13 C-33-25 4-19 24 0 C4 19-33 25-54 13 C-36 10-19 5-3 0 C-19-5-36-10-54-13 Z" fill={`url(#${paint})`} opacity={0.72} />
      <path d="M-39-5 L22-5 L35 0 L22 5 L-39 5 L-53 0 Z" fill="#fffde8" />
      <path d="M36 0 L14-14 L20-3 L8 0 L20 3 L14 14 Z" fill="#fff27a" />
      <path d="M-38-19 L-25-8 L-12-22 L1-9 L15-20 L8-6 L25-9 L8 8 L-5 15 L1 6 L-17 16 L-12 6 L-34 13 L-24 3 Z" fill="#9e72ff" opacity={0.92} />
      <path d="M-43-11 L-29-4 L-16-15 L-5-5 L9-13 L4-3 L20-7 L6 4 L-8 10 L-3 3 L-20 11 L-14 2 L-36 8 L-27 0 Z" fill="#fff66d" />
    </g>
  </>;
}

function SolenneMotion({ progress, paint, glow }: MotionCoordinates) {
  const prayer = range(progress, 0.03, 0.37);
  const heal = envelope(progress, 0.09, 0.6, 0.93);
  const wave = range(progress, 0.21, 0.69);
  return <>
    {TEAM_FOOT_POINTS.map((point, index) => {
      const local = clamp(wave * 1.2 - index * 0.05);
      const radius = 14 + local * 11;
      return <g key={index} className="five-star-vfx-heal" opacity={heal * local * (index === 4 ? 0.82 : 1)} style={{ transform: `rotate(${(index % 2 ? -1 : 1) * local * 140}deg)`, transformOrigin: `${point.x}px ${point.y - 3}px` }}>
        <path d={`M ${point.x - radius} ${point.y - 2} C ${point.x - radius * .5} ${point.y - 14} ${point.x + radius * .55} ${point.y - 14} ${point.x + radius} ${point.y - 2} C ${point.x + radius * .3} ${point.y - 7} ${point.x - radius * .35} ${point.y - 7} ${point.x - radius} ${point.y - 2} Z`} fill={index % 2 ? `url(#${glow})` : `url(#${paint})`} />
        <path d={`M ${point.x + radius} ${point.y - 2} C ${point.x + radius * .4} ${point.y + 8} ${point.x - radius * .55} ${point.y + 8} ${point.x - radius} ${point.y - 2} C ${point.x - radius * .28} ${point.y + 3} ${point.x + radius * .35} ${point.y + 3} ${point.x + radius} ${point.y - 2} Z`} fill="#fffdf0" opacity={0.78} />
        {[0, 1, 2].map((petal) => <path key={petal} d={`M ${point.x + (petal - 1) * 7} ${point.y - 9} C ${point.x - 7 + (petal - 1) * 7} ${point.y - 22 - local * 14} ${point.x + 8 + (petal - 1) * 7} ${point.y - 29 - local * 16} ${point.x + (petal - 1) * 7} ${point.y - 39 - local * 13} C ${point.x + 12 + (petal - 1) * 7} ${point.y - 24} ${point.x + 7 + (petal - 1) * 7} ${point.y - 14} ${point.x + (petal - 1) * 7} ${point.y - 9} Z`} fill={petal === 1 ? "#fffbe4" : "#f5bce7"} opacity={0.62 + petal * 0.1} />)}
      </g>;
    })}
    <g opacity={heal * prayer} className="five-star-vfx-sanctuary" style={{ transform: `rotate(${wave * 130}deg)`, transformOrigin: "340px 210px" }}>
      <path d="M293 209 C304 172 354 160 386 190 C358 177 321 183 306 217 C326 198 356 197 375 211 C345 199 315 210 293 209 Z" fill={`url(#${paint})`} />
      <path d="M387 216 C367 249 317 250 292 219 C320 237 355 234 374 205 C350 221 323 218 306 202 C332 218 362 210 387 216 Z" fill={`url(#${glow})`} />
      <path d="M338 170 C329 190 329 207 340 224 C351 205 350 187 338 170 Z" fill="#fffdf0" opacity={0.74} />
    </g>
  </>;
}

function NyxMotion({ progress, casterX, casterY, targetX, targetY, paint, glow }: MotionCoordinates) {
  const charge = envelope(progress, 0.08, 0.47, 0.75);
  const sweep = range(progress, 0.4, 0.71);
  const close = range(progress, 0.7, 0.92);
  const orbX = casterX - 17;
  const orbY = casterY - 48;
  const midX = (casterX + targetX) / 2;
  return <>
    <g className="five-star-vfx-void-charge" opacity={charge} style={{ transform: `rotate(${-progress * 310}deg)`, transformOrigin: `${orbX}px ${orbY}px` }}>
      <circle cx={orbX} cy={orbY} r={10 + charge * 10} fill="#17051f" />
      <path d={`M ${orbX - 42} ${orbY} C ${orbX - 27} ${orbY - 29} ${orbX + 18} ${orbY - 35} ${orbX + 40} ${orbY - 3} C ${orbX + 17} ${orbY - 17} ${orbX - 20} ${orbY - 12} ${orbX - 42} ${orbY} Z`} fill={`url(#${paint})`} />
      <path d={`M ${orbX + 38} ${orbY + 7} C ${orbX + 18} ${orbY + 36} ${orbX - 24} ${orbY + 31} ${orbX - 39} ${orbY + 5} C ${orbX - 13} ${orbY + 20} ${orbX + 15} ${orbY + 18} ${orbX + 38} ${orbY + 7} Z`} fill={`url(#${glow})`} opacity={0.8} />
    </g>
    <g opacity={(charge * 0.45 + sweep) * (1 - close * 0.9)} className="five-star-vfx-void-sweep">
      <path d={`M ${casterX - 25} ${casterY - 78} C ${midX - 24} ${casterY - 151} ${targetX + 63} ${targetY - 64} ${targetX + 7} ${targetY + 1} C ${targetX + 31} ${targetY - 14} ${midX + 15} ${casterY - 91} ${casterX - 8} ${casterY - 54} C ${midX + 23} ${casterY + 17} ${targetX + 22} ${targetY + 43} ${targetX + 7} ${targetY + 1} C ${targetX + 48} ${targetY + 59} ${midX - 33} ${casterY + 35} ${casterX - 25} ${casterY - 78} Z`} fill={`url(#${paint})`} style={{ transform: `translate(${casterX}px) scaleX(${sweep}) translate(${-casterX}px)`, transformOrigin: `${casterX}px ${casterY}px` }} />
      <path d={`M ${casterX - 16} ${casterY - 67} C ${midX} ${casterY - 125} ${targetX + 35} ${targetY - 38} ${targetX + 2} ${targetY} C ${targetX + 22} ${targetY - 14} ${midX + 16} ${casterY - 83} ${casterX - 2} ${casterY - 54} Z`} fill="#f0d1ff" opacity={0.72} style={{ transform: `translate(${casterX}px) scaleX(${sweep}) translate(${-casterX}px)`, transformOrigin: `${casterX}px ${casterY}px` }} />
    </g>
    <g opacity={sweep * (1 - close * 0.82)} className="five-star-vfx-rift" style={{ transform: `scaleX(${1 - close * 0.78})`, transformOrigin: `${targetX}px ${targetY}px` }}>
      <ellipse cx={targetX} cy={targetY} rx={21 + sweep * 25} ry={38 + sweep * 18} fill="#110218" />
      <path d={`M ${targetX} ${targetY - 54} C ${targetX - 22} ${targetY - 32} ${targetX - 18} ${targetY + 31} ${targetX} ${targetY + 54} C ${targetX - 7} ${targetY + 19} ${targetX - 8} ${targetY - 18} ${targetX} ${targetY - 54} Z`} fill={`url(#${glow})`} />
      <path d={`M ${targetX + 5} ${targetY - 49} C ${targetX + 25} ${targetY - 23} ${targetX + 20} ${targetY + 31} ${targetX + 4} ${targetY + 51} C ${targetX + 11} ${targetY + 18} ${targetX + 12} ${targetY - 15} ${targetX + 5} ${targetY - 49} Z`} fill="#6f239f" opacity={0.72} />
    </g>
  </>;
}

export function FiveStarBurstVfx({ instanceId, unitId, frame, frameCount, stage, volley, casterX, casterY, casterFootY, targetX, targetY, reducedEffects = false }: BurstMotionProps) {
  const authoredProgress = clamp(frame / Math.max(1, frameCount - 1));
  // The first sprite drawings are intentionally restrained anticipation poses,
  // but the effect still needs to read against bright field stages. Give every
  // active combat phase a small visibility floor, while recovery continues to
  // use the authored end frames so the effect visibly regresses to nothing.
  const phaseFloor: Partial<Record<FiveStarBurstStage, number>> = {
    approach: 0.08,
    windup: 0.13,
    release: 0.24,
    flight: 0.38,
    impact: 0.52,
    hitstop: 0.56,
  };
  const progress = stage === "recover" || stage === "anchored" || stage === "return"
    ? authoredProgress
    : Math.max(authoredProgress, phaseFloor[stage] ?? 0);
  const colors = ELEMENT_COLORS[unitId];
  const opacity = stage === "anchored" || stage === "return" ? 0 : reducedEffects ? 0.48 : 1;
  const prefix = `burst-${instanceId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const motionProps: MotionCoordinates = { progress, casterX, casterY, casterFootY, targetX, targetY, paint: `${prefix}-paint`, glow: `${prefix}-glow` };
  return <div
    className={`five-star-burst-vfx five-star-burst-${unitId} burst-stage-${stage}`}
    data-burst-vfx-instance={instanceId}
    data-burst-vfx-unit={unitId}
    data-burst-vfx-frame={frame + 1}
    data-burst-vfx-volley={volley + 1}
    data-burst-vfx-progress={progress.toFixed(3)}
    style={{
      "--burst-vfx-core": colors.core,
      "--burst-vfx-primary": colors.primary,
      "--burst-vfx-secondary": colors.secondary,
      opacity,
    } as CSSProperties}
    aria-hidden="true"
  >
    <svg viewBox="0 0 430 355" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${prefix}-paint`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.core} stopOpacity=".96" />
          <stop offset=".43" stopColor={colors.primary} stopOpacity=".9" />
          <stop offset="1" stopColor={colors.secondary} stopOpacity=".28" />
        </linearGradient>
        <radialGradient id={`${prefix}-glow`} cx="50%" cy="50%" r="58%">
          <stop offset="0" stopColor={colors.core} stopOpacity="1" />
          <stop offset=".42" stopColor={colors.primary} stopOpacity=".86" />
          <stop offset="1" stopColor={colors.secondary} stopOpacity=".12" />
        </radialGradient>
      </defs>
      {unitId === "kael" && <KaelMotion {...motionProps} />}
      {unitId === "lyra" && <LyraMotion {...motionProps} />}
      {unitId === "brannock" && <BrannockMotion {...motionProps} />}
      {unitId === "zephyra" && <ZephyraMotion {...motionProps} />}
      {unitId === "solenne" && <SolenneMotion {...motionProps} />}
      {unitId === "nyx" && <NyxMotion {...motionProps} />}
    </svg>
  </div>;
}

function ImpactArtwork({ unitId, finisher }: { unitId: BattleUnitId; finisher: boolean }) {
  if (unitId === "kael") return <>
    <path className="five-star-impact-shape" d="M13 106 C31 57 76 15 121 12 C91 34 52 69 34 112 C48 86 83 50 110 32 C81 75 49 108 13 106Z" />
    <path className="five-star-impact-hot" d="M29 101 C48 65 74 40 104 25 C77 52 59 79 46 109Z" />
    {[0, 1, 2, 3, 4].map((index) => <path className="five-star-impact-particle" key={index} d={`M ${36 + index * 16} ${91 - index * 13} c -7 -9 2 -17 5 -25 c 8 12 8 20 -5 25 Z`} style={{ animationDelay: `${index * 28}ms` }} />)}
  </>;
  if (unitId === "lyra") return <>
    <path className="five-star-impact-shape" d="M8 73 C29 23 85 10 122 55 C90 38 52 47 31 76 C57 54 95 58 121 85 C79 112 31 105 8 73Z" />
    <path className="five-star-impact-hot" d="M22 78 C48 42 86 39 113 61 C82 50 52 62 35 89Z" />
    {[0, 1, 2, 3, 4, 5].map((index) => <path className="five-star-impact-particle" key={index} d={`M ${25 + index * 16} ${88 - (index % 3) * 25} c -7 8 -4 16 3 18 c 8 -5 7 -12 -3 -18 Z`} style={{ animationDelay: `${index * 22}ms` }} />)}
  </>;
  if (unitId === "brannock") return <>
    <path className="five-star-impact-shape" d="M65 13 L78 65 L118 101 L83 90 L90 124 L65 91 L40 124 L47 89 L10 104 L52 64Z" />
    <path className="five-star-impact-hot" d="M65 27 L71 70 L95 96 L69 83 L65 111 L59 82 L34 97 L57 69Z" />
    {[0, 1, 2, 3, 4].map((index) => <polygon className="five-star-impact-particle" key={index} points={`${24 + index * 19},${92 - (index % 2) * 18} ${31 + index * 18},${75 - (index % 3) * 10} ${38 + index * 17},${99 - (index % 2) * 13}`} style={{ animationDelay: `${index * 30}ms` }} />)}
  </>;
  if (unitId === "zephyra") return <>
    <path className="five-star-impact-shape" d="M64 3 L73 46 L91 18 L86 51 L126 37 L91 62 L126 74 L87 72 L105 112 L75 82 L64 128 L55 83 L30 114 L43 75 L4 86 L40 63 L5 47 L45 53 L25 16 L55 46Z" />
    <path className="five-star-impact-hot" d="M64 28 L70 55 L88 47 L77 64 L96 71 L73 72 L64 101 L56 74 L36 81 L51 64 L34 55 L57 56Z" />
  </>;
  if (unitId === "nyx") return <>
    <path className="five-star-impact-shape" d="M12 106 C28 43 72 9 121 30 C82 35 49 64 35 100 C61 77 94 70 119 80 C81 110 43 119 12 106Z" />
    <ellipse className="five-star-impact-void" cx="72" cy="67" rx={finisher ? 29 : 21} ry={finisher ? 45 : 34} />
    <path className="five-star-impact-hot" d="M70 23 C58 48 59 87 72 112 C68 78 68 53 70 23Z" />
  </>;
  return null;
}

export function FiveStarBurstImpactVfx({ instanceId, unitId, hitIndex, finisher, targetX, targetY, angle, reducedEffects = false }: BurstImpactProps) {
  if (unitId === "solenne") return null;
  const colors = ELEMENT_COLORS[unitId];
  return <div
    className={`five-star-burst-impact five-star-impact-${unitId} ${finisher ? "five-star-impact-finisher" : ""}`}
    data-burst-impact-instance={instanceId}
    data-burst-impact-hit={hitIndex}
    style={{
      left: `${targetX - 65}px`,
      top: `${targetY - 65}px`,
      "--burst-vfx-core": colors.core,
      "--burst-vfx-primary": colors.primary,
      "--burst-vfx-secondary": colors.secondary,
      "--burst-impact-angle": `${angle}deg`,
      opacity: reducedEffects ? 0.45 : 1,
    } as CSSProperties}
    aria-hidden="true"
  >
    <svg viewBox="0 0 130 130">
      <ImpactArtwork unitId={unitId} finisher={finisher} />
    </svg>
  </div>;
}
