"use client";

/* eslint-disable @next/next/no-img-element, react-hooks/purity, react-hooks/refs */

import {
  ArrowUp,
  Castle,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Droplets,
  Flame,
  FlaskConical,
  Gem,
  Gift,
  Hammer,
  Heart,
  Home,
  Leaf,
  Lock,
  Moon,
  PackageOpen,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Settings2,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  BATTLE_CONTACT_DROP_Y,
  BATTLE_CONTACT_GAP_X,
  getEnemyStaggerProfile,
  getWeaponContactOffset,
  getWeaponContactPoint,
  type BattleUnitId,
} from "../game/battle-choreography";
import { getBattleDuration, getBattleTimeScale, type BattleSpeed } from "../game/battle-timing";
import {
  buildActionTimeline,
  getNormalCadence,
  getNormalCastSequence,
  type ActionTimeline,
} from "../game/attack-timeline";
import { AnimatedBattleStage, BurstIntroOverlay } from "./components/BattleRemotion";

type Screen =
  | "home"
  | "quests"
  | "units"
  | "squad"
  | "inventory"
  | "modes"
  | "summon"
  | "summon-chamber"
  | "summon-reveal"
  | "town"
  | "battle"
  | "story"
  | "arena"
  | "missions"
  | "shop";
type ElementKey = "fire" | "water" | "earth" | "thunder" | "light" | "dark";
type Nature = "Valiant" | "Stalwart" | "Fierce" | "Mystic" | "Vital";
export type StarTier = 2 | 3 | 4 | 5;
type BattleMode = "story" | "rift" | "trial" | "tower" | "hunt" | "raid" | "vault";
export type CrystalKind = "burst" | "heart" | "gold" | "material";
export type AttackScope = "single" | "all";
export type AttackStage = "approach" | "windup" | "release" | "flight" | "impact" | "hitstop" | "recover" | "anchored" | "return";

const CRITICAL_CHANCE = 1 / 32;
const CRITICAL_DAMAGE_MULTIPLIER = 1.5;
const SPARK_DAMAGE_MULTIPLIER = 1.25;

export type Unit = {
  id: BattleUnitId;
  name: string;
  title: string;
  element: ElementKey;
  rarity: number;
  nature: Nature;
  role: string;
  hp: number;
  atk: number;
  def: number;
  rec: number;
  burstName: string;
  burstHits: number;
  attackScope: AttackScope;
  burstScope: AttackScope;
  burst: string;
  leader: string;
  portrait?: string;
  keyArt: string;
  sprites: { idleA: string; idleB: string; attack: string[]; burst: string[] };
  glyph: string;
  cost: number;
  formTitles: Record<StarTier, string>;
};

export type BattleSpriteSet = { idle: string[]; attack: string[]; burst: string[] };

const PROGRESSIVE_BURST_FRAME_COUNTS: Record<StarTier, Record<BattleUnitId, number>> = {
  2: { kael: 6, lyra: 6, brannock: 6, zephyra: 6, solenne: 6, nyx: 6 },
  3: { kael: 8, lyra: 8, brannock: 8, zephyra: 8, solenne: 8, nyx: 8 },
  4: { kael: 12, lyra: 12, brannock: 12, zephyra: 12, solenne: 12, nyx: 12 },
  5: { kael: 16, lyra: 16, brannock: 14, zephyra: 20, solenne: 14, nyx: 22 },
};

type UnitStarProfile = {
  attackName: string;
  burstName: string;
  attackScope: AttackScope;
  burstScope: AttackScope;
  attackMultiplier: number;
  burstMultiplier: number;
  burstHits: number;
  gaugeGain: number;
  healRatio: number;
  cleanse: boolean;
  burstBuff: string;
  burstDescription: string;
  leader: string;
  burstDoesDamage: boolean;
  maxLevel: number;
  statMultiplier: number;
  statGrowth: Record<"hp" | "atk" | "def" | "rec", number>;
  ascension: { seals: number; cores: number };
};

export type UnitCombatProfile = {
  attackName: string;
  burstName: string;
  attackScope: AttackScope;
  burstScope: AttackScope;
  attackMultiplier: number;
  burstMultiplier: number;
  burstHits: number;
  gaugeGain: number;
  healRatio: number;
  cleanse: boolean;
  burstBuff: string;
  burstDescription: string;
  leader: string;
  burstDoesDamage: boolean;
};

export type NormalAttackBeat = {
  frame: number;
  multiplier: number;
  pose: number;
  tick: number;
};

type Enemy = {
  id: string;
  name: string;
  hp: number;
  element: ElementKey;
  sprite: string;
  attack: number;
  boss?: boolean;
  skill?: string;
};

type EnemyInstance = {
  instanceId: string;
  enemyId: string;
  hp: number;
  maxHp: number;
  ailments: string[];
};

export type Quest = {
  id: number;
  chapter: number;
  name: string;
  location: string;
  stage: string;
  energy: number;
  element: ElementKey;
  reward: number;
  region: string;
  mode?: BattleMode;
  recommended: number;
  intro: { speaker: string; text: string }[];
  waves: { enemies: string[] }[];
};

export type SaveState = {
  level: number;
  xp: number;
  gold: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  arenaOrbs: number;
  arenaRank: number;
  lastArenaAt: number;
  owned: string[];
  party: string[];
  unitLevels: Record<string, number>;
  unitStars: Record<string, StarTier>;
  unitXp: Record<string, number>;
  burstLevels: Record<string, number>;
  completed: number[];
  unlockedStage: number;
  potions: number;
  forgeLevel: number;
  wellLevel: number;
  groveLevel: number;
  dailyClaimed: string;
  lastEnergyAt: number;
  materials: Record<string, number>;
  relics: string[];
  equippedRelics: Record<string, string>;
  covenantPoints: number;
  summonPity: number;
  summonHistory: string[];
  squads: string[][];
  activeSquad: number;
  wardenCapacity: number;
  townResources: Record<string, number>;
  lastTownGather: string;
  eventTokens: number;
  towerFloor: number;
  shardHuntScore: number;
  titles: string[];
  selectedTitle: string;
  achievements: string[];
};

export type BattleState = {
  questId: number;
  wave: number;
  enemies: EnemyInstance[];
  targetEnemyId: string;
  turn: number;
  combo: number;
  mode: BattleMode;
  loot: { gold: number; materials: number; hearts: number; crystals: number };
  telegraph: { label: string; turns: number } | null;
  party: { id: string; hp: number; gauge: number; acted: boolean; guarding: boolean; buffs: string[]; ailment: string }[];
  message: string;
};

type CombatFx = {
  phase: "opening" | "ready" | "attacking" | "burst" | "guarding" | "enemy" | "wave";
  serial: number;
  activeUnitId: string;
  activeEnemyId: string;
  targetUnitId: string;
  targetEnemyId: string;
  damage: number;
  hits: number;
  hitFrame: number;
  spark: boolean;
  weakness: boolean;
  label: string;
};

export type AttackFx = {
  id: string;
  unitId: BattleUnitId;
  targetEnemyId: string;
  scope: AttackScope;
  phase: "attack" | "burst-intro" | "burst";
  stage: AttackStage;
  frame: number;
  volley: number;
  hits: number;
  label: string;
  contactX: number;
  contactY: number;
};

type PendingSparkImpact = {
  unitId: string;
  targetIds: string[];
  resolve: (sparkTargets: Set<string>) => void;
};

export type DamageFx = {
  id: string;
  unitId: BattleUnitId;
  targetEnemyId: string;
  damage: number;
  spark: boolean;
  critical: boolean;
  weakness: boolean;
  hit: number;
  burst: boolean;
  frame: number;
  finisher: boolean;
};

export type CrystalFx = {
  id: string;
  targetEnemyId: string;
  unitId: string;
  kind: CrystalKind;
};

type SummonResult = { unit: Unit; stars: StarTier; duplicate: boolean };

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type MusicTrackKey =
  | "falling-apart"
  | "title-theme"
  | "silent-forest"
  | "battle-one"
  | "definitely-our-town"
  | "victory"
  | "port-town"
  | "shop"
  | "battle-two"
  | "lost-shrine"
  | "peaceful-night"
  | "the-journey";

type MusicTrack = {
  title: string;
  src: string;
  volume: number;
  loopStart: number;
  loopEnd?: number;
};

type ActiveMusic = {
  key: MusicTrackKey;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type MenuMusicEngine = {
  context: AudioContext;
  master: GainNode;
  cache: Map<MusicTrackKey, AudioBuffer>;
  active: ActiveMusic | null;
  requestId: number;
};

type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  vibration: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  reducedEffects: boolean;
};

export type SfxKind = "tap" | "hit" | "spark" | "burst" | "crystal" | "warning" | "victory" | "evolve" | "guard" | "buy" | "equip" | "summon" | "denied";

const SFX_FILES: Record<SfxKind, string> = {
  tap: "/audio/sfx/ui-tap.wav",
  hit: "/audio/sfx/hit.wav",
  spark: "/audio/sfx/spark.wav",
  burst: "/audio/sfx/burst.wav",
  crystal: "/audio/sfx/crystal.wav",
  warning: "/audio/sfx/warning.wav",
  victory: "/audio/sfx/victory.wav",
  evolve: "/audio/sfx/evolve.wav",
  guard: "/audio/sfx/guard.wav",
  buy: "/audio/sfx/buy.wav",
  equip: "/audio/sfx/equip.wav",
  summon: "/audio/sfx/summon.wav",
  denied: "/audio/sfx/denied.wav",
};

const SFX_MIX: Record<SfxKind, number> = {
  tap: 0.42,
  hit: 0.6,
  spark: 0.55,
  burst: 0.5,
  crystal: 0.55,
  warning: 0.45,
  victory: 0.6,
  evolve: 0.55,
  guard: 0.55,
  buy: 0.5,
  equip: 0.5,
  summon: 0.55,
  denied: 0.45,
};

const MUSIC_TRACKS: Record<MusicTrackKey, MusicTrack> = {
  "falling-apart": { title: "Falling Apart", src: "/audio/falling-apart.mp3", volume: 0.58, loopStart: 11.522, loopEnd: 72.96 },
  "title-theme": { title: "Title Theme", src: "/audio/title-theme.mp3", volume: 0.6, loopStart: 11.522, loopEnd: 72.96 },
  "silent-forest": { title: "Silent Forest", src: "/audio/silent-forest.mp3", volume: 0.58, loopStart: 0, loopEnd: 85.807 },
  "battle-one": { title: "Battle 1", src: "/audio/battle-one.mp3", volume: 0.54, loopStart: 10.76, loopEnd: 73.368 },
  "definitely-our-town": { title: "Definitely Our Town", src: "/audio/definitely-our-town.mp3", volume: 0.58, loopStart: 23.106, loopEnd: 97.588 },
  victory: { title: "Victory!", src: "/audio/victory.mp3", volume: 0.62, loopStart: 8.501, loopEnd: 40.5 },
  "port-town": { title: "Port Town", src: "/audio/port-town.mp3", volume: 0.57, loopStart: 2.135, loopEnd: 78.935 },
  shop: { title: "Shop", src: "/audio/shop.mp3", volume: 0.56, loopStart: 0, loopEnd: 53.615 },
  "battle-two": { title: "Battle 2", src: "/audio/battle-two.mp3", volume: 0.53, loopStart: 0.63, loopEnd: 63.908 },
  "lost-shrine": { title: "Lost Shrine", src: "/audio/lost-shrine.mp3", volume: 0.57, loopStart: 0, loopEnd: 92.957 },
  "peaceful-night": { title: "Peaceful Night", src: "/audio/peaceful-night.mp3", volume: 0.55, loopStart: 0 },
  "the-journey": { title: "The Journey", src: "/audio/the-journey.mp3", volume: 0.59, loopStart: 11.522, loopEnd: 72.96 },
};

const DEFAULT_GAME_SETTINGS: GameSettings = {
  musicVolume: 80,
  sfxVolume: 78,
  vibration: true,
  screenShake: true,
  damageNumbers: true,
  reducedEffects: false,
};

const ENERGY_REGEN_MS = 2 * 60 * 1000;
const ARENA_REGEN_MS = 15 * 60 * 1000;
const MAX_ARENA_ORBS = 5;
// Placeholder hold while there's no summon animation to fill this beat yet -
// swap this out for a real animation later. The bloom's CSS animation
// duration is driven by this same constant so the white-out finishes right
// as the timer fires.
const GATE_HOLD_MS = 4500;
const GATE_BLOOM_FADE_MS = 550;
// The charge-up glow's colour previews the rarity about to be revealed.
const GATE_BLOOM_COLORS: Record<number, { core: string; mid: string; edge: string }> = {
  2: { core: "#ffffff", mid: "#e5edf2", edge: "#9aaab4" },
  3: { core: "#eef7ff", mid: "#8fc7ff", edge: "#2f7dff" },
  4: { core: "#f6ecff", mid: "#c79bff", edge: "#8a3dff" },
  5: { core: "#ffefe9", mid: "#ff8f77", edge: "#b3161f" },
};
const GATE_BLOOM_DEFAULT = { core: "#ffffff", mid: "#fdfaff", edge: "#e6d9ff" };
// The ambient corona around the OUTSIDE of the whole gate silhouette
// (.chamber-gate's own pulsing drop-shadow, independent of the void/gems
// inside it) fades to this same rarity colour too, so the entire portal -
// not just its interior - reads as charging toward that colour. lo/hi are
// the two ends of the existing breathe-in/breathe-out pulse.
const GATE_GLOW_COLORS: Record<number, { lo: string; hi: string }> = {
  2: { lo: "#dce8ee38", hi: "#f7fbff78" },
  3: { lo: "#4f90ff44", hi: "#4f90ff8c" },
  4: { lo: "#9a54ff44", hi: "#9a54ff8c" },
  5: { lo: "#ff474744", hi: "#ff47478c" },
};
const GATE_GLOW_DEFAULT = { lo: "#7b6bff44", hi: "#7b6bff8c" };
// The portal's own inner glow (.gate-void-glow) fades from its resting
// purple to this same rarity colour over GATE_HOLD_MS, so the void itself
// visibly shifts hue as it charges rather than just sitting behind a
// colour that changes around it. Alpha suffixes match the resting values
// (5c/30) so only the hue changes, not the overall glow strength.
const GATE_VOID_COLORS: Record<number, { core: string; mid: string }> = {
  2: { core: "#f7fbff5c", mid: "#8fa0aa30" },
  3: { core: "#9ecbff5c", mid: "#2f6fd930" },
  4: { core: "#caa8ff5c", mid: "#7443a930" },
  5: { core: "#ff9d8f5c", mid: "#b3161f30" },
};
const GATE_VOID_DEFAULT = { core: "#caa8ff5c", mid: "#7443a930" };
// gate-void-swirl.webp is a standalone sprite cut from the void's own nebula
// + crystal-crown artwork (see v56-source-changes/README.md), painted over
// the same baked texture in gate-structure.webp so it can carry its own
// recolourable filter instead of fighting the structure image's fixed
// pixels. All four filter lists share the same hue-rotate/saturate/
// brightness function shape (just different parameters) so the browser can
// interpolate between them smoothly rather than snapping.
const GATE_VOID_SWIRL = { width: 44.24, height: 41.328 };
const GATE_VOID_SWIRL_IDLE = "hue-rotate(0deg) saturate(1) brightness(1)";
const GATE_VOID_SWIRL_FILTERS: Record<number, string> = {
  2: "hue-rotate(0deg) saturate(0.12) brightness(1.6)",
  3: "hue-rotate(-48deg) saturate(1.1) brightness(1)",
  4: "hue-rotate(4deg) saturate(1.05) brightness(1)",
  5: "hue-rotate(99deg) saturate(1.15) brightness(1.05)",
};
const GATE_VOID_SWIRL_FALLBACK = "hue-rotate(0deg) saturate(0.12) brightness(1.6)";
// The 7 floating gem sprites (cut from the same source as the void's own
// crystal crown - see GATE_FLOATERS below) sit around 250deg, close enough
// to the void's own base hue that the same hue-rotate treatment reads
// consistently. drop-shadow is folded into every entry (not just left in
// the stylesheet) so the whole filter list transitions as one unit - a
// transition can't blend an inline filter against a separate stylesheet
// filter underneath it. The sprites themselves had their baked ambient
// halo masked back to the crystal's own bright pixels (see
// v56-source-changes/README.md), so a small 3px drop-shadow reads as a
// tight glow instead of the colour bleeding out past the gem shape.
const GATE_GEM_FILTER_IDLE = "hue-rotate(0deg) saturate(1) brightness(1) drop-shadow(0 0 3px #9b6bf7a0)";
const GATE_GEM_FILTERS: Record<number, string> = {
  2: "hue-rotate(0deg) saturate(0.12) brightness(1.6) drop-shadow(0 0 3px #ffffffa0)",
  3: "hue-rotate(-37deg) saturate(1.1) brightness(1) drop-shadow(0 0 3px #6bb0f7a0)",
  4: "hue-rotate(15deg) saturate(1.05) brightness(1) drop-shadow(0 0 3px #9b6bf7a0)",
  5: "hue-rotate(108deg) saturate(1.15) brightness(1.05) drop-shadow(0 0 3px #ff5f5fa0)",
};
const GATE_GEM_FILTER_FALLBACK = "hue-rotate(0deg) saturate(0.12) brightness(1.6) drop-shadow(0 0 3px #ffffffa0)";
// Layout for the gate artwork: the void's position within /summon/gate-structure.webp,
// and the 7 free-floating gem sprites cut from the same source (see
// v56-source-changes/README.md for how these were produced).
const GATE_VOID = { left: 48.68, top: 40.36, width: 31.6, height: 29.52 };
const GATE_FLOATERS = [
  { name: "top", left: 40.98, top: 6.7, width: 4.19 },
  { name: "upper-left", left: 22.91, top: 16.42, width: 5.92 },
  { name: "upper-right", left: 77.14, top: 16.51, width: 6.01 },
  { name: "mid-left", left: 16.62, top: 26.66, width: 4.28 },
  { name: "mid-right", left: 83.47, top: 26.71, width: 4.46 },
  { name: "lower-right", left: 88.02, top: 42.41, width: 4.64 },
  { name: "lower-left", left: 12.16, top: 42.45, width: 4.46 },
];

function formatRegenTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function regenRemaining(now: number, lastAt: number, period: number, current: number, max: number) {
  if (current >= max) return 0;
  const elapsed = Math.max(0, now - lastAt);
  const remainder = elapsed % period;
  return remainder === 0 && elapsed > 0 ? period : period - remainder;
}

const ELEMENTS: Record<
  ElementKey,
  { label: string; Icon: LucideIcon; color: string; strong: ElementKey }
> = {
  fire: { label: "Flame", Icon: Flame, color: "#ff654f", strong: "earth" },
  water: { label: "Tide", Icon: Droplets, color: "#50bfff", strong: "fire" },
  earth: { label: "Grove", Icon: Leaf, color: "#79d971", strong: "thunder" },
  thunder: { label: "Storm", Icon: Zap, color: "#f8ce55", strong: "water" },
  light: { label: "Radiance", Icon: Sun, color: "#ffeaa1", strong: "dark" },
  dark: { label: "Umbral", Icon: Moon, color: "#b591ff", strong: "light" },
};

const ELEMENT_FILTERS: (ElementKey | "all")[] = ["all", "fire", "water", "earth", "thunder", "light", "dark"];

const UNITS: Unit[] = [
  {
    id: "kael",
    name: "Kael",
    title: "Ember Vanguard",
    element: "fire",
    rarity: 5,
    nature: "Fierce",
    role: "Breaker",
    hp: 3820,
    atk: 1640,
    def: 1080,
    rec: 820,
    burstName: "Cinderfall",
    burstHits: 12,
    attackScope: "single",
    burstScope: "single",
    burst: "12-hit Flame attack on one foe and raises allies’ ATK for 2 turns.",
    leader: "Blazing Oath — Flame allies gain 25% ATK and 10% critical chance.",
    portrait: "/units/kael.webp",
    keyArt: "/units/key-art/kael.webp",
    sprites: {
      idleA: "/sprites/units/kael-idle-a.webp",
      idleB: "/sprites/units/kael-idle-b.webp",
      attack: Array.from({ length: 5 }, (_, index) => `/sprites/units/kael-attack-${index + 1}.webp`),
      burst: Array.from({ length: 12 }, (_, index) => `/sprites/units/burst/kael-burst-${index + 1}.webp`),
    },
    glyph: "K",
    cost: 22,
    formTitles: { 2: "Coalbrand Recruit", 3: "Ember Cadet", 4: "Cinder Knight", 5: "Ember Vanguard" },
  },
  {
    id: "lyra",
    name: "Lyra",
    title: "Tide Dancer",
    element: "water",
    rarity: 5,
    nature: "Mystic",
    role: "Support",
    hp: 3540,
    atk: 1410,
    def: 1040,
    rec: 1250,
    burstName: "Sovereign Moonsea",
    burstHits: 12,
    attackScope: "single",
    burstScope: "all",
    burst: "12-hit sovereign Tide attack, heals the squad, cleanses ailments, and grants Tideward.",
    leader: "Flowing Grace — all allies gain 18% HP and recovery crystals heal more.",
    portrait: "/units/lyra.webp",
    keyArt: "/units/key-art/lyra.webp",
    sprites: {
      idleA: "/sprites/units/lyra-idle-a.webp",
      idleB: "/sprites/units/lyra-idle-b.webp",
      attack: Array.from({ length: 6 }, (_, index) => `/sprites/units/lyra-attack-${index + 1}.webp`),
      burst: Array.from({ length: 10 }, (_, index) => `/sprites/units/burst/lyra-burst-${index + 1}.webp`),
    },
    glyph: "L",
    cost: 21,
    formTitles: { 2: "Brookblade Novice", 3: "Tide Initiate", 4: "Moonwater Adept", 5: "Tide Dancer" },
  },
  {
    id: "brannock",
    name: "Brannock",
    title: "Verdant Bulwark",
    element: "earth",
    rarity: 5,
    nature: "Stalwart",
    role: "Guardian",
    hp: 4510,
    atk: 1180,
    def: 1690,
    rec: 690,
    burstName: "Worldroot Aegis",
    burstHits: 8,
    attackScope: "single",
    burstScope: "single",
    burst: "8-hit Grove attack and reduces incoming damage for 2 turns.",
    leader: "Ancient Rampart — all allies gain 22% DEF and 15% max HP.",
    portrait: "/units/brannock.webp",
    keyArt: "/units/key-art/brannock.webp",
    sprites: {
      idleA: "/sprites/units/brannock-idle-a.webp",
      idleB: "/sprites/units/brannock-idle-b.webp",
      attack: Array.from({ length: 3 }, (_, index) => `/sprites/units/brannock-attack-${index + 1}.webp`),
      burst: Array.from({ length: 8 }, (_, index) => `/sprites/units/burst/brannock-burst-${index + 1}.webp`),
    },
    glyph: "B",
    cost: 23,
    formTitles: { 2: "Sproutshield", 3: "Grove Guard", 4: "Stonebark Warden", 5: "Verdant Bulwark" },
  },
  {
    id: "zephyra",
    name: "Zephyra",
    title: "Skybolt Huntress",
    element: "thunder",
    rarity: 5,
    nature: "Fierce",
    role: "Striker",
    hp: 3190,
    atk: 1580,
    def: 890,
    rec: 970,
    burstName: "Tempest Volley",
    burstHits: 16,
    attackScope: "single",
    burstScope: "single",
    burst: "16-hit Storm attack with a high Spark window.",
    leader: "Hunter’s Tempo — Spark hits fill the squad’s Burst gauges faster.",
    portrait: "/units/zephyra.webp",
    keyArt: "/units/key-art/zephyra.webp",
    sprites: {
      idleA: "/sprites/units/zephyra-idle-a.webp",
      idleB: "/sprites/units/zephyra-idle-b.webp",
      attack: Array.from({ length: 8 }, (_, index) => `/sprites/units/zephyra-attack-${index + 1}.webp`),
      burst: Array.from({ length: 16 }, (_, index) => `/sprites/units/burst/zephyra-burst-${index + 1}.webp`),
    },
    glyph: "Z",
    cost: 22,
    formTitles: { 2: "Breezebow Recruit", 3: "Galebow Scout", 4: "Tempest Ranger", 5: "Skybreak Huntress" },
  },
  {
    id: "solenne",
    name: "Solenne",
    title: "Dawn Cantor",
    element: "light",
    rarity: 5,
    nature: "Vital",
    role: "Healer",
    hp: 3420,
    atk: 1030,
    def: 1110,
    rec: 1660,
    burstName: "Aurora Hymn",
    burstHits: 8,
    attackScope: "single",
    burstScope: "single",
    burst: "Restores HP, grants regeneration, and raises resistance.",
    leader: "First Light — 20% boost to HP and gradual healing each turn.",
    portrait: "/units/solenne.webp",
    keyArt: "/units/key-art/solenne.webp",
    sprites: {
      idleA: "/sprites/units/solenne-idle-a.webp",
      idleB: "/sprites/units/solenne-idle-b.webp",
      attack: Array.from({ length: 6 }, (_, index) => `/sprites/units/solenne-attack-${index + 1}.webp`),
      burst: Array.from({ length: 8 }, (_, index) => `/sprites/units/burst/solenne-burst-${index + 1}.webp`),
    },
    glyph: "S",
    cost: 21,
    formTitles: { 2: "Dawn Novice", 3: "Sunwell Acolyte", 4: "Radiant Canoness", 5: "Aurora Hierophant" },
  },
  {
    id: "nyx",
    name: "Nyx",
    title: "Veil Reaper",
    element: "dark",
    rarity: 5,
    nature: "Valiant",
    role: "Assassin",
    hp: 3300,
    atk: 1760,
    def: 920,
    rec: 910,
    burstName: "Black Meridian",
    burstHits: 18,
    attackScope: "single",
    burstScope: "single",
    burst: "18-hit Umbral attack with defence-piercing final strike.",
    leader: "Edge of Night — Dark ATK +20% and final Burst strikes pierce defence.",
    portrait: "/units/nyx.webp",
    keyArt: "/units/key-art/nyx.webp",
    sprites: {
      idleA: "/sprites/units/nyx-idle-a.webp",
      idleB: "/sprites/units/nyx-idle-b.webp",
      attack: Array.from({ length: 9 }, (_, index) => `/sprites/units/nyx-attack-${index + 1}.webp`),
      burst: Array.from({ length: 18 }, (_, index) => `/sprites/units/burst/nyx-burst-${index + 1}.webp`),
    },
    glyph: "N",
    cost: 24,
    formTitles: { 2: "Shade Initiate", 3: "Umbral Reaper", 4: "Eclipse Harvester", 5: "Abyssal Sovereign" },
  },
];

const evolutionFrames = (unitId: BattleUnitId, stars: StarTier, animation: "idle" | "attack" | "burst") =>
  Array.from(
    { length: animation === "burst" ? PROGRESSIVE_BURST_FRAME_COUNTS[stars][unitId] : animation === "idle" && stars === 5 ? 6 : 4 },
    (_, index) => `/sprites/units/${unitId}-evolution/frames/${stars}/${animation}-${index + 1}.webp`,
  );

const EVOLUTION_SPRITES = Object.fromEntries(UNITS.map((unit) => [
  unit.id,
  Object.fromEntries(([2, 3, 4, 5] as StarTier[]).map((stars) => [stars, {
    idle: evolutionFrames(unit.id, stars, "idle"),
    attack: evolutionFrames(unit.id, stars, "attack"),
    burst: evolutionFrames(unit.id, stars, "burst"),
  }])) as Record<StarTier, BattleSpriteSet>,
])) as Record<BattleUnitId, Record<StarTier, BattleSpriteSet>>;

const LYRA_STAR_PROFILES: Record<StarTier, UnitStarProfile> = {
  2: {
    attackName: "Crescent Drill",
    burstName: "Silver Rehearsal",
    attackScope: "single",
    burstScope: "single",
    attackMultiplier: 0.92,
    burstMultiplier: 2.3,
    burstHits: 4,
    gaugeGain: 34,
    healRatio: 0.06,
    cleanse: false,
    burstBuff: "",
    burstDescription: "4-hit physical crescent burst and a light squad heal.",
    leader: "First Measure — Tide allies gain 6% recovery.",
    burstDoesDamage: true,
    maxLevel: 25,
    statMultiplier: 0.5,
    statGrowth: { hp: 0.008, atk: 0.0075, def: 0.008, rec: 0.01 },
    ascension: { seals: 1, cores: 4 },
  },
  3: {
    attackName: "Rillstep Dance",
    burstName: "Brookmoon Waltz",
    attackScope: "single",
    burstScope: "single",
    attackMultiplier: 1.04,
    burstMultiplier: 2.7,
    burstHits: 6,
    gaugeGain: 40,
    healRatio: 0.1,
    cleanse: false,
    burstBuff: "REC UP",
    burstDescription: "6-hit rill dance, heals the squad, and raises recovery.",
    leader: "Learning Current — Tide allies gain 10% HP and recovery.",
    burstDoesDamage: true,
    maxLevel: 45,
    statMultiplier: 0.69,
    statGrowth: { hp: 0.009, atk: 0.0085, def: 0.0085, rec: 0.011 },
    ascension: { seals: 2, cores: 7 },
  },
  4: {
    attackName: "Moonwake Cross",
    burstName: "Moonfall Cascade",
    attackScope: "single",
    burstScope: "all",
    attackMultiplier: 1.13,
    burstMultiplier: 3.05,
    burstHits: 8,
    gaugeGain: 46,
    healRatio: 0.16,
    cleanse: true,
    burstBuff: "REC UP",
    burstDescription: "8-hit all-foe cascade, heals the squad, and cleanses ailments.",
    leader: "Moonwater Form — all allies gain 14% HP and 15% recovery.",
    burstDoesDamage: true,
    maxLevel: 65,
    statMultiplier: 0.87,
    statGrowth: { hp: 0.01, atk: 0.0095, def: 0.009, rec: 0.012 },
    ascension: { seals: 5, cores: 12 },
  },
  5: {
    attackName: "Tidal Displacement",
    burstName: "Sovereign Moonsea",
    attackScope: "single",
    burstScope: "all",
    attackMultiplier: 1.02,
    burstMultiplier: 3.55,
    burstHits: 12,
    gaugeGain: 52,
    healRatio: 0.24,
    cleanse: true,
    burstBuff: "TIDEWARD",
    burstDescription: "12-hit all-foe moonsea, major squad healing, full cleanse, and Tideward.",
    leader: "Sovereign Flow — all allies gain 22% HP; healing and Burst gain are increased.",
    burstDoesDamage: true,
    maxLevel: 90,
    statMultiplier: 1.06,
    statGrowth: { hp: 0.011, atk: 0.0105, def: 0.01, rec: 0.0135 },
    ascension: { seals: 0, cores: 0 },
  },
};

const OTHER_UNIT_STAR_PROFILES: Record<Exclude<BattleUnitId, "lyra">, Record<StarTier, UnitStarProfile>> = {
  kael: {
    2: { attackName: "Ember Hew", burstName: "Ember Oath", attackScope: "single", burstScope: "single", attackMultiplier: 0.96, burstMultiplier: 2.25, burstHits: 6, gaugeGain: 34, healRatio: 0, cleanse: false, burstBuff: "", burstDescription: "6-hit recruit flame art ending in a compact ember crest.", leader: "First Spark — Fire allies gain 7% ATK.", burstDoesDamage: true, maxLevel: 25, statMultiplier: 0.52, statGrowth: { hp: 0.0085, atk: 0.009, def: 0.0075, rec: 0.007 }, ascension: { seals: 1, cores: 4 } },
    3: { attackName: "Cinder Rising", burstName: "Cinder Wheel", attackScope: "single", burstScope: "single", attackMultiplier: 1.06, burstMultiplier: 2.68, burstHits: 8, gaugeGain: 40, healRatio: 0, cleanse: false, burstBuff: "ATK UP", burstDescription: "8-hit rising flame chain that grants the squad ATK UP.", leader: "Cinder Discipline — Fire allies gain 11% ATK and DEF.", burstDoesDamage: true, maxLevel: 45, statMultiplier: 0.7, statGrowth: { hp: 0.009, atk: 0.0105, def: 0.008, rec: 0.007 }, ascension: { seals: 2, cores: 7 } },
    4: { attackName: "Furnace Break", burstName: "Blazing Crucible", attackScope: "single", burstScope: "all", attackMultiplier: 1.16, burstMultiplier: 3.08, burstHits: 12, gaugeGain: 46, healRatio: 0, cleanse: false, burstBuff: "ATK UP", burstDescription: "12-hit all-foe furnace eruption that ignites and empowers the squad.", leader: "Crucible Heart — all allies gain 16% ATK; Fire damage rises further.", burstDoesDamage: true, maxLevel: 65, statMultiplier: 0.88, statGrowth: { hp: 0.0095, atk: 0.0115, def: 0.0085, rec: 0.0075 }, ascension: { seals: 5, cores: 12 } },
    5: { attackName: "Phoenix Drive", burstName: "Sunforged Cataclysm", attackScope: "single", burstScope: "all", attackMultiplier: 1.08, burstMultiplier: 3.62, burstHits: 16, gaugeGain: 52, healRatio: 0, cleanse: false, burstBuff: "INFERNO", burstDescription: "16-hit phoenix cataclysm across all foes; grants Inferno to the squad.", leader: "Vanguard Flame — all allies gain 24% ATK and enhanced critical damage.", burstDoesDamage: true, maxLevel: 90, statMultiplier: 1.07, statGrowth: { hp: 0.01, atk: 0.013, def: 0.009, rec: 0.008 }, ascension: { seals: 0, cores: 0 } },
  },
  brannock: {
    2: { attackName: "Rootknock", burstName: "Seedstone Ward", attackScope: "single", burstScope: "single", attackMultiplier: 0.92, burstMultiplier: 2.18, burstHits: 6, gaugeGain: 32, healRatio: 0, cleanse: false, burstBuff: "GUARD UP", burstDescription: "6-hit earthen ward art that grants Guard Up.", leader: "Young Rampart — all allies gain 7% DEF.", burstDoesDamage: true, maxLevel: 25, statMultiplier: 0.56, statGrowth: { hp: 0.0105, atk: 0.007, def: 0.011, rec: 0.007 }, ascension: { seals: 1, cores: 4 } },
    3: { attackName: "Briar Quake", burstName: "Grove Rampart", attackScope: "single", burstScope: "single", attackMultiplier: 1.03, burstMultiplier: 2.58, burstHits: 8, gaugeGain: 38, healRatio: 0, cleanse: false, burstBuff: "GUARD UP", burstDescription: "8-hit rootline quake that raises the squad's guard.", leader: "Grove Formation — all allies gain 11% DEF and 7% max HP.", burstDoesDamage: true, maxLevel: 45, statMultiplier: 0.74, statGrowth: { hp: 0.011, atk: 0.0075, def: 0.012, rec: 0.0075 }, ascension: { seals: 2, cores: 7 } },
    4: { attackName: "Faultroot Crusher", burstName: "Heartwood Bastion", attackScope: "single", burstScope: "all", attackMultiplier: 1.14, burstMultiplier: 2.98, burstHits: 12, gaugeGain: 43, healRatio: 0, cleanse: false, burstBuff: "BARKSKIN", burstDescription: "12-hit all-foe fault surge that wraps allies in Barkskin.", leader: "Stonebark Oath — all allies gain 17% DEF and 12% max HP.", burstDoesDamage: true, maxLevel: 65, statMultiplier: 0.9, statGrowth: { hp: 0.012, atk: 0.008, def: 0.013, rec: 0.008 }, ascension: { seals: 5, cores: 12 } },
    5: { attackName: "Worldroot Rupture", burstName: "Elderwood Citadel", attackScope: "single", burstScope: "all", attackMultiplier: 1.04, burstMultiplier: 3.42, burstHits: 14, gaugeGain: 48, healRatio: 0, cleanse: false, burstBuff: "CITADEL", burstDescription: "14-hit worldroot rupture across all foes; raises the Elderwood Citadel.", leader: "Living Fortress — all allies gain 26% DEF and 20% max HP.", burstDoesDamage: true, maxLevel: 90, statMultiplier: 1.05, statGrowth: { hp: 0.0135, atk: 0.0085, def: 0.0145, rec: 0.0085 }, ascension: { seals: 0, cores: 0 } },
  },
  zephyra: {
    2: { attackName: "Breeze Shot", burstName: "Four Winds Drill", attackScope: "single", burstScope: "single", attackMultiplier: 0.98, burstMultiplier: 2.22, burstHits: 6, gaugeGain: 36, healRatio: 0, cleanse: false, burstBuff: "", burstDescription: "6-hit ranged wind-arrow drill against one foe.", leader: "Scout's Eye — Thunder allies gain 7% critical rate.", burstDoesDamage: true, maxLevel: 25, statMultiplier: 0.48, statGrowth: { hp: 0.007, atk: 0.0105, def: 0.0065, rec: 0.008 }, ascension: { seals: 1, cores: 4 } },
    3: { attackName: "Crosswind Volley", burstName: "Cyclone Quiver", attackScope: "single", burstScope: "single", attackMultiplier: 1.08, burstMultiplier: 2.7, burstHits: 8, gaugeGain: 42, healRatio: 0, cleanse: false, burstBuff: "HASTE", burstDescription: "8-hit ranged cyclone volley that grants Haste.", leader: "Galebow Tempo — Spark windows and Burst gain are moderately increased.", burstDoesDamage: true, maxLevel: 45, statMultiplier: 0.68, statGrowth: { hp: 0.0075, atk: 0.0115, def: 0.007, rec: 0.0085 }, ascension: { seals: 2, cores: 7 } },
    4: { attackName: "Thunderhead Arc", burstName: "Stormwheel Barrage", attackScope: "single", burstScope: "all", attackMultiplier: 1.17, burstMultiplier: 3.12, burstHits: 12, gaugeGain: 48, healRatio: 0, cleanse: false, burstBuff: "HASTE", burstDescription: "12-hit ranged lightning barrage across all foes; grants Haste.", leader: "Tempest Pursuit — all allies gain 16% critical damage and faster Burst gain.", burstDoesDamage: true, maxLevel: 65, statMultiplier: 0.86, statGrowth: { hp: 0.008, atk: 0.0125, def: 0.0075, rec: 0.009 }, ascension: { seals: 5, cores: 12 } },
    5: { attackName: "Horizon Piercer", burstName: "Heavenfall Constellation", attackScope: "single", burstScope: "all", attackMultiplier: 1.1, burstMultiplier: 3.66, burstHits: 20, gaugeGain: 56, healRatio: 0, cleanse: false, burstBuff: "SKYHUNT", burstDescription: "20-hit ranged storm constellation rains arrows on every foe.", leader: "Skybreak Hunt — all allies gain 24% critical damage and greatly increased Burst gain.", burstDoesDamage: true, maxLevel: 90, statMultiplier: 1.08, statGrowth: { hp: 0.0085, atk: 0.014, def: 0.008, rec: 0.0095 }, ascension: { seals: 0, cores: 0 } },
  },
  solenne: {
    2: { attackName: "Dawn Ray", burstName: "First Blessing", attackScope: "single", burstScope: "all", attackMultiplier: 0.86, burstMultiplier: 0, burstHits: 6, gaugeGain: 38, healRatio: 0.14, cleanse: false, burstBuff: "REC UP", burstDescription: "A non-damaging blessing that heals all allies and raises recovery.", leader: "Kindled Dawn — all allies gain 7% recovery.", burstDoesDamage: false, maxLevel: 25, statMultiplier: 0.5, statGrowth: { hp: 0.008, atk: 0.0065, def: 0.008, rec: 0.011 }, ascension: { seals: 1, cores: 4 } },
    3: { attackName: "Sunthread Beam", burstName: "Sunwell Grace", attackScope: "single", burstScope: "all", attackMultiplier: 0.96, burstMultiplier: 0, burstHits: 8, gaugeGain: 44, healRatio: 0.2, cleanse: false, burstBuff: "REGEN", burstDescription: "A non-damaging sunwell heal that grants regeneration to all allies.", leader: "Sunwell Song — all allies gain 11% HP and recovery.", burstDoesDamage: false, maxLevel: 45, statMultiplier: 0.7, statGrowth: { hp: 0.0085, atk: 0.007, def: 0.0085, rec: 0.012 }, ascension: { seals: 2, cores: 7 } },
    4: { attackName: "Prism Lattice", burstName: "Sanctuary Chorus", attackScope: "single", burstScope: "all", attackMultiplier: 0.92, burstMultiplier: 0, burstHits: 12, gaugeGain: 50, healRatio: 0.27, cleanse: true, burstBuff: "BARRIER", burstDescription: "A non-damaging sanctuary heal, ailment cleanse, and protective Barrier.", leader: "Radiant Chorus — all allies gain 17% HP, recovery, and ailment resistance.", burstDoesDamage: false, maxLevel: 65, statMultiplier: 0.88, statGrowth: { hp: 0.009, atk: 0.0075, def: 0.009, rec: 0.0135 }, ascension: { seals: 5, cores: 12 } },
    5: { attackName: "Aurora Lance", burstName: "Covenant of Dawn", attackScope: "single", burstScope: "all", attackMultiplier: 0.98, burstMultiplier: 0, burstHits: 14, gaugeGain: 58, healRatio: 0.36, cleanse: true, burstBuff: "RADIANT WARD", burstDescription: "A non-damaging major heal, full cleanse, regeneration, and Radiant Ward.", leader: "Everlasting Dawn — all allies gain 25% HP and greatly increased healing.", burstDoesDamage: false, maxLevel: 90, statMultiplier: 1.06, statGrowth: { hp: 0.01, atk: 0.008, def: 0.01, rec: 0.015 }, ascension: { seals: 0, cores: 0 } },
  },
  nyx: {
    2: { attackName: "Dusk Reap", burstName: "Hollow Moon", attackScope: "single", burstScope: "single", attackMultiplier: 1, burstMultiplier: 2.32, burstHits: 6, gaugeGain: 35, healRatio: 0, cleanse: false, burstBuff: "", burstDescription: "6-hit shadow crescent focused on one foe.", leader: "Shade's Edge — Dark allies gain 8% ATK.", burstDoesDamage: true, maxLevel: 25, statMultiplier: 0.49, statGrowth: { hp: 0.0075, atk: 0.011, def: 0.0065, rec: 0.0075 }, ascension: { seals: 1, cores: 4 } },
    3: { attackName: "Gloamstep Cut", burstName: "Eclipse Snare", attackScope: "single", burstScope: "single", attackMultiplier: 1.1, burstMultiplier: 2.78, burstHits: 8, gaugeGain: 41, healRatio: 0, cleanse: false, burstBuff: "VEIL", burstDescription: "8-hit blink reaping art that grants Veil.", leader: "Umbral Pursuit — Dark allies gain 12% ATK and critical damage.", burstDoesDamage: true, maxLevel: 45, statMultiplier: 0.69, statGrowth: { hp: 0.008, atk: 0.012, def: 0.007, rec: 0.008 }, ascension: { seals: 2, cores: 7 } },
    4: { attackName: "Nightglass Sever", burstName: "Black Crescent Prison", attackScope: "single", burstScope: "single", attackMultiplier: 1.2, burstMultiplier: 3.2, burstHits: 12, gaugeGain: 47, healRatio: 0, cleanse: false, burstBuff: "VEIL", burstDescription: "12-hit eclipsing prison with a defence-breaking final cut.", leader: "Eclipse Law — all allies gain 17% critical damage; Dark attacks pierce defence.", burstDoesDamage: true, maxLevel: 65, statMultiplier: 0.87, statGrowth: { hp: 0.0085, atk: 0.013, def: 0.0075, rec: 0.0085 }, ascension: { seals: 5, cores: 12 } },
    5: { attackName: "Eventide Execution", burstName: "Zero-Moon Dominion", attackScope: "single", burstScope: "all", attackMultiplier: 1.12, burstMultiplier: 3.72, burstHits: 22, gaugeGain: 54, healRatio: 0, cleanse: false, burstBuff: "ABYSS", burstDescription: "22-hit zero-moon dominion across all foes with a defence-piercing finisher.", leader: "Abyssal Crown — all allies gain 25% critical damage; final Burst hits pierce defence.", burstDoesDamage: true, maxLevel: 90, statMultiplier: 1.08, statGrowth: { hp: 0.009, atk: 0.0145, def: 0.008, rec: 0.009 }, ascension: { seals: 0, cores: 0 } },
  },
};

const LYRA_NORMAL_ATTACK_CHAINS: Record<StarTier, readonly NormalAttackBeat[]> = {
  2: [
    { frame: 1, multiplier: 0.8, pose: 0, tick: 0 },
    { frame: 2, multiplier: 1.3, pose: 1, tick: 0 },
    { frame: 3, multiplier: 0.9, pose: 2, tick: 0 },
  ],
  3: [
    { frame: 0, multiplier: 0.7, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.85, pose: 1, tick: 0 },
    { frame: 2, multiplier: 1.05, pose: 2, tick: 0 },
    { frame: 3, multiplier: 1.0, pose: 3, tick: 0 },
  ],
  4: [
    { frame: 0, multiplier: 0.55, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.75, pose: 1, tick: 0 },
    { frame: 2, multiplier: 0.72, pose: 2, tick: 0 },
    { frame: 2, multiplier: 0.72, pose: 2, tick: 1 },
    { frame: 3, multiplier: 1.35, pose: 3, tick: 0 },
  ],
  5: [
    { frame: 0, multiplier: 0.45, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.5, pose: 1, tick: 0 },
    { frame: 1, multiplier: 0.5, pose: 1, tick: 1 },
    { frame: 2, multiplier: 0.58, pose: 2, tick: 0 },
    { frame: 2, multiplier: 0.58, pose: 2, tick: 1 },
    { frame: 2, multiplier: 0.62, pose: 2, tick: 2 },
    { frame: 3, multiplier: 1.35, pose: 3, tick: 0 },
  ],
};

function getLyraProfile(stars: StarTier) {
  return LYRA_STAR_PROFILES[stars];
}

function getUnitStarProfile(unitId: BattleUnitId, stars: StarTier): UnitStarProfile {
  return unitId === "lyra" ? LYRA_STAR_PROFILES[stars] : OTHER_UNIT_STAR_PROFILES[unitId][stars];
}

function getBattleSpriteSet(unit: Unit, stars: StarTier): BattleSpriteSet {
  return EVOLUTION_SPRITES[unit.id][stars];
}

function getUnitCombatProfile(unit: Unit, stars: StarTier): UnitCombatProfile {
  return getUnitStarProfile(unit.id, stars);
}

// Each tier's authored chain is normalised so extra animation beats add visual
// complexity without granting free damage.
const NORMALISE_AUTHORED_CHAINS = true;

const ZEPHYRA_RANGED_ADVANCE = 0;

// Ranged units hold their ground; melee units still travel to contact.
const RANGED_NORMAL_UNITS = new Set<BattleUnitId>(["zephyra", "solenne"]);

const normalisedChainCache = new Map<string, readonly NormalAttackBeat[]>();

function normaliseChain(cacheKey: string, chain: readonly NormalAttackBeat[]): readonly NormalAttackBeat[] {
  if (!NORMALISE_AUTHORED_CHAINS) return chain;
  const cached = normalisedChainCache.get(cacheKey);
  if (cached) return cached;
  const total = chain.reduce((sum, beat) => sum + beat.multiplier, 0);
  const scaled = total > 0
    ? chain.map((beat) => ({ ...beat, multiplier: beat.multiplier / total }))
    : chain;
  normalisedChainCache.set(cacheKey, scaled);
  return scaled;
}

function getNormalAttackChain(unit: Unit, stars: StarTier): readonly NormalAttackBeat[] {
  if (unit.id === "lyra") return normaliseChain(`lyra-${stars}`, LYRA_NORMAL_ATTACK_CHAINS[stars]);
  const tierHits: Record<BattleUnitId, Record<StarTier, number>> = {
    kael: { 2: 2, 3: 3, 4: 4, 5: 5 },
    lyra: { 2: 3, 3: 4, 4: 5, 5: 7 },
    brannock: { 2: 2, 3: 2, 4: 3, 5: 4 },
    zephyra: { 2: 3, 3: 5, 4: 7, 5: 9 },
    solenne: { 2: 2, 3: 3, 4: 4, 5: 5 },
    nyx: { 2: 3, 3: 5, 4: 7, 5: 9 },
  };
  const hitCount = tierHits[unit.id][stars];
  const chain = Array.from({ length: hitCount }, (_, index) => {
    const isLast = index === hitCount - 1;
    return {
      // Cycle through all 4 authored attack frames instead of sitting on one
      // repeated frame — every hit but the finisher rotates 0/1/2, and the
      // finisher lands on the dedicated impact frame (3).
      frame: isLast ? 3 : index % 3,
      multiplier: isLast ? 1.45 : 1,
      pose: 0,
      tick: index,
    };
  });
  return normaliseChain(`${unit.id}-${stars}`, chain);
}

const ENEMIES: Record<string, Enemy> = {
  "cinder-woblet": { id: "cinder-woblet", name: "Cinder Woblet", hp: 580, attack: 74, element: "fire", sprite: "/sprites/enemies/cinder-woblet.webp" },
  "drizzle-woblet": { id: "drizzle-woblet", name: "Drizzle Woblet", hp: 620, attack: 68, element: "water", sprite: "/sprites/enemies/drizzle-woblet.webp" },
  "moss-woblet": { id: "moss-woblet", name: "Moss Woblet", hp: 700, attack: 62, element: "earth", sprite: "/sprites/enemies/moss-woblet.webp" },
  "spark-woblet": { id: "spark-woblet", name: "Spark Woblet", hp: 520, attack: 88, element: "thunder", sprite: "/sprites/enemies/spark-woblet.webp" },
  "gleam-woblet": { id: "gleam-woblet", name: "Gleam Woblet", hp: 560, attack: 66, element: "light", sprite: "/sprites/enemies/gleam-woblet.webp" },
  "murk-woblet": { id: "murk-woblet", name: "Murk Woblet", hp: 600, attack: 80, element: "dark", sprite: "/sprites/enemies/murk-woblet.webp" },
  "briar-imp": { id: "briar-imp", name: "Briar Imp", hp: 1450, attack: 150, element: "earth", sprite: "/sprites/enemies/briar-imp.webp" },
  mossfang: { id: "mossfang", name: "Mossfang", hp: 1950, attack: 185, element: "earth", sprite: "/sprites/enemies/mossfang.webp" },
  "ruinback-alpha": { id: "ruinback-alpha", name: "Ruinback Alpha", hp: 5200, attack: 285, element: "earth", sprite: "/sprites/enemies/ruinback-alpha.webp", boss: true, skill: "Rootquake" },
  coalwing: { id: "coalwing", name: "Coalwing", hp: 1700, attack: 170, element: "fire", sprite: "/sprites/enemies/coalwing.webp" },
  "ashen-dryad": { id: "ashen-dryad", name: "Ashen Dryad", hp: 2600, attack: 220, element: "fire", sprite: "/sprites/enemies/ashen-dryad.webp" },
  "pyre-antler": { id: "pyre-antler", name: "Pyre Antler", hp: 5900, attack: 315, element: "fire", sprite: "/sprites/enemies/pyre-antler.webp", boss: true, skill: "Wildfire Stampede" },
  "vault-wisp": { id: "vault-wisp", name: "Vault Wisp", hp: 1900, attack: 175, element: "water", sprite: "/sprites/enemies/vault-wisp.webp" },
  "drowned-sentinel": { id: "drowned-sentinel", name: "Drowned Sentinel", hp: 3100, attack: 235, element: "water", sprite: "/sprites/enemies/drowned-sentinel.webp" },
  "reliquary-leviathan": { id: "reliquary-leviathan", name: "Reliquary Leviathan", hp: 7200, attack: 345, element: "water", sprite: "/sprites/enemies/reliquary-leviathan.webp", boss: true, skill: "Abyssal Deluge" },
  "hollow-guard": { id: "hollow-guard", name: "Hollow Guard", hp: 2800, attack: 225, element: "dark", sprite: "/sprites/enemies/hollow-guard.webp" },
  "cinder-revenant": { id: "cinder-revenant", name: "Cinder Revenant", hp: 3900, attack: 275, element: "fire", sprite: "/sprites/enemies/cinder-revenant.webp" },
  crownless: { id: "crownless", name: "The Crownless", hp: 9400, attack: 390, element: "dark", sprite: "/sprites/enemies/crownless.webp", boss: true, skill: "Crownfall" },
  "storm-herald": { id: "storm-herald", name: "Storm Herald", hp: 10800, attack: 420, element: "thunder", sprite: "/sprites/enemies/storm-herald.webp", boss: true, skill: "Heavensunder" },
};

const LEGACY_QUESTS: Quest[] = [
  {
    id: 1,
    chapter: 1,
    name: "A Bright New Trail",
    location: "Dandelion Path",
    stage: "/stages/chapter-1-sunmeadow.webp",
    energy: 3,
    element: "earth",
    reward: 420,
    region: "Sunpetal Vale",
    recommended: 85,
    intro: [
      { speaker: "Mira", text: "Morning, Warden! The shard-compass woke up pointing straight through Sunpetal Vale." },
      { speaker: "Kael", text: "Then this is a fine place to begin. Keep to the trail—and try not to step on the flowers." },
      { speaker: "Mira", text: "Tap units rapidly. If two different units strike the same foe on one animation frame, both hits Spark for 25% more damage." },
    ],
    waves: [
      { enemies: ["moss-woblet", "moss-woblet"] },
      { enemies: ["mossfang", "briar-imp", "mossfang"] },
      { enemies: ["ruinback-alpha", "briar-imp", "mossfang"] },
    ],
  },
  {
    id: 2,
    chapter: 1,
    name: "The Emberberry Picnic",
    location: "Bramblebrook Grove",
    stage: "/stages/chapter-1-sunmeadow.webp",
    energy: 4,
    element: "fire",
    reward: 620,
    region: "Sunpetal Vale",
    recommended: 112,
    intro: [
      { speaker: "Lyra", text: "Someone raided the picnic baskets—and the Emberberries are rolling all over the grove." },
      { speaker: "Mira", text: "Cinder Woblets love anything warm and sweet. Tide overcomes Flame, so let Lyra cool them down." },
    ],
    waves: [
      { enemies: ["cinder-woblet", "cinder-woblet", "coalwing"] },
      { enemies: ["ashen-dryad", "coalwing", "ashen-dryad", "coalwing"] },
      { enemies: ["pyre-antler", "ashen-dryad", "coalwing", "ashen-dryad", "coalwing"] },
    ],
  },
  {
    id: 3,
    chapter: 1,
    name: "Ripples at Crystal Creek",
    location: "Crystalbell Brook",
    stage: "/stages/chapter-1-sunmeadow.webp",
    energy: 5,
    element: "water",
    reward: 880,
    region: "Sunpetal Vale",
    recommended: 139,
    intro: [
      { speaker: "Brannock", text: "Crystalbell Brook is sparkling brighter than usual. Even the Woblets have come to see." },
      { speaker: "Mira", text: "The Crown shard is skipping beneath the water. Storm energy will part the current without harming the stream." },
    ],
    waves: [
      { enemies: ["drizzle-woblet", "drizzle-woblet", "vault-wisp"] },
      { enemies: ["drowned-sentinel", "vault-wisp", "drowned-sentinel", "vault-wisp"] },
      { enemies: ["reliquary-leviathan", "drowned-sentinel", "vault-wisp", "drowned-sentinel", "vault-wisp"] },
    ],
  },
  {
    id: 4,
    chapter: 1,
    name: "Lanterns on Suncrest Hill",
    location: "Suncrest Fairgrounds",
    stage: "/stages/chapter-1-sunmeadow.webp",
    energy: 7,
    element: "dark",
    reward: 1400,
    region: "Sunpetal Vale",
    recommended: 166,
    intro: [
      { speaker: "Mira", text: "Suncrest's lantern festival should have started by now, but a strange shadow has scared everyone from the hill." },
      { speaker: "Kael", text: "Then we'll clear the fairground, relight the lanterns, and make sure the music starts on time." },
    ],
    waves: [
      { enemies: ["murk-woblet", "gleam-woblet", "hollow-guard"] },
      { enemies: ["cinder-revenant", "hollow-guard", "cinder-revenant", "hollow-guard"] },
      { enemies: ["crownless", "hollow-guard", "cinder-revenant", "hollow-guard", "cinder-revenant"] },
    ],
  },
  {
    id: 5,
    chapter: 2,
    name: "Across the Glass Sea",
    location: "Shardwake Pier",
    stage: "/stages/reliquary.webp",
    energy: 8,
    element: "thunder",
    reward: 1900,
    region: "The Glass Sea",
    recommended: 198,
    intro: [
      { speaker: "Mira", text: "The horizon has split again. Beyond it, a sea of glass is carrying the second Crown Shard east." },
      { speaker: "Zephyra", text: "Then we ride the storm before the storm rides us." },
    ],
    waves: [
      { enemies: ["spark-woblet", "spark-woblet", "drizzle-woblet"] },
      { enemies: ["drowned-sentinel", "vault-wisp", "drowned-sentinel", "coalwing"] },
      { enemies: ["storm-herald", "vault-wisp", "drowned-sentinel"] },
    ],
  },
];

const EXPANDED_QUESTS: Quest[] = [
  {
    id: 6, chapter: 2, name: "Mirror Shoals", location: "Prism Coast", stage: "/stages/causeway.webp", energy: 8,
    element: "water", reward: 2180, region: "The Glass Sea", recommended: 226,
    intro: [{ speaker: "Lyra", text: "Every reflection is moving a breath too late. Keep your eyes on the water, not the copies." }],
    waves: [
      { enemies: ["vault-wisp", "vault-wisp", "mossfang"] },
      { enemies: ["drowned-sentinel", "vault-wisp", "drowned-sentinel"] },
      { enemies: ["reliquary-leviathan", "vault-wisp", "vault-wisp", "drowned-sentinel"] },
    ],
  },
  {
    id: 7, chapter: 2, name: "Thunder in the Deep", location: "Tempest Scar", stage: "/stages/reliquary.webp", energy: 9,
    element: "thunder", reward: 2440, region: "The Glass Sea", recommended: 254,
    intro: [{ speaker: "Zephyra", text: "That pulse is not weather. Something below us is beating like a second sky." }],
    waves: [
      { enemies: ["coalwing", "vault-wisp", "coalwing"] },
      { enemies: ["drowned-sentinel", "coalwing", "vault-wisp", "drowned-sentinel"] },
      { enemies: ["storm-herald", "drowned-sentinel", "coalwing", "vault-wisp"] },
    ],
  },
  {
    id: 8, chapter: 2, name: "The Drowned Observatory", location: "Orison Spire", stage: "/stages/citadel.webp", energy: 9,
    element: "dark", reward: 2710, region: "The Glass Sea", recommended: 282,
    intro: [{ speaker: "Solenne", text: "The star-lenses are still turning. They are charting a night that has not happened yet." }],
    waves: [
      { enemies: ["hollow-guard", "vault-wisp"] },
      { enemies: ["hollow-guard", "drowned-sentinel", "vault-wisp", "hollow-guard"] },
      { enemies: ["crownless", "hollow-guard", "drowned-sentinel"] },
    ],
  },
  {
    id: 9, chapter: 2, name: "Sails of Living Lightning", location: "Aether Current", stage: "/stages/emberwood.webp", energy: 10,
    element: "thunder", reward: 3050, region: "The Glass Sea", recommended: 310,
    intro: [{ speaker: "Kael", text: "The current is pulling the whole fleet into the Rift. We cut the anchor or lose the coast." }],
    waves: [
      { enemies: ["coalwing", "coalwing", "vault-wisp"] },
      { enemies: ["storm-herald", "coalwing", "drowned-sentinel"] },
      { enemies: ["storm-herald", "storm-herald", "vault-wisp", "coalwing"] },
    ],
  },
  {
    id: 10, chapter: 2, name: "Herald at World’s Edge", location: "Horizon Maw", stage: "/stages/reliquary.webp", energy: 11,
    element: "thunder", reward: 3600, region: "The Glass Sea", recommended: 342,
    intro: [{ speaker: "Mira", text: "The Herald has fused with the stormfront. Break its three seals before Heavensunder reaches the shore." }],
    waves: [
      { enemies: ["vault-wisp", "drowned-sentinel", "coalwing"] },
      { enemies: ["storm-herald", "vault-wisp", "drowned-sentinel", "coalwing"] },
      { enemies: ["storm-herald", "storm-herald", "drowned-sentinel", "vault-wisp", "coalwing"] },
    ],
  },
  {
    id: 11, chapter: 3, name: "The Moonless Pass", location: "Umbra Border", stage: "/stages/causeway.webp", energy: 11,
    element: "dark", reward: 3950, region: "Crownless Night", recommended: 374,
    intro: [{ speaker: "Nyx", text: "No moon. No echo. This road was made to hide an army—or a memory." }],
    waves: [
      { enemies: ["hollow-guard", "hollow-guard", "briar-imp"] },
      { enemies: ["cinder-revenant", "hollow-guard", "mossfang"] },
      { enemies: ["crownless", "hollow-guard", "cinder-revenant"] },
    ],
  },
  {
    id: 12, chapter: 3, name: "Garden of Echoes", location: "Nocturne Grove", stage: "/stages/emberwood.webp", energy: 12,
    element: "earth", reward: 4300, region: "Crownless Night", recommended: 408,
    intro: [{ speaker: "Brannock", text: "The roots remember every Warden buried here. Walk gently; some still dream of battle." }],
    waves: [
      { enemies: ["briar-imp", "mossfang", "briar-imp", "mossfang"] },
      { enemies: ["ashen-dryad", "mossfang", "hollow-guard"] },
      { enemies: ["ruinback-alpha", "ashen-dryad", "mossfang", "hollow-guard"] },
    ],
  },
  {
    id: 13, chapter: 3, name: "The Hollow Archive", location: "Sable Athenaeum", stage: "/stages/citadel.webp", energy: 12,
    element: "light", reward: 4680, region: "Crownless Night", recommended: 442,
    intro: [{ speaker: "Solenne", text: "These books have had their names cut out. The missing words are circling us like moths." }],
    waves: [
      { enemies: ["vault-wisp", "hollow-guard", "vault-wisp"] },
      { enemies: ["cinder-revenant", "drowned-sentinel", "hollow-guard", "vault-wisp"] },
      { enemies: ["crownless", "cinder-revenant", "drowned-sentinel", "hollow-guard"] },
    ],
  },
  {
    id: 14, chapter: 3, name: "Throne of Ash", location: "Blackglass Keep", stage: "/stages/citadel.webp", energy: 13,
    element: "fire", reward: 5100, region: "Crownless Night", recommended: 478,
    intro: [{ speaker: "Kael", text: "This is where my order fell. Today it becomes the place we stand again." }],
    waves: [
      { enemies: ["cinder-revenant", "coalwing", "cinder-revenant"] },
      { enemies: ["pyre-antler", "hollow-guard", "coalwing", "cinder-revenant"] },
      { enemies: ["crownless", "pyre-antler", "hollow-guard", "cinder-revenant"] },
    ],
  },
  {
    id: 15, chapter: 3, name: "A Crown Remade", location: "Heart of the Rift", stage: "/stages/reliquary.webp", energy: 15,
    element: "dark", reward: 6200, region: "Crownless Night", recommended: 520,
    intro: [
      { speaker: "Mira", text: "All three shards are answering you. The Crown can be remade—but only if we choose what it will protect." },
      { speaker: "Nyx", text: "Then choose after we survive. The thing on the throne has already chosen for us." },
    ],
    waves: [
      { enemies: ["hollow-guard", "cinder-revenant", "drowned-sentinel", "storm-herald"] },
      { enemies: ["crownless", "pyre-antler", "reliquary-leviathan"] },
      { enemies: ["crownless", "storm-herald", "ruinback-alpha", "pyre-antler", "reliquary-leviathan"] },
    ],
  },
];

const QUESTS: Quest[] = [...LEGACY_QUESTS, ...EXPANDED_QUESTS];

const defaultSave: SaveState = {
  level: 7,
  xp: 420,
  gold: 12840,
  gems: 20,
  energy: 22,
  maxEnergy: 24,
  arenaOrbs: 3,
  arenaRank: 118,
  lastArenaAt: Date.now(),
  owned: ["kael", "lyra", "nyx", "zephyra", "solenne"],
  party: ["kael", "lyra", "nyx", "zephyra", "solenne"],
  unitLevels: { kael: 22, lyra: 20, nyx: 21, zephyra: 18, solenne: 18 },
  unitStars: { kael: 5, lyra: 5, nyx: 5, zephyra: 5, solenne: 5 },
  unitXp: { kael: 240, lyra: 180, nyx: 210, zephyra: 120, solenne: 120 },
  burstLevels: { kael: 4, lyra: 4, nyx: 3, zephyra: 3, solenne: 3 },
  completed: [],
  unlockedStage: 1,
  potions: 3,
  forgeLevel: 1,
  wellLevel: 1,
  groveLevel: 1,
  dailyClaimed: "",
  lastEnergyAt: Date.now(),
  materials: { aether: 46, ember: 14, tide: 14, grove: 14, storm: 14, radiance: 14, umbral: 10, seal: 7, relicDust: 22 },
  relics: ["Moonstone Edge", "Rootbound Crest", "Tideglass Charm"],
  equippedRelics: { kael: "Moonstone Edge", nyx: "Rootbound Crest", lyra: "Tideglass Charm" },
  covenantPoints: 820,
  summonPity: 2,
  summonHistory: [],
  squads: [
    ["kael", "lyra", "nyx", "zephyra", "solenne"],
    ["nyx", "lyra", "kael"],
    ["zephyra", "solenne", "kael"],
  ],
  activeSquad: 0,
  wardenCapacity: 112,
  townResources: { ore: 18, herbs: 22, water: 16, timber: 15 },
  lastTownGather: "",
  eventTokens: 120,
  towerFloor: 1,
  shardHuntScore: 0,
  titles: ["Causeway Warden"],
  selectedTitle: "Causeway Warden",
  achievements: [],
};

function getUnit(id: string) {
  return UNITS.find((unit) => unit.id === id) ?? UNITS[0];
}

function getEnemy(id: string) {
  return ENEMIES[id] ?? ENEMIES["briar-imp"];
}

function createWaveEnemies(quest: Quest, waveIndex: number): EnemyInstance[] {
  return quest.waves[waveIndex].enemies.map((enemyId, index) => ({
    instanceId: `q${quest.id}-w${waveIndex + 1}-enemy-${index + 1}`,
    enemyId,
    hp: getEnemy(enemyId).hp,
    maxHp: getEnemy(enemyId).hp,
    ailments: [],
  }));
}

function getFormPortrait(unit: Unit, stars: StarTier = 5) {
  return `/units/rarity-art/${unit.id}-${stars}.webp`;
}

function getBattleFacePortrait(unit: Unit, stars: StarTier) {
  // The generated face cards have painted scenery baked into the pixels.
  // Use the matching transparent evolution pose instead and crop it tightly
  // in CSS so the battle deck shows only the current form's face.
  return getBattleSpriteSet(unit, stars).idle[0];
}

function getMaxLevel(stars: StarTier, unitId?: BattleUnitId) {
  return unitId ? getUnitStarProfile(unitId, stars).maxLevel : stars === 2 ? 25 : stars === 3 ? 45 : stars === 4 ? 65 : 90;
}

function getFormMultiplier(stars: StarTier, unitId?: BattleUnitId) {
  return unitId ? getUnitStarProfile(unitId, stars).statMultiplier : stars === 2 ? 0.52 : stars === 3 ? 0.7 : stars === 4 ? 0.88 : 1.06;
}

function getFormStat(unit: Unit, stars: StarTier, level: number, stat: "hp" | "atk" | "def" | "rec") {
  const growth = 1 + level * getUnitStarProfile(unit.id, stars).statGrowth[stat];
  return Math.round(unit[stat] * getFormMultiplier(stars, unit.id) * growth);
}

function getSquadCost(ids: string[], stars: Record<string, StarTier>) {
  return ids.reduce((total, id) => total + Math.max(12, getUnit(id).cost - (5 - (stars[id] ?? 3)) * 4), 0);
}

// Mirrors HERO_FORMATION's own structure directly: the same two paired
// left/right-ish columns (~88 / ~14) repeated across evenly-stepped bottom
// tiers, with a single centred unit on the lowest tier for odd counts —
// the same shape as the party's own formation, just compressed into the
// 46-114 band (114 = Kael's own slot/field-slot-1, so no enemy stands
// higher than the party; 46 = the top edge of the enemy name/type row,
// .enemy-status-top, so no enemy drops below it).
const ENEMY_FORMATIONS: Record<number, { left: number; bottom: number }[]> = {
  2: [{ left: 88, bottom: 114 }, { left: 14, bottom: 46 }],
  3: [{ left: 88, bottom: 114 }, { left: 50, bottom: 80 }, { left: 14, bottom: 46 }],
  4: [{ left: 88, bottom: 114 }, { left: 14, bottom: 114 }, { left: 89.5, bottom: 46 }, { left: 14.5, bottom: 46 }],
  5: [{ left: 88, bottom: 114 }, { left: 14, bottom: 114 }, { left: 89.5, bottom: 80 }, { left: 14.5, bottom: 80 }, { left: 51, bottom: 46 }],
};

const HERO_FORMATION = [
  // Keep the field positions in the same row-major order as the command deck:
  // 1/2 top row, 3/4 middle row, 5 bottom-left. Every slot is centred on one
  // of two exact column axes so differently sized unit canvases still line up.
  // The tighter vertical spacing keeps every foot line above the enemy HP rail.
  { right: 88, bottom: 114, width: 78 },
  { right: 14, bottom: 114, width: 64 },
  { right: 89.5, bottom: 70, width: 75 },
  { right: 14.5, bottom: 70, width: 63 },
  { right: 96, bottom: 28, width: 62 },
];

// Full HP reads green, mid-health yellow, and the bar's own baseline red art
// covers the low tier untouched — same three-stage read as a full/two-thirds/
// one-third split, just implemented as a hue-rotate over the single red bar
// asset this project has rather than swapping between dedicated bar textures.
function getHpTierClass(hp: number, maxHp: number): string {
  if (maxHp <= 0) return "hp-tier-red";
  const percent = hp / maxHp;
  if (percent >= 1) return "hp-tier-green";
  if (percent >= 1 / 3) return "hp-tier-yellow";
  return "hp-tier-red";
}

function getTopPriorityEnemy(enemies: EnemyInstance[]) {
  const formation = ENEMY_FORMATIONS[enemies.length] ?? [];
  return enemies
    .map((enemy, index) => ({ enemy, index, bottom: formation[index]?.bottom ?? 0 }))
    .filter(({ enemy }) => enemy.hp > 0)
    .sort((a, b) => b.bottom - a.bottom || a.index - b.index)[0]?.enemy;
}

function getBattleTargets(state: BattleState, scope: AttackScope) {
  const living = state.enemies.filter((enemy) => enemy.hp > 0);
  if (scope === "all") return living;
  const focused = living.find((enemy) => enemy.instanceId === state.targetEnemyId);
  const priority = focused ?? getTopPriorityEnemy(state.enemies);
  return priority ? [priority] : [];
}

function getContactOffset(enemyCount: number, enemyIndex: number, heroIndex: number, battlefieldWidth: number) {
  const enemy = ENEMY_FORMATIONS[enemyCount]?.[enemyIndex] ?? ENEMY_FORMATIONS[2][0];
  const hero = HERO_FORMATION[heroIndex] ?? HERO_FORMATION[0];
  const heroCenter = battlefieldWidth - hero.right - hero.width / 2;
  const contactCenter = enemy.left + 60 + hero.width * 0.4;
  return {
    x: Math.round(contactCenter - heroCenter),
    y: Math.round(hero.bottom - enemy.bottom),
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ElementBadge({ element, compact = false }: { element: ElementKey; compact?: boolean }) {
  const { Icon, label } = ELEMENTS[element];
  return (
    <span className={`element-badge ${element} ${compact ? "compact" : ""}`}>
      <Icon size={compact ? 11 : 14} strokeWidth={2.6} />
      {!compact && label}
    </span>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} star rarity`}>
      {Array.from({ length: count }, (_, index) => (
        <Star key={index} size={11} fill="currentColor" />
      ))}
    </span>
  );
}

function UnitPortrait({ unit, className = "", stars = 5 }: { unit: Unit; className?: string; stars?: StarTier }) {
  const [failed, setFailed] = useState(false);
  const portrait = getFormPortrait(unit, stars);
  return (
    <div className={`unit-portrait rarity-ui-art ${unit.element} form-${stars} ${className}`}>
      {portrait && !failed ? (
        <img src={portrait} alt={`${unit.name}, ${unit.formTitles[stars]}, ${stars} star form`} onError={() => setFailed(true)} draggable={false} />
      ) : (
        <span className="portrait-fallback">{unit.glyph}</span>
      )}
      <span className="portrait-glow" />
    </div>
  );
}

function BattleFacePortrait({ unit, stars }: { unit: Unit; stars: StarTier }) {
  return (
    <div className={`battle-face-portrait unit-${unit.id} ${unit.element} form-${stars}`}>
      <img
        src={getBattleFacePortrait(unit, stars)}
        alt={`${unit.name}, ${stars} star battle portrait`}
        draggable={false}
      />
    </div>
  );
}

// Shared gate artwork: the stone-arch structure image with its 7 free-
// floating gem sprites, plus a void-aligned slot (GATE_VOID) for whatever
// idle glow / video sequence a given screen wants to layer over the void.
function GateArt({
  children,
  voidClassName = "",
  voidCore = GATE_VOID_DEFAULT.core,
  voidMid = GATE_VOID_DEFAULT.mid,
  voidFilter = GATE_VOID_SWIRL_IDLE,
  voidFadeMs,
  gemFilter = GATE_GEM_FILTER_IDLE,
}: {
  children?: ReactNode;
  voidClassName?: string;
  // The void's inner glow colour - defaults to its resting purple. Screens
  // that want it to fade toward a rarity colour (the chamber, while
  // charging) pass the target colour plus how long that fade should take;
  // the underlying transition on --void-core/--void-mid then animates it,
  // same idea as the bloom colour but transitioned instead of keyframed
  // since this element is always mounted (never a fresh-mount fade-in).
  voidCore?: string;
  voidMid?: string;
  // Recolours the void's own swirl artwork (gate-void-swirl.webp) via a
  // hue-rotate/saturate/brightness filter - defaults to a no-op filter so
  // the sprite reads exactly as its baked purple. Same voidFadeMs drives
  // both this and the glow colour so they land in sync.
  voidFilter?: string;
  voidFadeMs?: number;
  // Same idea, applied to all 7 floating gem sprites at once.
  gemFilter?: string;
}) {
  return (
    <>
      <img className="gate-structure" src="/summon/gate-structure.webp" alt="The Aether Gate, a stone archway holding a swirling void" draggable={false} />
      <img
        className="gate-void-swirl"
        src="/summon/gate-void-swirl.webp"
        alt=""
        draggable={false}
        style={{
          left: `${GATE_VOID.left}%`,
          top: `${GATE_VOID.top}%`,
          width: `${GATE_VOID_SWIRL.width}%`,
          height: `${GATE_VOID_SWIRL.height}%`,
          filter: voidFilter,
          ...(voidFadeMs ? { transitionDuration: `${voidFadeMs}ms` } : {}),
        } as CSSProperties}
      />
      {GATE_FLOATERS.map((gem) => (
        <img
          key={gem.name}
          className={`gate-gem-float gate-gem-${gem.name}`}
          src={`/summon/gate-gem-${gem.name}.webp`}
          alt=""
          draggable={false}
          style={{
            left: `${gem.left}%`,
            top: `${gem.top}%`,
            width: `${gem.width}%`,
            filter: gemFilter,
            ...(voidFadeMs ? { transitionDuration: `${voidFadeMs}ms` } : {}),
          } as CSSProperties}
        />
      ))}
      <div
        className={`gate-void-fx ${voidClassName}`}
        aria-hidden="true"
        style={{ left: `${GATE_VOID.left}%`, top: `${GATE_VOID.top}%`, width: `${GATE_VOID.width}%`, height: `${GATE_VOID.height}%` } as CSSProperties}
      >
        <span
          className="gate-void-glow"
          style={{
            "--void-core": voidCore,
            "--void-mid": voidMid,
            ...(voidFadeMs ? { transitionDuration: `${voidFadeMs}ms` } : {}),
          } as CSSProperties}
        />
        {children}
      </div>
    </>
  );
}

function UnitKeyArt({ unit, stars = 5, className = "" }: { unit: Unit; stars?: StarTier; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`unit-key-art key-art-${unit.element} unit-${unit.id} form-${stars} ${className}`}>
      <img
        src={failed ? unit.keyArt : getFormPortrait(unit, stars)}
        alt={`${unit.name}, ${unit.formTitles[stars]}, ${stars} star character illustration`}
        onError={() => setFailed(true)}
        draggable={false}
      />
      <span className="key-art-vignette" aria-hidden="true" />
    </div>
  );
}

function StableBattleFrame({ src, className }: { src: string; className: string }) {
  // Previously this waited for each new frame to fully load+decode before
  // swapping (to avoid a flash of a blank/broken image). But combo hits can
  // advance faster than one frame's real decode latency on slower devices —
  // the Android WebView's asset bridge in particular is much slower than a
  // desktop dev server — and every frame whose decode hadn't finished before
  // the next hit's src change got silently abandoned, never once painted.
  // That reads as skipped attack frames and, when a stale bitmap lingers on
  // the compositor while the next one lands, as ghosting. The sibling
  // preload effect in BattleUnitSprite already warms every frame's decode
  // before combat can reach it, so binding src directly is both simpler and
  // safe: no waiting, no race, no dropped frames.
  return <img className={className} src={src} alt="" draggable={false} data-frame-ready="true" />;
}

/* Procedural attack and Burst VFX are intentionally absent. Burst presentation
   uses the cinematic cut-in, followed by the authored progressive sprite frames. */

const FIVE_STAR_IDLE_TIMING: Record<BattleUnitId, { milliseconds: number; startFrame: number }> = {
  kael: { milliseconds: 360, startFrame: 0 },
  lyra: { milliseconds: 470, startFrame: 2 },
  brannock: { milliseconds: 540, startFrame: 4 },
  zephyra: { milliseconds: 390, startFrame: 1 },
  solenne: { milliseconds: 505, startFrame: 3 },
  nyx: { milliseconds: 435, startFrame: 5 },
};

function BattleUnitSprite({ unit, mode, attackFrame = 0, stars = 5 }: { unit: Unit; mode: "idle" | "attack" | "burst"; attackFrame?: number; stars?: StarTier }) {
  const spriteSet = useMemo(() => getBattleSpriteSet(unit, stars), [stars, unit]);
  const idleTiming = FIVE_STAR_IDLE_TIMING[unit.id];
  const [idleFrame, setIdleFrame] = useState(() => stars === 5 ? idleTiming.startFrame % spriteSet.idle.length : 0);

  useEffect(() => {
    if (mode !== "idle" || stars !== 5 || spriteSet.idle.length < 2) {
      setIdleFrame(0);
      return;
    }
    setIdleFrame(idleTiming.startFrame % spriteSet.idle.length);
    const timer = window.setInterval(() => {
      setIdleFrame((frame) => (frame + 1) % spriteSet.idle.length);
    }, idleTiming.milliseconds);
    return () => window.clearInterval(timer);
  }, [idleTiming.milliseconds, idleTiming.startFrame, mode, spriteSet.idle.length, stars, unit.id]);

  useEffect(() => {
    const sources = [...spriteSet.idle, ...spriteSet.attack, ...spriteSet.burst];
    const frames = sources.map((source) => {
      const frame = new Image();
      frame.src = source;
      void frame.decode().catch(() => undefined);
      return frame;
    });
    return () => {
      frames.forEach((frame) => {
        frame.onload = null;
        frame.onerror = null;
      });
    };
  }, [spriteSet.attack, spriteSet.burst, spriteSet.idle, stars, unit.id]);

  const normalFrame = attackFrame % Math.max(1, spriteSet.attack.length);
  const burstFrame = attackFrame % Math.max(1, spriteSet.burst.length);
  const activeSource = mode === "idle"
      // The rebuilt 5-star loop repeats one locked character layer and changes
      // only the baked elemental phase. Earlier tiers retain one planted pose
      // because their independently drawn frames do not share exact anchors.
      ? stars === 5 ? spriteSet.idle[idleFrame] ?? spriteSet.idle[0] : spriteSet.idle[0]
      : mode === "attack"
        ? spriteSet.attack[normalFrame] ?? spriteSet.idle[0]
        : spriteSet.burst[burstFrame] ?? spriteSet.idle[0];
  const frameClass = mode === "idle"
    ? "sprite-idle-anchor"
    : mode === "attack"
      ? "sprite-attack-frame"
      : "sprite-burst sprite-burst-frame";
  return (
    <div
      className={`battle-unit-sprite single-frame-renderer evolution-sprite ${unit.id}-evolution-sprite ${unit.id}-tier-${stars} sprite-${mode}`}
      role="img"
      aria-label={`${unit.name} ${stars} star ${mode === "attack" ? `combo hit ${attackFrame + 1}` : mode} battle sprite facing the enemy`}
      data-idle-anchor={mode === "idle" ? stars === 5 ? "locked-5star" : "fixed" : undefined}
      data-idle-phase-count={mode === "idle" && stars === 5 ? spriteSet.idle.length : undefined}
      data-idle-frame-ms={mode === "idle" && stars === 5 ? idleTiming.milliseconds : undefined}
    >
      <StableBattleFrame className={`sprite-frame active ${frameClass}`} src={activeSource} />
    </div>
  );
}

function ResourceBar({ save }: { save: SaveState }) {
  return (
    <div className="resource-bar">
      <span title="Energy"><Zap size={13} fill="currentColor" />{save.energy}/{save.maxEnergy}</span>
      <span title="Aether gems"><Gem size={13} fill="currentColor" />{save.gems}</span>
      <span title="Gold"><Coins size={13} fill="currentColor" />{save.gold.toLocaleString()}</span>
    </div>
  );
}

function AppHeader({
  save,
  title,
  onBack,
  soundOn,
  onSoundToggle,
}: {
  save: SaveState;
  title: string;
  onBack?: () => void;
  soundOn: boolean;
  onSoundToggle: () => void;
}) {
  return (
    <header className="app-header">
      <div className="header-main">
        {onBack ? (
          <button className="icon-button" onClick={onBack} aria-label="Go back"><ChevronLeft /></button>
        ) : (
          <div className="rank-medallion"><Crown size={16} /><strong>{save.level}</strong></div>
        )}
        <div className="header-title">
          <small>{onBack ? "GATES OF AZURA" : "WARDEN CONOR"}</small>
          <strong>{title}</strong>
        </div>
        <button className={`sound-button ${soundOn ? "playing" : "muted"}`} onClick={onSoundToggle} aria-label={soundOn ? "Mute game music" : "Play game music"}>
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {soundOn && <span className="music-bars" aria-hidden="true"><i /><i /><i /></span>}
        </button>
      </div>
      <ResourceBar save={save} />
    </header>
  );
}

function BottomNav({ screen, go, save }: { screen: Screen; go: (screen: Screen) => void; save: SaveState }) {
  const tabs: { id: Screen; label: string; Icon: LucideIcon; art?: string }[] = [
    { id: "home", label: "Home", Icon: Home, art: "/ui/icons/nav-home-house.png" },
    { id: "units", label: "Units", Icon: Users, art: "/ui/icons/nav-units-swords.png" },
    { id: "town", label: "Town", Icon: Castle, art: "/ui/icons/nav-town-house.png" },
    { id: "shop", label: "Shop", Icon: ShoppingBag, art: "/ui/icons/nav-shop-chest.png" },
    { id: "summon", label: "Summon", Icon: Sparkles, art: "/ui/icons/nav-summon-gate.png" },
    { id: "arena", label: "Arena", Icon: Swords, art: "/ui/icons/nav-arena-coliseum.png" },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, Icon, art }) => (
        <button key={id} className={screen === id ? "active" : ""} onClick={() => go(id)}>
          <span className={`nav-icon-frame nav-icon-${id}`}>
            {art ? <img src={art} alt="" /> : <Icon size={21} strokeWidth={2.1} />}
            {id === "summon" && save.gems >= 5 && <b className="nav-alert">!</b>}
            {id === "town" && save.lastTownGather !== todayKey() && <b className="nav-alert">1</b>}
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}

export default function GatesOfAzura() {
  const [screen, setScreen] = useState<Screen>("home");
  const [homeBanner, setHomeBanner] = useState(0);
  const [save, setSave] = useState<SaveState>(defaultSave);
  const [hydrated, setHydrated] = useState(false);
  const [titleGateOpen, setTitleGateOpen] = useState(true);
  const [titleAssetsReady, setTitleAssetsReady] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedFormStars, setSelectedFormStars] = useState<StarTier>(5);
  const [unitFilter, setUnitFilter] = useState<ElementKey | "all">("all");
  const [unitSort, setUnitSort] = useState<"rarity" | "level">("rarity");
  const [soundOn, setSoundOn] = useState(true);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [squadEditSlot, setSquadEditSlot] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [battlefieldWidth, setBattlefieldWidth] = useState(430);
  const [storyQuestId, setStoryQuestId] = useState(1);
  const [storyStep, setStoryStep] = useState(0);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [victory, setVictory] = useState<{ won: boolean; reward: number } | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<BattleSpeed>(1);
  const battlefieldRef = useRef<HTMLDivElement | null>(null);
  const [battlefieldSize, setBattlefieldSize] = useState({ width: 430, height: 355 });
  const [autoTurnActive, setAutoTurnActive] = useState(false);
  const [attackFxs, setAttackFxs] = useState<AttackFx[]>([]);
  const [damageFxs, setDamageFxs] = useState<DamageFx[]>([]);
  const [crystalFxs, setCrystalFxs] = useState<CrystalFx[]>([]);
  const [screenImpact, setScreenImpact] = useState(0);
  // How hard the last connected hit should read on screen. 1 is an ordinary
  // chain beat; crits, Sparks and Burst finishers push it up so the camera,
  // the flash and the damage numerals all escalate together.
  const [impactPower, setImpactPower] = useState(1);
  const [combatFx, setCombatFx] = useState<CombatFx>({
    phase: "ready",
    serial: 0,
    activeUnitId: "",
    activeEnemyId: "",
    targetUnitId: "",
    targetEnemyId: "",
    damage: 0,
    hits: 0,
    hitFrame: 0,
    spark: false,
    weakness: false,
    label: "",
  });
  const [summonResult, setSummonResult] = useState<SummonResult | null>(null);
  const [pendingSummon, setPendingSummon] = useState<SummonResult | null>(null);
  const [fadeBlack, setFadeBlack] = useState(false);
  const fadeTimeout = useRef<number | null>(null);
  const [gateCharging, setGateCharging] = useState(false);
  const [gateBloom, setGateBloom] = useState<"off" | "growing" | "fading">("off");
  const [gateBloomColor, setGateBloomColor] = useState(GATE_BLOOM_DEFAULT);
  const [gateVoidColor, setGateVoidColor] = useState(GATE_VOID_DEFAULT);
  const [gateVoidFilter, setGateVoidFilter] = useState(GATE_VOID_SWIRL_IDLE);
  const [gateGemFilter, setGateGemFilter] = useState(GATE_GEM_FILTER_IDLE);
  const [gateGlowColor, setGateGlowColor] = useState(GATE_GLOW_DEFAULT);
  const gateHoldTimeout = useRef<number | null>(null);
  const gateBloomTimeout = useRef<number | null>(null);
  const [selectedHelper, setSelectedHelper] = useState("Mira");
  const [modeTab, setModeTab] = useState<"events" | "trials">("events");
  const [inventoryTab, setInventoryTab] = useState<"relics" | "materials" | "items">("relics");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [toast, setToast] = useState("");
  const [homeDragX, setHomeDragX] = useState(0);
  const pointerStart = useRef<Record<string, { x: number; y: number; at: number }>>({});
  const battleRef = useRef<BattleState | null>(null);
  const activeAttackIds = useRef(new Set<string>());
  const autoTurnLock = useRef(false);
  const pendingSparkImpacts = useRef<PendingSparkImpact[]>([]);
  const sparkFrameRequest = useRef<number | null>(null);
  const lastSparkAt = useRef(0);
  const battleFlowLock = useRef(false);
  const enemyTurnLock = useRef(false);
  const lastAttackAt = useRef(0);
  const combatLock = useRef(false);
  const menuMusic = useRef<MenuMusicEngine | null>(null);
  const sfxBuffers = useRef<Map<SfxKind, AudioBuffer>>(new Map());
  const sfxLoading = useRef<Map<SfxKind, Promise<AudioBuffer | null>>>(new Map());
  const gameBackgroundPaused = useRef(false);
  const backgroundResumeWaiters = useRef(new Set<() => void>());
  const homeSwipe = useRef({ pointerId: -1, startX: 0, startTime: 0, width: 320, moved: false });
  const unitHold = useRef<{ timer: ReturnType<typeof setTimeout> | null; suppressClick: boolean }>({ timer: null, suppressClick: false });
  const activeBattleQuestId = battle?.questId ?? 0;
  const activeBattleQuest = activeBattleQuestId ? QUESTS.find((quest) => quest.id === activeBattleQuestId) : undefined;
  const musicTrackKey: MusicTrackKey = (() => {
    if (screen === "battle") {
      if (victory) return victory.won ? "victory" : "falling-apart";
      return activeBattleQuest?.chapter === 1 && battle?.mode === "story" ? "battle-one" : "battle-two";
    }
    if (screen === "shop") return "shop";
    return "title-theme";
  })();

  // Every combat layer uses the same shortened cadence. When the page/app is
  // backgrounded we deliberately stop advancing this clock, so a turn cannot
  // finish while the player is in another tab or app.
  const waitForForeground = () => new Promise<void>((resolve) => {
    if (!gameBackgroundPaused.current) {
      resolve();
      return;
    }
    backgroundResumeWaiters.current.add(resolve);
  });
  const waitForBattle = async (milliseconds: number) => {
    let remaining = getBattleDuration(milliseconds, battleSpeed);
    while (remaining > 0) {
      await waitForForeground();
      const slice = Math.min(remaining, 50);
      await new Promise<void>((resolve) => window.setTimeout(resolve, slice));
      if (!gameBackgroundPaused.current) remaining -= slice;
    }
  };

  const updateBattleLive = (updater: (current: BattleState) => BattleState) => {
    const current = battleRef.current;
    if (!current) return null;
    const next = updater(current);
    battleRef.current = next;
    setBattle(next);
    return next;
  };

  const resolveSparkFrame = (unitId: string, targetIds: string[]) => new Promise<Set<string>>((resolve) => {
    pendingSparkImpacts.current.push({ unitId, targetIds: [...new Set(targetIds)], resolve });
    if (sparkFrameRequest.current !== null) return;
    sparkFrameRequest.current = window.requestAnimationFrame(() => {
      const frameImpacts = pendingSparkImpacts.current.splice(0);
      sparkFrameRequest.current = null;
      const unitsByTarget = new Map<string, Set<string>>();
      frameImpacts.forEach((impact) => impact.targetIds.forEach((targetId) => {
        const units = unitsByTarget.get(targetId) ?? new Set<string>();
        units.add(impact.unitId);
        unitsByTarget.set(targetId, units);
      }));
      frameImpacts.forEach((impact) => impact.resolve(new Set(
        impact.targetIds.filter((targetId) => (unitsByTarget.get(targetId)?.size ?? 0) >= 2),
      )));
    });
  });

  useEffect(() => () => {
    if (sparkFrameRequest.current !== null) window.cancelAnimationFrame(sparkFrameRequest.current);
    pendingSparkImpacts.current.splice(0).forEach((impact) => impact.resolve(new Set()));
    sparkFrameRequest.current = null;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("eidolon-frontier-save-v1");
      // Restoring a local-only game save is intentionally performed once after hydration.
      if (raw) {
        const restored = JSON.parse(raw) as Partial<SaveState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSave({
          ...defaultSave,
          ...restored,
          unitLevels: { ...defaultSave.unitLevels, ...(restored.unitLevels ?? {}) },
          unitStars: { ...defaultSave.unitStars, ...(restored.unitStars ?? {}) },
          unitXp: { ...defaultSave.unitXp, ...(restored.unitXp ?? {}) },
          burstLevels: { ...defaultSave.burstLevels, ...(restored.burstLevels ?? {}) },
          materials: { ...defaultSave.materials, ...(restored.materials ?? {}) },
          equippedRelics: { ...defaultSave.equippedRelics, ...(restored.equippedRelics ?? {}) },
          townResources: { ...defaultSave.townResources, ...(restored.townResources ?? {}) },
          squads: restored.squads?.length ? restored.squads : defaultSave.squads,
        });
      }
      const storedAudio = localStorage.getItem("eidolon-frontier-audio-v1");
      if (storedAudio === "off") setSoundOn(false);
      const storedSettings = localStorage.getItem("gates-of-azura-settings-v1");
      if (storedSettings) {
        const restored = JSON.parse(storedSettings) as Partial<GameSettings>;
        setGameSettings({
          musicVolume: Math.max(0, Math.min(100, Number(restored.musicVolume ?? DEFAULT_GAME_SETTINGS.musicVolume))),
          sfxVolume: Math.max(0, Math.min(100, Number(restored.sfxVolume ?? DEFAULT_GAME_SETTINGS.sfxVolume))),
          vibration: restored.vibration ?? DEFAULT_GAME_SETTINGS.vibration,
          screenShake: restored.screenShake ?? DEFAULT_GAME_SETTINGS.screenShake,
          damageNumbers: restored.damageNumbers ?? DEFAULT_GAME_SETTINGS.damageNumbers,
          reducedEffects: restored.reducedEffects ?? DEFAULT_GAME_SETTINGS.reducedEffects,
        });
      }
    } catch {
      // A fresh save is always playable.
    }
    setHydrated(true);
    const requestedScreen = new URLSearchParams(window.location.search).get("open");
    if (requestedScreen === "quests" || requestedScreen === "units") setScreen(requestedScreen);
    // Registering the cache-first PWA service worker while actively developing lets a
    // stale cached copy of the app shell render underneath live/HMR-updated content —
    // it looks exactly like the page is duplicated. Only register it in production
    // builds; a dev server has no business behind an offline cache anyway.
    if (import.meta.env.PROD && window.location.hostname !== "appassets.androidplatform.net" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  // Preload every hero's 5-star art before the title screen offers "start" —
  // this is also the collage the title background is built from, so it must
  // already be decoded before the player ever sees it.
  useEffect(() => {
    let cancelled = false;
    const sources = UNITS.map((unit) => getFormPortrait(unit, 5) ?? unit.keyArt);
    let settled = 0;
    const settle = () => {
      settled += 1;
      if (settled >= sources.length && !cancelled) setTitleAssetsReady(true);
    };
    if (sources.length === 0) {
      setTitleAssetsReady(true);
    } else {
      sources.forEach((src) => {
        if (!src) { settle(); return; }
        const image = new Image();
        image.onload = settle;
        image.onerror = settle;
        image.src = src;
      });
    }
    // Never let a slow connection or a missing file trap the player on the
    // loading screen — fall through to the title after a short ceiling.
    const ceiling = window.setTimeout(() => { if (!cancelled) setTitleAssetsReady(true); }, 6000);
    return () => { cancelled = true; window.clearTimeout(ceiling); };
  }, []);

  // Enemy/unit positions, weapon contact points, and stagger math are all
  // authored in pixels against a fixed 430x355 reference battlefield — that
  // coordinate system is used consistently everywhere it appears, but the
  // actual .battlefield box is fluid (min 100% width up to 430px, height can
  // grow), so on real devices the reference frame didn't match the box it
  // was drawn into and everything drifted between screen sizes. Rather than
  // rederiving every position/contact-point formula as a percentage (risking
  // misaligned hit VFX), the battlefield's live size is measured here and
  // the whole 430x355 reference frame is scaled and centred to fit it as one
  // block in the JSX below — every position inside stays exactly where it
  // was authored relative to everything else, at any resolution.
  useEffect(() => {
    if (screen !== "battle") return;
    const node = battlefieldRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.round(entry.contentRect.width);
      const nextHeight = Math.round(entry.contentRect.height);
      if (nextWidth > 0 && nextHeight > 0) {
        setBattlefieldSize((current) => (current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight }));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [screen]);

  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!menuMusic.current) {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = 0.0001;
        master.connect(context.destination);
        menuMusic.current = { context, master, cache: new Map(), active: null, requestId: 0 };
      }
      void menuMusic.current.context.resume();
      setAudioReady(true);
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      const engine = menuMusic.current;
      if (engine) {
        engine.requestId += 1;
        try { engine.active?.source.stop(); } catch { /* Source may already have ended. */ }
        void engine.context.close();
      }
      menuMusic.current = null;
    };
  }, []);

  useEffect(() => {
    const setBackgroundPaused = (paused: boolean) => {
      gameBackgroundPaused.current = paused;
      document.documentElement.classList.toggle("game-background-paused", paused);
      const engine = menuMusic.current;
      if (engine && engine.context.state !== "closed") {
        if (paused) {
          void engine.context.suspend();
        } else {
          void engine.context.resume().catch(() => undefined);
        }
      }
      if (!paused && backgroundResumeWaiters.current.size) {
        const waiters = [...backgroundResumeWaiters.current];
        backgroundResumeWaiters.current.clear();
        waiters.forEach((resume) => resume());
      }
    };
    const syncVisibility = () => setBackgroundPaused(document.hidden);
    const pauseForPageHide = () => setBackgroundPaused(true);
    const resumeForPageShow = () => setBackgroundPaused(document.hidden);

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pagehide", pauseForPageHide);
    window.addEventListener("pageshow", resumeForPageShow);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pagehide", pauseForPageHide);
      window.removeEventListener("pageshow", resumeForPageShow);
      document.documentElement.classList.remove("game-background-paused");
      const waiters = [...backgroundResumeWaiters.current];
      backgroundResumeWaiters.current.clear();
      waiters.forEach((resume) => resume());
    };
  }, []);

  useEffect(() => {
    const engine = menuMusic.current;
    if (!audioReady || !engine) return;
    const now = engine.context.currentTime;
    engine.master.gain.cancelScheduledValues(now);
    const requestedVolume = soundOn ? Math.max(0.0001, gameSettings.musicVolume / 100) : 0.0001;
    engine.master.gain.setTargetAtTime(requestedVolume, now, 0.18);
    if (!soundOn || engine.active?.key === musicTrackKey) return;

    const track = MUSIC_TRACKS[musicTrackKey];
    const requestId = ++engine.requestId;
    let cancelled = false;
    const changeTrack = async () => {
      try {
        let buffer = engine.cache.get(musicTrackKey);
        if (!buffer) {
          const response = await fetch(track.src, { cache: "force-cache" });
          if (!response.ok) throw new Error(`Unable to load ${track.title}`);
          buffer = await engine.context.decodeAudioData(await response.arrayBuffer());
          engine.cache.set(musicTrackKey, buffer);
        }
        if (cancelled || requestId !== engine.requestId || engine.context.state === "closed") return;

        const source = engine.context.createBufferSource();
        const gain = engine.context.createGain();
        const start = engine.context.currentTime;
        const loopEnd = Math.min(track.loopEnd ?? buffer.duration, buffer.duration);
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = Math.min(track.loopStart, Math.max(0, loopEnd - 0.05));
        source.loopEnd = loopEnd;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(track.volume, start + 0.65);
        source.connect(gain).connect(engine.master);

        const previous = engine.active;
        engine.active = { key: musicTrackKey, source, gain };
        source.start(start);
        if (previous) {
          previous.gain.gain.cancelScheduledValues(start);
          previous.gain.gain.setValueAtTime(Math.max(0.0001, previous.gain.gain.value), start);
          previous.gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);
          try { previous.source.stop(start + 0.72); } catch { /* Source may already have ended. */ }
        }
      } catch {
        // Sound effects and the rest of the game continue if a soundtrack file cannot load.
      }
    };
    void changeTrack();
    return () => { cancelled = true; };
  }, [audioReady, gameSettings.musicVolume, musicTrackKey, soundOn]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("eidolon-frontier-save-v1", JSON.stringify(save));
  }, [save, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("eidolon-frontier-audio-v1", soundOn ? "on" : "off");
  }, [hydrated, soundOn]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("gates-of-azura-settings-v1", JSON.stringify(gameSettings));
  }, [gameSettings, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2100);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const refill = () => {
      const now = Date.now();
      setClockNow(now);
      setSave((current) => {
        const energyGained = current.energy >= current.maxEnergy ? 0 : Math.floor((now - current.lastEnergyAt) / ENERGY_REGEN_MS);
        const arenaGained = current.arenaOrbs >= MAX_ARENA_ORBS ? 0 : Math.floor((now - current.lastArenaAt) / ARENA_REGEN_MS);
        if (energyGained < 1 && arenaGained < 1) return current;
        return {
          ...current,
          energy: Math.min(current.maxEnergy, current.energy + Math.max(0, energyGained)),
          lastEnergyAt: energyGained > 0 ? current.lastEnergyAt + energyGained * ENERGY_REGEN_MS : current.lastEnergyAt,
          arenaOrbs: Math.min(MAX_ARENA_ORBS, current.arenaOrbs + Math.max(0, arenaGained)),
          lastArenaAt: arenaGained > 0 ? current.lastArenaAt + arenaGained * ARENA_REGEN_MS : current.lastArenaAt,
        };
      });
    };
    refill();
    const timer = window.setInterval(refill, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  useEffect(() => {
    const measureBattlefield = () => setBattlefieldWidth(Math.min(430, window.innerWidth));
    const frame = window.requestAnimationFrame(measureBattlefield);
    window.addEventListener("resize", measureBattlefield);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureBattlefield);
    };
  }, []);

  const ownedUnits = useMemo(() => save.owned.map(getUnit), [save.owned]);
  const filteredUnits = useMemo(() => {
    const units = unitFilter === "all" ? [...UNITS] : UNITS.filter((unit) => unit.element === unitFilter);
    return units.sort((first, second) => unitSort === "rarity"
      ? (save.unitStars[second.id] ?? 0) - (save.unitStars[first.id] ?? 0) || second.atk - first.atk
      : (save.unitLevels[second.id] ?? 0) - (save.unitLevels[first.id] ?? 0));
  }, [save.unitLevels, save.unitStars, unitFilter, unitSort]);
  const squadPower = useMemo(() => save.party.reduce((total, id) => total + (save.unitLevels[id] ?? 1) + Math.round(getUnit(id).atk / 120), 0), [save.party, save.unitLevels]);
  const selectedUnit = getUnit(selectedUnitId);

  const go = (next: Screen) => {
    setVictory(null);
    setMenuOpen(false);
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  // Fades the whole app to black, swaps the screen (and runs any state
  // change that should land while nothing is visible), then fades back in.
  const FADE_MS = 380;
  const fadeToScreen = (next: Screen, onCommit?: () => void) => {
    if (fadeTimeout.current !== null) window.clearTimeout(fadeTimeout.current);
    setFadeBlack(true);
    fadeTimeout.current = window.setTimeout(() => {
      onCommit?.();
      go(next);
      fadeTimeout.current = window.setTimeout(() => setFadeBlack(false), 20);
    }, FADE_MS);
  };

  const toggleSound = () => {
    setSoundOn((current) => {
      const next = !current;
      setToast(next ? "Game music on" : "Game music muted");
      if (next) void menuMusic.current?.context.resume();
      return next;
    });
  };

  const updateGameSetting = <Key extends keyof GameSettings>(key: Key, value: GameSettings[Key]) => {
    setGameSettings((current) => ({ ...current, [key]: value }));
  };

  const loadSfxBuffer = async (context: AudioContext, kind: SfxKind) => {
    const cached = sfxBuffers.current.get(kind);
    if (cached) return cached;
    const pending = sfxLoading.current.get(kind);
    if (pending) return pending;
    const request = (async () => {
      try {
        const response = await fetch(SFX_FILES[kind]);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        sfxBuffers.current.set(kind, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        sfxLoading.current.delete(kind);
      }
    })();
    sfxLoading.current.set(kind, request);
    return request;
  };

  const playSfx = (kind: SfxKind) => {
    if (gameSettings.vibration && "vibrate" in navigator) {
      const vibration = {
        tap: 0,
        hit: 8,
        spark: 14,
        burst: [18, 18, 24],
        crystal: 5,
        warning: [20, 35, 20],
        victory: [12, 25, 18],
        evolve: [10, 18, 28],
        guard: 10,
        buy: 6,
        equip: 6,
        summon: 16,
        denied: [8, 8],
      }[kind];
      if (vibration) navigator.vibrate(vibration);
    }
    const context = menuMusic.current?.context;
    if (!soundOn || !context || gameSettings.sfxVolume <= 0) return;
    void (async () => {
      const buffer = await loadSfxBuffer(context, kind);
      if (!buffer) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = Math.max(0, Math.min(1, (gameSettings.sfxVolume / 100) * SFX_MIX[kind]));
      source.connect(gain).connect(context.destination);
      source.start();
    })();
  };

  const claimDaily = () => {
    if (save.dailyClaimed === todayKey()) return;
    setSave((current) => ({ ...current, gems: current.gems + 3, gold: current.gold + 1200, dailyClaimed: todayKey() }));
    setToast("Daily cache: +3 gems, +1,200 gold");
  };

  const installApp = async () => {
    if (!installPrompt) {
      setToast("On Android: browser menu → Add to Home screen");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  const openStory = (questId: number) => {
    const quest = QUESTS.find((item) => item.id === questId)!;
    if (questId > save.unlockedStage) return;
    if (save.energy < quest.energy) {
      setToast("Not enough energy");
      return;
    }
    setStoryQuestId(questId);
    setStoryStep(0);
    setScreen("story");
  };

  const beginBattle = () => {
    const quest = QUESTS.find((item) => item.id === storyQuestId)!;
    if (save.energy < quest.energy) {
      setToast("Not enough energy");
      go("quests");
      return;
    }
    const openingEnemies = createWaveEnemies(quest, 0);
    setSave((current) => ({ ...current, energy: current.energy - quest.energy, lastEnergyAt: current.energy >= current.maxEnergy ? Date.now() : current.lastEnergyAt }));
    setBattle({
      questId: quest.id,
      wave: 0,
      enemies: openingEnemies,
      targetEnemyId: "",
      turn: 1,
      combo: 0,
      mode: quest.mode ?? "story",
      loot: { gold: 0, materials: 0, hearts: 0, crystals: 0 },
      telegraph: null,
      party: save.party.map((id) => ({
        id,
        hp: getFormStat(getUnit(id), save.unitStars[id] ?? 3, save.unitLevels[id] ?? 1, "hp"),
        gauge: selectedHelper === "Mira" ? 15 : 0,
        acted: false,
        guarding: false,
        buffs: selectedHelper === "Elian" ? ["ATK UP"] : selectedHelper === "Sana" ? ["REC UP"] : [],
        ailment: "",
      })),
      message: `${openingEnemies.length} Riftborn block the path — no focus set. Single-target chains prioritize the uppermost foe.`,
    });
    activeAttackIds.current.clear();
    battleFlowLock.current = false;
    enemyTurnLock.current = false;
    setAttackFxs([]);
    setDamageFxs([]);
    setCrystalFxs([]);
    combatLock.current = false;
    setCombatFx({ phase: "opening", serial: Date.now(), activeUnitId: "", activeEnemyId: "", targetUnitId: "", targetEnemyId: "", damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: "WAVE 1" });
    window.setTimeout(() => setCombatFx((current) => ({ ...current, phase: "ready", label: "" })), 900);
    setVictory(null);
    setScreen("battle");
  };

  const usePotion = () => {
    if (!battleRef.current || save.potions < 1) return;
    updateBattleLive((current) => ({
      ...current,
      party: current.party.map((member) => {
        const maxHp = getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp");
        return { ...member, hp: Math.min(maxHp, member.hp + Math.round(maxHp * 0.35)) };
      }),
      message: "Restorative mist heals the squad.",
    }));
    setSave((current) => ({ ...current, potions: current.potions - 1 }));
    playSfx("crystal");
  };

  const selectEnemyTarget = (instanceId: string) => {
    const current = battleRef.current;
    if (!current || enemyTurnLock.current || battleFlowLock.current) return;
    const target = current.enemies.find((enemy) => enemy.instanceId === instanceId && enemy.hp > 0);
    if (!target) return;
    const enemy = getEnemy(target.enemyId);
    const clearingFocus = current.targetEnemyId === instanceId;
    updateBattleLive((state) => ({
      ...state,
      targetEnemyId: clearingFocus ? "" : instanceId,
      message: clearingFocus
        ? `${enemy.name} focus cleared — single-target attacks return to upper-foe priority.`
        : `${enemy.name} marked — single-target attacks will concentrate on it. Tap it again to clear.`,
    }));
    setCombatFx((currentFx) => ({ ...currentFx, targetEnemyId: clearingFocus ? "" : instanceId }));
    playSfx("tap");
  };

  const resolveEnemyTurn = async (state: BattleState) => {
    const quest = QUESTS.find((item) => item.id === state.questId)!;
    const attackers = state.enemies.filter((enemy) => enemy.hp > 0);
    let nextParty = state.party;

    if (!nextParty.some((member) => member.hp > 0)) {
      setVictory({ won: false, reward: 0 });
      combatLock.current = false;
      return;
    }

    for (let index = 0; index < attackers.length; index += 1) {
      const attacker = attackers[index];
      const enemy = getEnemy(attacker.enemyId);
      const living = nextParty.filter((member) => member.hp > 0);
      if (!living.length) break;
      const target = living[Math.floor(Math.random() * living.length)];
      const targetUnit = getUnit(target.id);
      const pressure = 90 + quest.id * 28 + state.wave * 24 + state.turn * 9 + Math.round(enemy.hp * 0.012);
      const rawDamage = Math.max(85, Math.round(pressure - targetUnit.def * 0.035));
      const enemyDamage = target.guarding ? Math.round(rawDamage * 0.42) : rawDamage;

      setCombatFx({
        phase: "enemy",
        serial: Date.now() + index,
        activeUnitId: "",
        activeEnemyId: attacker.instanceId,
        targetUnitId: target.id,
        targetEnemyId: state.targetEnemyId,
        damage: enemyDamage,
        hits: 1,
        hitFrame: 0,
        spark: false,
        weakness: false,
        label: target.guarding ? "GUARDED" : "ENEMY STRIKE",
      });
      setBattle({ ...state, party: nextParty, message: `${enemy.name} lunges from the enemy line…` });
      await waitForBattle(360);

      nextParty = nextParty.map((member) => member.id === target.id ? { ...member, hp: Math.max(0, member.hp - enemyDamage) } : member);
      setBattle({ ...state, party: nextParty, message: `${enemy.name} strikes — ${targetUnit.name} takes ${enemyDamage.toLocaleString()}${target.guarding ? " through Guard" : ""}.` });
      await waitForBattle(190);
    }

    const afterEnemy = nextParty.map((member) => ({ ...member, acted: false, guarding: false }));
    const defeated = afterEnemy.every((member) => member.hp <= 0);
    setBattle({
      ...state,
      turn: state.turn + 1,
      combo: 0,
      party: afterEnemy,
      message: defeated ? "The enemy formation overwhelms the squad." : "Enemy assault complete — the squad is ready.",
    });
    await waitForBattle(320);
    if (defeated) setVictory({ won: false, reward: 0 });
    setCombatFx((current) => ({ ...current, phase: "ready", activeEnemyId: "", targetUnitId: "", hitFrame: 0, label: "" }));
    combatLock.current = false;
  };

  // Retained as a compatibility fallback for older cached clients; the live UI uses queueAttack.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const executeAttack = async (unitId: string, wantsBurst = false) => {
    if (!battle || victory || combatLock.current || combatFx.phase !== "ready") return;
    const quest = QUESTS.find((item) => item.id === battle.questId)!;
    const actor = battle.party.find((member) => member.id === unitId);
    if (!actor || actor.acted || actor.hp <= 0) return;
    const target = battle.enemies.find((enemy) => enemy.instanceId === battle.targetEnemyId && enemy.hp > 0)
      ?? battle.enemies.find((enemy) => enemy.hp > 0);
    if (!target) return;

    combatLock.current = true;
    const unit = getUnit(unitId);
    const stars = save.unitStars[unitId] ?? 3;
    const combatProfile = getUnitCombatProfile(unit, stars);
    const battleSprites = getBattleSpriteSet(unit, stars);
    const enemy = getEnemy(target.enemyId);
    const burst = wantsBurst && actor.gauge >= 100;
    const now = Date.now();
    const combo = now - lastAttackAt.current < 1250 ? Math.min(battle.combo + 1, 12) : 1;
    lastAttackAt.current = now;
    const advantage = ELEMENTS[unit.element].strong === enemy.element ? 1.45 : ELEMENTS[enemy.element].strong === unit.element ? 0.78 : 1;
    const level = save.unitLevels[unit.id] ?? 1;
    const base = getFormStat(unit, stars, level, "atk");
    const damage = burst && !combatProfile.burstDoesDamage ? 0 : Math.round(base * (burst ? combatProfile.burstMultiplier : combatProfile.attackMultiplier) * advantage * (1 + (combo - 1) * 0.08));
    const normalHits = battleSprites.attack.length;
    const hits = burst ? combatProfile.burstHits : normalHits;
    let updatedParty = battle.party.map((member) =>
      member.id === unitId
        ? { ...member, acted: true, guarding: false, gauge: burst ? 0 : Math.min(100, member.gauge + combatProfile.gaugeGain) }
        : member,
    );
    if (burst && combatProfile.healRatio > 0) {
      updatedParty = updatedParty.map((member) => {
        const memberUnit = getUnit(member.id);
        const memberStars = save.unitStars[member.id] ?? 3;
        const maxHp = getFormStat(memberUnit, memberStars, save.unitLevels[member.id] ?? 1, "hp");
        return { ...member, hp: Math.min(maxHp, member.hp + Math.round(maxHp * combatProfile.healRatio)), ailment: combatProfile.cleanse ? "" : member.ailment };
      });
    }
    const hitMessage = burst
      ? `${combatProfile.burstName}! Aether Burst`
      : `${unit.name} closes on ${enemy.name}${advantage > 1 ? " — elemental advantage!" : ""}`;
    const animationSteps = burst ? Math.min(6, Math.max(4, Math.ceil(hits / 3))) : hits;
    const baseStepDamage = Math.floor(damage / animationSteps);
    const extraDamage = damage - baseStepDamage * animationSteps;

    setBattle({ ...battle, party: updatedParty, targetEnemyId: target.instanceId, message: hitMessage });
    setCombatFx({
      phase: burst ? "burst" : "attacking",
      serial: now,
      activeUnitId: unitId,
      activeEnemyId: "",
      targetUnitId: "",
      targetEnemyId: target.instanceId,
      damage: 0,
      hits,
      hitFrame: 0,
      spark: combo > 1,
      weakness: advantage > 1,
      label: burst ? combatProfile.burstName : combatProfile.attackName,
    });

    if (burst) await waitForBattle(340);
    let accumulatedDamage = 0;
    for (let step = 0; step < animationSteps; step += 1) {
      const stepDamage = baseStepDamage + (step < extraDamage ? 1 : 0);
      accumulatedDamage += stepDamage;
      const finalStep = step === animationSteps - 1;
      const displayedHp = finalStep ? Math.max(0, target.hp - damage) : Math.max(1, target.hp - accumulatedDamage);
      const frameEnemies = battle.enemies.map((member) => member.instanceId === target.instanceId ? { ...member, hp: displayedHp } : member);
      setBattle({
        ...battle,
        enemies: frameEnemies,
        targetEnemyId: target.instanceId,
        party: updatedParty,
        combo,
        message: burst ? combatProfile.burstDoesDamage ? `${combatProfile.burstName} tears through ${enemy.name}!` : `${combatProfile.burstName} restores the squad!` : `${unit.name} uses ${combatProfile.attackName}.`,
      });
      setCombatFx({
        phase: burst ? "burst" : "attacking",
        serial: now,
        activeUnitId: unitId,
        activeEnemyId: "",
        targetUnitId: "",
        targetEnemyId: target.instanceId,
        damage: stepDamage,
        hits,
        hitFrame: step,
        spark: combo > 1,
        weakness: advantage > 1,
        label: burst ? combatProfile.burstName : combatProfile.attackName,
      });
      await waitForBattle(burst ? 115 : 145);
    }
    await waitForBattle(burst ? 300 : 130);

    const resolvedEnemies = battle.enemies.map((member) => member.instanceId === target.instanceId ? { ...member, hp: Math.max(0, target.hp - damage) } : member);
    const survivingEnemies = resolvedEnemies.filter((member) => member.hp > 0);
    const nextTargetId = survivingEnemies.some((member) => member.instanceId === target.instanceId)
      ? target.instanceId
      : survivingEnemies[0]?.instanceId ?? "";

    const resolvedState: BattleState = {
      ...battle,
      enemies: resolvedEnemies,
      targetEnemyId: nextTargetId,
      party: updatedParty,
      combo,
      message: `${damage.toLocaleString()} total damage to ${enemy.name}${combo > 1 ? ` · Aether Spark x${combo}` : ""}`,
    };
    setBattle(resolvedState);

    if (!survivingEnemies.length) {
      await waitForBattle(430);
      if (battle.wave < quest.waves.length - 1) {
        const nextWave = battle.wave + 1;
        const nextEnemies = createWaveEnemies(quest, nextWave);
        const nextState: BattleState = {
          ...resolvedState,
          wave: nextWave,
          enemies: nextEnemies,
          targetEnemyId: nextEnemies[0].instanceId,
          combo: 0,
          party: updatedParty.map((member) => ({ ...member, acted: false, guarding: false })),
          message: `Wave ${nextWave + 1}: ${nextEnemies.length} Riftborn emerge — choose a target!`,
        };
        setBattle(nextState);
        setCombatFx({ phase: "wave", serial: Date.now(), activeUnitId: "", activeEnemyId: "", targetUnitId: "", targetEnemyId: nextEnemies[0].instanceId, damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: nextWave === quest.waves.length - 1 ? "BOSS WAVE" : `WAVE ${nextWave + 1}` });
        await waitForBattle(900);
        setCombatFx((current) => ({ ...current, phase: "ready", label: "" }));
        combatLock.current = false;
        return;
      }
      setBattle({ ...resolvedState, message: `${unit.name} lands the finishing blow!` });
      await waitForBattle(600);
      setVictory({ won: true, reward: quest.reward });
      setCombatFx((current) => ({ ...current, phase: "ready", activeUnitId: "", targetEnemyId: "", hitFrame: 0, label: "" }));
      combatLock.current = false;
      return;
    }

    if (target.hp - damage <= 0) {
      setBattle({ ...resolvedState, message: `${enemy.name} defeated — target switched to ${getEnemy(survivingEnemies[0].enemyId).name}.` });
    }

    const living = updatedParty.filter((member) => member.hp > 0);
    if (living.every((member) => member.acted)) {
      await waitForBattle(330);
      await resolveEnemyTurn(resolvedState);
      return;
    }
    await waitForBattle(180);
    setCombatFx((current) => ({ ...current, phase: "ready", activeUnitId: "", targetEnemyId: nextTargetId, hitFrame: 0, label: "" }));
    combatLock.current = false;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const guardUnit = async (unitId: string) => {
    if (!battle || victory || combatLock.current || combatFx.phase !== "ready") return;
    const actor = battle.party.find((member) => member.id === unitId);
    if (!actor || actor.acted || actor.hp <= 0) return;
    combatLock.current = true;
    const guardedState: BattleState = {
      ...battle,
      combo: 0,
      party: battle.party.map((member) => member.id === unitId ? { ...member, acted: true, guarding: true } : member),
      message: `${getUnit(unitId).name} braces behind an Aether ward.`,
    };
    setBattle(guardedState);
    setCombatFx({ phase: "guarding", serial: Date.now(), activeUnitId: unitId, activeEnemyId: "", targetUnitId: "", targetEnemyId: battle.targetEnemyId, damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: "GUARD" });
    await waitForBattle(380);
    const living = guardedState.party.filter((member) => member.hp > 0);
    if (living.every((member) => member.acted)) {
      await resolveEnemyTurn(guardedState);
      return;
    }
    setCombatFx((current) => ({ ...current, phase: "ready", activeUnitId: "", label: "" }));
    combatLock.current = false;
  };

  const runModernEnemyTurn = async () => {
    if (enemyTurnLock.current) return;
    enemyTurnLock.current = true;
    const opening = battleRef.current;
    if (!opening) {
      enemyTurnLock.current = false;
      battleFlowLock.current = false;
      return;
    }
    const quest = QUESTS.find((item) => item.id === opening.questId)!;
    const bossInstance = opening.enemies.find((member) => member.hp > 0 && getEnemy(member.enemyId).boss);
    const unleashing = Boolean(bossInstance && opening.telegraph && opening.telegraph.turns <= 1);

    if (unleashing && bossInstance) {
      const boss = getEnemy(bossInstance.enemyId);
      playSfx("warning");
      setCombatFx({ phase: "enemy", serial: Date.now(), activeUnitId: "", activeEnemyId: bossInstance.instanceId, targetUnitId: "", targetEnemyId: opening.targetEnemyId, damage: 0, hits: 1, hitFrame: 0, spark: false, weakness: false, label: boss.skill ?? "RIFT ART" });
      updateBattleLive((state) => ({ ...state, message: `${boss.name} unleashes ${boss.skill}!` }));
      setScreenImpact((value) => value + 1);
      await waitForBattle(620);
    }

    const attackers = [...(battleRef.current?.enemies ?? [])].filter((enemy) => enemy.hp > 0);
    for (let index = 0; index < attackers.length; index += 1) {
      const liveState = battleRef.current;
      if (!liveState) break;
      const attacker = liveState.enemies.find((enemy) => enemy.instanceId === attackers[index].instanceId && enemy.hp > 0);
      if (!attacker) continue;
      const enemy = getEnemy(attacker.enemyId);
      const living = liveState.party.filter((member) => member.hp > 0);
      if (!living.length) break;
      const targets = unleashing && enemy.boss ? living : [living[Math.floor(Math.random() * living.length)]];

      for (const target of targets) {
        const targetUnit = getUnit(target.id);
        const stars = save.unitStars[target.id] ?? 3;
        const defence = getFormStat(targetUnit, stars, save.unitLevels[target.id] ?? 1, "def");
        const elemental = ELEMENTS[enemy.element].strong === targetUnit.element ? 1.25 : 1;
        const pressure = enemy.attack + quest.chapter * 35 + liveState.wave * 18 + liveState.turn * 7;
        const rawDamage = Math.max(62, Math.round((pressure * elemental - defence * 0.075) * (unleashing && enemy.boss ? 1.7 : 1)));
        const damage = target.guarding ? Math.round(rawDamage * 0.4) : rawDamage;
        setCombatFx({
          phase: "enemy", serial: Date.now() + index, activeUnitId: "", activeEnemyId: attacker.instanceId,
          targetUnitId: target.id, targetEnemyId: liveState.targetEnemyId, damage, hits: unleashing && enemy.boss ? targets.length : 1,
          hitFrame: 0, spark: false, weakness: elemental > 1, label: unleashing && enemy.boss ? enemy.skill ?? "RIFT ART" : target.guarding ? "GUARDED" : "ENEMY STRIKE",
        });
        updateBattleLive((state) => ({ ...state, message: `${enemy.name} attacks ${targetUnit.name}…` }));
        await waitForBattle(260);
        playSfx("hit");
        setScreenImpact((value) => value + 1);
        updateBattleLive((state) => ({
          ...state,
          party: state.party.map((member) => member.id === target.id ? {
            ...member,
            hp: Math.max(0, member.hp - damage),
            ailment: enemy.boss && Math.random() < 0.22 ? (enemy.element === "fire" ? "Burn" : enemy.element === "water" ? "Chill" : enemy.element === "dark" ? "Curse" : "Shock") : member.ailment,
          } : member),
          message: `${targetUnit.name} takes ${damage.toLocaleString()}${target.guarding ? " through Guard" : ""}.`,
        }));
        await waitForBattle(150);
      }
    }

    const after = battleRef.current;
    if (!after) {
      enemyTurnLock.current = false;
      battleFlowLock.current = false;
      return;
    }
    const nextTelegraph = bossInstance
      ? unleashing
        ? { label: getEnemy(bossInstance.enemyId).skill ?? "Rift Art", turns: 3 }
        : after.telegraph
          ? { ...after.telegraph, turns: Math.max(1, after.telegraph.turns - 1) }
          : { label: getEnemy(bossInstance.enemyId).skill ?? "Rift Art", turns: 2 }
      : null;
    const reset = updateBattleLive((state) => ({
      ...state,
      turn: state.turn + 1,
      combo: 0,
      telegraph: nextTelegraph,
      party: state.party.map((member) => {
        const ailmentTick = member.ailment === "Burn" || member.ailment === "Curse" ? Math.max(25, Math.round(getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp") * 0.04)) : 0;
        return { ...member, hp: Math.max(0, member.hp - ailmentTick), acted: false, guarding: false };
      }),
      message: "Enemy assault complete — all five units are ready.",
    }));
    await waitForBattle(280);
    const defeated = !reset?.party.some((member) => member.hp > 0);
    if (defeated) setVictory({ won: false, reward: 0 });
    setCombatFx((current) => ({ ...current, phase: "ready", activeEnemyId: "", targetUnitId: "", damage: 0, label: "" }));
    enemyTurnLock.current = false;
    battleFlowLock.current = false;
  };

  const advanceModernBattle = async () => {
    if (battleFlowLock.current || activeAttackIds.current.size > 0) return;
    const state = battleRef.current;
    if (!state || victory) return;
    const quest = QUESTS.find((item) => item.id === state.questId)!;
    const livingEnemies = state.enemies.filter((enemy) => enemy.hp > 0);

    if (!livingEnemies.length) {
      battleFlowLock.current = true;
      await waitForBattle(360);
      if (state.wave < quest.waves.length - 1) {
        const nextWave = state.wave + 1;
        const nextEnemies = createWaveEnemies(quest, nextWave);
        const boss = nextEnemies.find((member) => getEnemy(member.enemyId).boss);
        updateBattleLive((current) => ({
          ...current,
          wave: nextWave,
          enemies: nextEnemies,
          targetEnemyId: "",
          combo: 0,
          telegraph: boss ? { label: getEnemy(boss.enemyId).skill ?? "Rift Art", turns: 2 } : null,
          party: current.party.map((member) => ({ ...member, acted: false, guarding: false })),
          message: `Wave ${nextWave + 1}: ${nextEnemies.length} Riftborn take formation — focus is clear.`,
        }));
        setCombatFx({ phase: "wave", serial: Date.now(), activeUnitId: "", activeEnemyId: "", targetUnitId: "", targetEnemyId: "", damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: boss ? "BOSS WAVE" : `WAVE ${nextWave + 1}` });
        await waitForBattle(900);
        setCombatFx((current) => ({ ...current, phase: "ready", label: "" }));
        battleFlowLock.current = false;
        return;
      }
      updateBattleLive((current) => ({ ...current, message: "The Riftborn line breaks. Quest complete!" }));
      playSfx("victory");
      setVictory({ won: true, reward: quest.reward });
      setCombatFx((current) => ({ ...current, phase: "ready", activeUnitId: "", targetEnemyId: "", damage: 0, label: "" }));
      battleFlowLock.current = false;
      return;
    }

    const livingParty = state.party.filter((member) => member.hp > 0);
    if (livingParty.length && livingParty.every((member) => member.acted)) {
      battleFlowLock.current = true;
      await waitForBattle(250);
      await runModernEnemyTurn();
    }
  };

  // Generic executor for a pre-built ActionTimeline: the one place that owns
  // an attack's full lifecycle (approach, per-beat pose playback, live
  // damage/loot resolution, wrap-up, UI unlock) for every unit.
  const playActionTimeline = async (timeline: ActionTimeline, quest: Quest) => {
    const unitId = timeline.unitId;
    const unit = getUnit(unitId);
    activeAttackIds.current.add(unitId);

    updateBattleLive((state) => ({
      ...state,
      party: state.party.map((member) => member.id === unitId ? { ...member, acted: true, guarding: false, gauge: timeline.burst ? 0 : member.gauge } : member),
      message: state.targetEnemyId ? timeline.launchMessageWithFocus : timeline.launchMessageWithoutFocus,
    }));

    setAttackFxs((current) => [...current, {
      id: timeline.attackId,
      unitId,
      stage: "approach",
      volley: 0,
      ...timeline.initialFx,
    }]);
    playSfx(timeline.launchSfx);

    for (const node of timeline.approach) {
      if (Object.keys(node.patch).length > 0) {
        setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, ...node.patch } : fx));
      }
      if (node.sfx) playSfx(node.sfx);
      await waitForBattle(node.holdMs);
    }

    for (const beat of timeline.beats) {
      const state = battleRef.current;
      if (!state) break;
      // A move owns the targets it selected at launch — a single-target
      // chain never hops to a second enemy after a lethal hit.
      const targets = state.enemies.filter((enemy) => timeline.lockedTargetIds.includes(enemy.instanceId));
      const primaryTarget = targets[0];
      if (!primaryTarget) break;
      const visualTargetId = primaryTarget.instanceId;

      for (const node of beat.poses) {
        setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, ...node.patch, targetEnemyId: visualTargetId } : fx));
        if (node.sfx) playSfx(node.sfx);
        await waitForBattle(node.holdMs);
      }

      const impact = beat.impact;
      const supportBurst = timeline.supportBurst;
      const sparkTargets = timeline.resolvesSpark ? await resolveSparkFrame(unitId, targets.map((target) => target.instanceId)) : new Set<string>();
      const critical = !supportBurst && Math.random() < CRITICAL_CHANCE;
      const now = performance.now();
      const timingScale = getBattleTimeScale(battleSpeed);
      const heartDrop = !supportBurst && primaryTarget.hp > 0 && impact.heartDropEligible && state.party.some((member) => member.hp > 0 && member.hp < getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp"));
      const anySpark = sparkTargets.size > 0;
      const ailment = (timeline.burst && timeline.burstAilment) || (anySpark && timeline.sparkAilment) || (critical && timeline.critAilment) || "";
      const outcomes = targets.map((target, targetIndex) => {
        const enemy = getEnemy(target.enemyId);
        const advantage = ELEMENTS[unit.element].strong === enemy.element ? 1.45 : ELEMENTS[enemy.element].strong === unit.element ? 0.78 : 1;
        const variance = 0.93 + Math.random() * 0.14;
        const spark = sparkTargets.has(target.instanceId);
        const wasAlive = target.hp > 0;
        const damage = supportBurst
          ? 0
          : Math.max(1, Math.round(timeline.totalBase * impact.hitMultiplier * advantage * variance * (critical ? CRITICAL_DAMAGE_MULTIPLIER : 1) * (spark ? SPARK_DAMAGE_MULTIPLIER : 1)));
        const killed = wasAlive && target.hp - damage <= 0;
        const kind: CrystalKind = killed ? (enemy.boss ? "material" : "gold") : heartDrop && targetIndex === 0 ? "heart" : "burst";
        return { target, enemy, advantage, damage, killed, kind, spark, wasAlive, fxId: `${timeline.attackId}-hit-${impact.step}-${target.instanceId}` };
      });

      if (!impact.lands) {
        setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, stage: "release" } : fx));
        await waitForBattle(impact.nonLandingHoldMs);
        continue;
      }

      if (anySpark) lastSparkAt.current = now;

      const impactFeedback = supportBurst
        ? `${unit.name} · ${timeline.burstName} · HEALING LIGHT`
        : [
            unit.name,
            timeline.attackScope === "all" ? "ALL-FOE" : "",
            anySpark ? "AETHER SPARK +25%" : "",
            critical ? "CRITICAL +50%" : "",
            !anySpark && !critical && outcomes.some((outcome) => outcome.advantage > 1) ? "WEAKNESS!" : "",
          ].filter(Boolean).join(" · ");

      updateBattleLive((current) => {
        const nextCombo = anySpark ? Math.min(99, current.combo + 1) : now - lastSparkAt.current > 650 * timingScale ? 0 : current.combo;
        let healed = false;
        const nextParty = current.party.map((member) => {
          if (member.id === unitId) return { ...member, gauge: timeline.burst ? 0 : Math.min(100, member.gauge + timeline.gaugeGainPerHit) };
          if (heartDrop && !healed && member.hp > 0) {
            const maxHp = getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp");
            if (member.hp < maxHp) {
              healed = true;
              return { ...member, hp: Math.min(maxHp, member.hp + Math.round(maxHp * 0.07)) };
            }
          }
          return member;
        });
        const recoveredParty = impact.isFinisherBeat && timeline.healRatio > 0 ? nextParty.map((member) => {
          const maxHp = getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp");
          return {
            ...member,
            hp: Math.min(maxHp, member.hp + Math.round(maxHp * timeline.healRatio)),
            ailment: timeline.cleanse ? "" : member.ailment,
          };
        }) : nextParty;
        const focusedOutcome = outcomes.find((outcome) => outcome.target.instanceId === current.targetEnemyId);
        const focusedEnemy = focusedOutcome ? current.enemies.find((enemy) => enemy.instanceId === focusedOutcome.target.instanceId) : null;
        const focusDefeated = Boolean(focusedOutcome && focusedEnemy && focusedEnemy.hp - focusedOutcome.damage <= 0);
        return {
          ...current,
          combo: nextCombo,
          enemies: current.enemies.map((member) => {
            const outcome = outcomes.find((candidate) => candidate.target.instanceId === member.instanceId);
            return outcome ? { ...member, hp: Math.max(0, member.hp - outcome.damage), ailments: ailment && !member.ailments.includes(ailment) ? [...member.ailments, ailment] : member.ailments } : member;
          }),
          party: recoveredParty.map((member) => impact.isFinisherBeat && timeline.burstBuff
            ? { ...member, buffs: member.buffs.includes(timeline.burstBuff) ? member.buffs : [...member.buffs, timeline.burstBuff] }
            : member),
          targetEnemyId: focusDefeated ? "" : current.targetEnemyId,
          loot: {
            gold: current.loot.gold + outcomes.reduce((total, outcome) => total + (outcome.killed ? 24 + quest.chapter * 8 : 0), 0),
            materials: current.loot.materials + outcomes.filter((outcome) => outcome.killed && (outcome.enemy.boss || Math.random() < 0.35)).length,
            hearts: current.loot.hearts + (heartDrop ? 1 : 0),
            crystals: current.loot.crystals + (supportBurst ? 0 : outcomes.filter((outcome) => outcome.wasAlive).length),
          },
          message: impactFeedback,
        };
      });

      setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, stage: "impact" } : fx));
      const damageEffects: DamageFx[] = supportBurst ? [] : outcomes.map((outcome) => ({
        id: outcome.fxId,
        unitId,
        targetEnemyId: outcome.target.instanceId,
        damage: outcome.damage,
        spark: outcome.spark,
        critical,
        weakness: outcome.advantage > 1,
        hit: impact.hitNumber,
        burst: timeline.burst,
        frame: impact.attackFrame,
        finisher: impact.isFinisherBeat,
      }));
      const crystalEffects: CrystalFx[] = supportBurst ? [] : outcomes.filter((outcome) => outcome.wasAlive).map((outcome) => ({ id: outcome.fxId, targetEnemyId: outcome.target.instanceId, unitId, kind: outcome.kind }));
      setDamageFxs((current) => [...current, ...damageEffects]);
      setCrystalFxs((current) => [...current, ...crystalEffects]);
      const effectIds = new Set(outcomes.map((outcome) => outcome.fxId));
      window.setTimeout(() => setDamageFxs((current) => current.filter((fx) => !effectIds.has(fx.id))), getBattleDuration(timeline.numeralLifeMs, battleSpeed));
      window.setTimeout(() => setCrystalFxs((current) => current.filter((fx) => !effectIds.has(fx.id))), getBattleDuration(timeline.crystalLifeMs, battleSpeed));
      playSfx(supportBurst ? "burst" : anySpark ? "spark" : outcomes.some((outcome) => outcome.wasAlive && outcome.kind !== "burst") ? "crystal" : "hit");
      const hitPower = Math.min(
        3.4,
        impact.beatWeight
        * (timeline.burst ? 1.35 : 1)
        * (impact.isFinisherBeat ? 1.9 : 1)
        * (critical ? 1.3 : 1)
        * (anySpark ? 1.22 : 1)
        * (outcomes.some((outcome) => outcome.killed) ? 1.25 : 1),
      );
      setImpactPower(Number((supportBurst ? 0.35 : hitPower).toFixed(2)));
      if (!supportBurst) setScreenImpact((value) => value + 1);

      await waitForBattle(impact.strikeHoldMs);
      setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, stage: "hitstop" } : fx));
      await waitForBattle(impact.hitstopHoldMs);
      setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, stage: "recover" } : fx));
      await waitForBattle(impact.recoverHoldMs);
      if (anySpark || critical || impact.isFinisherBeat) await waitForBattle(impact.extraHoldMs);
      await waitForBattle(impact.cadenceHoldMs);
    }

    for (const node of timeline.burstRecovery) {
      setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, ...node.patch } : fx));
      await waitForBattle(node.holdMs);
    }
    const resolved = battleRef.current;
    if (resolved) updateBattleLive((state) => ({ ...state, message: timeline.completeMessage }));
    setAttackFxs((current) => current.map((fx) => fx.id === timeline.attackId ? { ...fx, ...timeline.returnNode.patch } : fx));
    await waitForBattle(timeline.returnNode.holdMs);
    setAttackFxs((current) => current.filter((fx) => fx.id !== timeline.attackId));
    activeAttackIds.current.delete(unitId);
    await advanceModernBattle();
  };

  const queueAttack = async (unitId: string, wantsBurst = false, fromAuto = false) => {
    const opening = battleRef.current;
    if (!opening || victory || enemyTurnLock.current || battleFlowLock.current || (autoTurnLock.current && !fromAuto)) return;
    const actor = opening.party.find((member) => member.id === unitId);
    if (!actor || actor.acted || actor.hp <= 0 || activeAttackIds.current.has(unitId)) return;
    const quest = QUESTS.find((item) => item.id === opening.questId)!;
    const unit = getUnit(unitId);
    const stars = save.unitStars[unitId] ?? 3;
    const combatProfile = getUnitCombatProfile(unit, stars);
    const battleSprites = getBattleSpriteSet(unit, stars);
    const burst = wantsBurst && actor.gauge >= 100;
    const attackScope = burst ? combatProfile.burstScope : combatProfile.attackScope;
    const openingTargets = getBattleTargets(opening, attackScope);
    const firstTarget = openingTargets[0];
    if (!firstTarget) return;
    const lockedTargetIds = openingTargets.map((target) => target.instanceId);
    const normalAttackChain = getNormalAttackChain(unit, stars);
    const attackId = `${unitId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const heroIndex = Math.max(0, opening.party.findIndex((member) => member.id === unitId));
    const openingTargetIndex = Math.max(0, opening.enemies.findIndex((enemy) => enemy.instanceId === firstTarget.instanceId));
    const contactAnchor = getContactOffset(opening.enemies.length, openingTargetIndex, heroIndex, battlefieldWidth);
    const attackPower = getFormStat(unit, stars, save.unitLevels[unitId] ?? 1, "atk");
    const timeline = buildActionTimeline({
      unitId: unit.id,
      unitName: unit.name,
      stars,
      burst,
      attackId,
      combatProfile,
      battleSprites,
      normalAttackChain,
      attackScope,
      lockedTargetIds,
      attackPower,
      burstLevelBonus: (save.burstLevels[unitId] ?? 1) * 0.08,
      contactAnchor,
    });
    await playActionTimeline(timeline, quest);
  };

  const queueAutoTurn = async () => {
    const opening = battleRef.current;
    if (!opening || victory || autoTurnLock.current || enemyTurnLock.current || battleFlowLock.current) return;
    const startingTurn = opening.turn;
    const startingWave = opening.wave;
    const turnOrder = opening.party
      .filter((member) => !member.acted && member.hp > 0)
      .map((member) => member.id);
    if (!turnOrder.length) return;

    autoTurnLock.current = true;
    setAutoTurnActive(true);
    try {
      for (const unitId of turnOrder) {
        const live = battleRef.current;
        if (!live || live.turn !== startingTurn || live.wave !== startingWave || enemyTurnLock.current || battleFlowLock.current) break;
        const member = live.party.find((candidate) => candidate.id === unitId);
        if (!member || member.acted || member.hp <= 0) continue;
        await queueAttack(unitId, member.gauge >= 100, true);
      }
    } finally {
      autoTurnLock.current = false;
      setAutoTurnActive(false);
    }
  };

  const queueGuard = async (unitId: string) => {
    const state = battleRef.current;
    if (!state || victory || autoTurnLock.current || enemyTurnLock.current || battleFlowLock.current) return;
    const actor = state.party.find((member) => member.id === unitId);
    if (!actor || actor.acted || actor.hp <= 0) return;
    updateBattleLive((current) => ({
      ...current,
      combo: 0,
      party: current.party.map((member) => member.id === unitId ? { ...member, acted: true, guarding: true } : member),
      message: `${getUnit(unitId).name} raises an Aether ward.`,
    }));
    setCombatFx({ phase: "guarding", serial: Date.now(), activeUnitId: unitId, activeEnemyId: "", targetUnitId: "", targetEnemyId: state.targetEnemyId, damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: "GUARD" });
    playSfx("guard");
    await waitForBattle(260);
    setCombatFx((current) => ({ ...current, phase: "ready", activeUnitId: "", label: "" }));
    await advanceModernBattle();
  };

  const finishBattle = () => {
    if (!battle || !victory) return;
    const quest = QUESTS.find((item) => item.id === battle.questId)!;
    if (victory.won) {
      setSave((current) => ({
        ...current,
        gold: current.gold + quest.reward + battle.loot.gold,
        xp: current.xp + 90 + quest.id * 25,
        gems: current.gems + (battle.mode === "story" && !current.completed.includes(quest.id) ? 1 : 0),
        completed: battle.mode !== "story" || current.completed.includes(quest.id) ? current.completed : [...current.completed, quest.id],
        unlockedStage: battle.mode === "story" ? Math.max(current.unlockedStage, Math.min(15, quest.id + 1)) : current.unlockedStage,
        materials: { ...current.materials, aether: current.materials.aether + battle.loot.materials },
        unitXp: Object.fromEntries(Object.entries(current.unitXp).map(([id, value]) => [id, value + (current.party.includes(id) ? 55 + quest.chapter * 15 : 0)])),
        eventTokens: current.eventTokens + (battle.mode === "story" ? 0 : 18 + quest.chapter * 4),
        towerFloor: battle.mode === "tower" ? current.towerFloor + 1 : current.towerFloor,
        shardHuntScore: battle.mode === "hunt" ? current.shardHuntScore + 1200 + battle.combo * 80 : current.shardHuntScore,
        achievements: quest.id === 5 && !current.achievements.includes("Lume Restored") ? [...current.achievements, "Lume Restored"] : quest.id === 15 && !current.achievements.includes("Crownforged") ? [...current.achievements, "Crownforged"] : current.achievements,
        titles: quest.id === 15 && !current.titles.includes("Crownforged Warden") ? [...current.titles, "Crownforged Warden"] : current.titles,
      }));
    }
    const returnScreen: Screen = battle.mode === "story" ? "quests" : "modes";
    setBattle(null);
    battleRef.current = null;
    setVictory(null);
    go(returnScreen);
  };

  const trainUnit = (id: string) => {
    const level = save.unitLevels[id] ?? 1;
    const stars = save.unitStars[id] ?? 3;
    const maxLevel = getMaxLevel(stars, id as BattleUnitId);
    const cost = 420 + level * 12;
    if (save.gold < cost || save.materials.aether < 3 || level >= maxLevel) {
      setToast(level >= maxLevel ? (stars < 5 ? "Maximum level — Ascension available" : "Maximum level reached") : save.materials.aether < 3 ? "You need 3 Aether Shards" : "Not enough gold");
      return;
    }
    setSave((current) => ({
      ...current,
      gold: current.gold - cost,
      materials: { ...current.materials, aether: current.materials.aether - 3 },
      unitLevels: { ...current.unitLevels, [id]: Math.min(maxLevel, level + 5) },
      unitXp: { ...current.unitXp, [id]: (current.unitXp[id] ?? 0) + 250 },
      burstLevels: { ...current.burstLevels, [id]: Math.min(10, (current.burstLevels[id] ?? 1) + (level % 10 >= 5 ? 1 : 0)) },
    }));
    playSfx("evolve");
    setToast(`${getUnit(id).name} absorbed 3 Aether Shards · +5 levels`);
  };

  const ascendUnit = (id: string) => {
    const unit = getUnit(id);
    const stars = save.unitStars[id] ?? 3;
    const level = save.unitLevels[id] ?? 1;
    if (stars >= 5) return setToast(`${unit.name} is already in the complete 5★ form`);
    const ascensionCost = getUnitStarProfile(unit.id, stars).ascension;
    const elementKey = unit.element === "fire" ? "ember" : unit.element === "water" ? "tide" : unit.element === "earth" ? "grove" : unit.element === "thunder" ? "storm" : unit.element === "light" ? "radiance" : "umbral";
    if (level < getMaxLevel(stars, id as BattleUnitId)) return setToast(`Reach Lv.${getMaxLevel(stars, id as BattleUnitId)} before Ascension`);
    if (save.materials.seal < ascensionCost.seals || (save.materials[elementKey] ?? 0) < ascensionCost.cores) return setToast(`Ascension needs ${ascensionCost.seals} Seals and ${ascensionCost.cores} ${ELEMENTS[unit.element].label} Cores`);
    const nextStars = (stars + 1) as StarTier;
    setSave((current) => ({
      ...current,
      unitStars: { ...current.unitStars, [id]: nextStars },
      unitLevels: { ...current.unitLevels, [id]: 1 },
      materials: { ...current.materials, seal: current.materials.seal - ascensionCost.seals, [elementKey]: current.materials[elementKey] - ascensionCost.cores },
    }));
    setSelectedFormStars(nextStars);
    playSfx("evolve");
    setToast(`${unit.name} ascended to ${nextStars}★ · ${unit.formTitles[nextStars]}`);
  };

  const summon = (gate: "aether" | "covenant" = "aether") => {
    if (pendingSummon) return;
    if (gate === "aether" && save.gems < 5) {
      setToast("You need 5 Aether Gems");
      return;
    }
    if (gate === "covenant" && save.covenantPoints < 200) {
      setToast("You need 200 Covenant Points");
      return;
    }
    const available = UNITS.filter((unit) => !save.owned.includes(unit.id));
    const result = available[Math.floor(Math.random() * available.length)] ?? UNITS[Math.floor(Math.random() * UNITS.length)];
    const roll = Math.random();
    const stars: StarTier = gate === "covenant"
      ? roll < 0.08 ? 4 : roll < 0.5 ? 3 : 2
      : save.summonPity >= 9 || roll < 0.08 ? 5 : roll < 0.38 ? 4 : roll < 0.78 ? 3 : 2;
    const duplicate = save.owned.includes(result.id);
    setSave((current) => ({
      ...current,
      gems: gate === "aether" ? current.gems - 5 : current.gems,
      covenantPoints: gate === "covenant" ? current.covenantPoints - 200 : current.covenantPoints,
      gold: duplicate ? current.gold + 900 : current.gold,
      materials: duplicate ? { ...current.materials, aether: current.materials.aether + 8 } : current.materials,
      owned: duplicate ? current.owned : [...current.owned, result.id],
      unitLevels: { ...current.unitLevels, [result.id]: current.unitLevels[result.id] ?? 1 },
      unitStars: { ...current.unitStars, [result.id]: Math.max(current.unitStars[result.id] ?? 2, stars) as StarTier },
      unitXp: { ...current.unitXp, [result.id]: current.unitXp[result.id] ?? 0 },
      burstLevels: { ...current.burstLevels, [result.id]: current.burstLevels[result.id] ?? 1 },
      summonPity: gate === "aether" ? (stars === 5 ? 0 : current.summonPity + 1) : current.summonPity,
      summonHistory: [`${stars}★ ${result.name}${duplicate ? " · Echo" : ""}`, ...current.summonHistory].slice(0, 12),
    }));
    // The result is locked in now (currency already spent); the chamber
    // screen shows the gate before it's revealed.
    setPendingSummon({ unit: result, stars, duplicate });
    fadeToScreen("summon-chamber");
  };

  // The bloom starts as a small glow on the gate and grows over GATE_HOLD_MS
  // until it has swallowed the whole screen in white; the actual screen
  // swap happens at that instant (invisible, since everything is already
  // white), then the bloom fades away to reveal the result underneath -
  // a white-out instead of the usual black fade for this one transition.
  const beginGateSequence = () => {
    if (!pendingSummon || fadeBlack || gateCharging) return;
    const result = pendingSummon;
    playSfx("summon");
    setGateCharging(true);
    // Captured now (not read live from state) so the fade at the end still
    // matches the colour the growth played in, even after pendingSummon and
    // summonResult have already moved on.
    setGateBloomColor(GATE_BLOOM_COLORS[result.stars] ?? GATE_BLOOM_DEFAULT);
    setGateVoidColor(GATE_VOID_COLORS[result.stars] ?? GATE_VOID_DEFAULT);
    setGateVoidFilter(GATE_VOID_SWIRL_FILTERS[result.stars] ?? GATE_VOID_SWIRL_FALLBACK);
    setGateGemFilter(GATE_GEM_FILTERS[result.stars] ?? GATE_GEM_FILTER_FALLBACK);
    setGateGlowColor(GATE_GLOW_COLORS[result.stars] ?? GATE_GLOW_DEFAULT);
    setGateBloom("growing");
    gateHoldTimeout.current = window.setTimeout(() => {
      gateHoldTimeout.current = null;
      setSummonResult(result);
      playSfx(result.stars === 5 ? "evolve" : "crystal");
      setPendingSummon(null);
      setGateCharging(false);
      go("summon-reveal");
      setGateBloom("fading");
      gateBloomTimeout.current = window.setTimeout(() => {
        gateBloomTimeout.current = null;
        setGateBloom("off");
      }, GATE_BLOOM_FADE_MS);
    }, GATE_HOLD_MS);
  };

  const toggleSquadUnit = (id: string) => {
    const active = save.squads[save.activeSquad] ?? [];
    const next = active.includes(id) ? active.filter((unitId) => unitId !== id) : [...active, id];
    if (!next.length) return setToast("A squad needs at least one unit");
    if (next.length > 5) return setToast("A formation holds five units");
    if (getSquadCost(next, save.unitStars) > save.wardenCapacity) return setToast("Warden Capacity exceeded");
    setSave((current) => {
      const squads = current.squads.map((squad, index) => index === current.activeSquad ? next : squad);
      return { ...current, squads, party: next };
    });
    playSfx("tap");
  };

  const selectSquad = (index: number) => {
    const party = save.squads[index] ?? save.party;
    setSave((current) => ({ ...current, activeSquad: index, party }));
    setToast(`Formation ${index + 1} equipped`);
  };

  const equipRelic = (unitId: string, relic: string) => {
    setSave((current) => ({ ...current, equippedRelics: { ...current.equippedRelics, [unitId]: relic } }));
    setToast(`${relic} equipped to ${getUnit(unitId).name}`);
  };

  const gatherTown = () => {
    if (save.lastTownGather === todayKey()) return setToast("Today’s haven resources are already gathered");
    setSave((current) => ({
      ...current,
      lastTownGather: todayKey(),
      townResources: {
        ore: current.townResources.ore + 8 + current.forgeLevel,
        herbs: current.townResources.herbs + 10 + current.groveLevel * 2,
        water: current.townResources.water + 9 + current.wellLevel * 2,
        timber: current.townResources.timber + 7 + current.groveLevel,
      },
      covenantPoints: current.covenantPoints + 60,
    }));
    playSfx("crystal");
    setToast("Mine, grove, river and farm gathered · +60 Covenant Points");
  };

  const craftRelic = () => {
    if (save.townResources.ore < 10 || save.townResources.timber < 6 || save.materials.relicDust < 5) return setToast("Needs 10 Ore, 6 Timber and 5 Relic Dust");
    const crafted = save.relics.includes("Sunshard Locket") ? "Tempest Band" : "Sunshard Locket";
    setSave((current) => ({
      ...current,
      townResources: { ...current.townResources, ore: current.townResources.ore - 10, timber: current.townResources.timber - 6 },
      materials: { ...current.materials, relicDust: current.materials.relicDust - 5 },
      relics: current.relics.includes(crafted) ? current.relics : [...current.relics, crafted],
    }));
    playSfx("evolve");
    setToast(`${crafted} forged`);
  };

  const launchMode = (mode: BattleMode) => {
    const questIds: Record<BattleMode, number> = { story: 1, rift: 7, trial: 10, tower: 12, hunt: 9, raid: 15, vault: 6 };
    const quest = QUESTS.find((item) => item.id === questIds[mode])!;
    const energyCost = mode === "raid" ? 6 : mode === "trial" ? 5 : 3;
    if (save.energy < energyCost) return setToast("Not enough energy");
    const multiplier = mode === "raid" ? 2.5 : mode === "trial" ? 1.45 : mode === "tower" ? 1 + save.towerFloor * 0.08 : mode === "vault" ? 0.78 : 1;
    const openingEnemies = createWaveEnemies(quest, 0).map((enemy) => ({ ...enemy, hp: Math.round(enemy.hp * multiplier), maxHp: Math.round(enemy.maxHp * multiplier) }));
    const boss = openingEnemies.find((member) => getEnemy(member.enemyId).boss);
    const labels: Record<BattleMode, string> = {
      story: "Story Quest", rift: "Rotating Rift Gate", trial: "Crown Trial", tower: `Aether Tower · Floor ${save.towerFloor}`,
      hunt: "Timed Shard Hunt", raid: "Rift Beast Raid", vault: "Training & Treasure Vault",
    };
    const nextBattle: BattleState = {
      questId: quest.id,
      wave: 0,
      enemies: openingEnemies,
      targetEnemyId: "",
      turn: 1,
      combo: 0,
      mode,
      loot: { gold: 0, materials: 0, hearts: 0, crystals: 0 },
      telegraph: boss ? { label: getEnemy(boss.enemyId).skill ?? "Rift Art", turns: 2 } : null,
      party: save.party.map((id) => ({
        id,
        hp: getFormStat(getUnit(id), save.unitStars[id] ?? 3, save.unitLevels[id] ?? 1, "hp"),
        gauge: mode === "vault" ? 60 : 15,
        acted: false,
        guarding: false,
        buffs: mode === "hunt" ? ["HASTE"] : [],
        ailment: "",
      })),
      message: `${labels[mode]} begins — no focus set; single-target attacks prioritize the uppermost enemy.`,
    };
    setSave((current) => ({ ...current, energy: current.energy - energyCost, lastEnergyAt: current.energy >= current.maxEnergy ? Date.now() : current.lastEnergyAt }));
    battleRef.current = nextBattle;
    setBattle(nextBattle);
    activeAttackIds.current.clear();
    battleFlowLock.current = false;
    enemyTurnLock.current = false;
    setAttackFxs([]);
    setDamageFxs([]);
    setCrystalFxs([]);
    setVictory(null);
    setCombatFx({ phase: "opening", serial: Date.now(), activeUnitId: "", activeEnemyId: "", targetUnitId: "", targetEnemyId: "", damage: 0, hits: 0, hitFrame: 0, spark: false, weakness: false, label: labels[mode] });
    window.setTimeout(() => setCombatFx((current) => ({ ...current, phase: "ready", label: "" })), 900);
    setScreen("battle");
  };

  const upgradeTown = (kind: "forgeLevel" | "wellLevel" | "groveLevel", cost: number) => {
    if (save.gold < cost) {
      setToast("Not enough gold");
      return;
    }
    setSave((current) => ({ ...current, gold: current.gold - cost, [kind]: current[kind] + 1 }));
    setToast("Facility upgraded");
  };

  const quickArena = () => {
    if (save.arenaOrbs < 1) {
      setToast("Arena orbs refill over time");
      return;
    }
    const power = save.party.reduce((total, id) => total + (save.unitLevels[id] ?? 1), 0);
    const won = power + Math.random() * 80 > 115;
    setSave((current) => ({
      ...current,
      arenaOrbs: current.arenaOrbs - 1,
      lastArenaAt: current.arenaOrbs >= MAX_ARENA_ORBS ? Date.now() : current.lastArenaAt,
      arenaRank: Math.max(0, current.arenaRank + (won ? 18 : -6)),
      gold: current.gold + (won ? 700 : 120),
    }));
    setToast(won ? "Victory! +18 AP, +700 gold" : "Defeat. Your squad gained experience.");
  };

  const assignOwnedUnitToSquad = (unitId: string) => {
    setSave((current) => {
      const squads = current.squads.map((squad) => [...squad]);
      const active = [...(squads[current.activeSquad] ?? current.party)];
      while (active.length < 5) active.push("");
      const currentSlotUnit = active[squadEditSlot] ?? "";
      const existingSlot = active.indexOf(unitId);
      if (existingSlot === squadEditSlot) return current;
      if (existingSlot >= 0) active[existingSlot] = currentSlotUnit;
      active[squadEditSlot] = unitId;
      const nextParty = active.filter(Boolean).slice(0, 5);
      squads[current.activeSquad] = nextParty;
      return { ...current, squads, party: nextParty };
    });
    setSquadEditSlot((current) => (current + 1) % 5);
    playSfx("equip");
  };

  const isSunpetalChapter = save.unlockedStage <= 4;

  const homeDestinations: {
    id: string;
    kicker: string;
    title: string;
    accent: string;
    copy: string;
    meta: string;
    action: string;
    image: string;
    medallionArt: string;
    medallionAlt: string;
    tone: string;
    screen: Screen;
    modeTab?: "events" | "trials";
  }[] = [
    {
      id: "story",
      kicker: "MAIN STORY",
      title: "MAIN STORY",
      accent: "",
      copy: "",
      meta: "",
      action: "ENTER",
      image: "/destinations/dragon-gate-card.webp",
      medallionArt: "/destinations/medallions/story.webp",
      medallionAlt: "The shattered Crown floating above an ancient Aether pedestal",
      tone: "story",
      screen: "quests",
    },
    {
      id: "rift",
      kicker: "RIFT",
      title: "RIFT",
      accent: "GATE",
      copy: "",
      meta: "",
      action: "ENTER",
      image: "/destinations/rift-gate.webp",
      medallionArt: "/destinations/medallions/rift-gate.webp",
      medallionAlt: "An ancient dimensional gate opening into the elemental Rift",
      tone: "rift",
      screen: "modes",
      modeTab: "events",
    },
    {
      id: "tower",
      kicker: "TRIALS",
      title: "AETHER",
      accent: "TOWER",
      copy: "",
      meta: "",
      action: "ENTER",
      image: "/destinations/aether-tower.webp",
      medallionArt: "/destinations/medallions/aether-tower.webp",
      medallionAlt: "The Aether Tower rising through violet energy rings",
      tone: "tower",
      screen: "modes",
      modeTab: "trials",
    },
  ];
  const activeHomeDestination = homeDestinations[homeBanner];
  const shiftHomeBanner = (direction: number) => {
    setHomeDragX(0);
    setHomeBanner((current) => (current + direction + homeDestinations.length) % homeDestinations.length);
  };
  const openHomeDestination = (destination = activeHomeDestination) => {
    if (homeSwipe.current.moved) return;
    if (destination.modeTab) setModeTab(destination.modeTab);
    go(destination.screen);
  };
  const beginHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const width = event.currentTarget.getBoundingClientRect().width || 320;
    homeSwipe.current = { pointerId: event.pointerId, startX: event.clientX, startTime: performance.now(), width, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHomeDragX(0);
  };
  const moveHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    const travel = event.clientX - homeSwipe.current.startX;
    if (Math.abs(travel) > 10) homeSwipe.current.moved = true;
    const limit = homeSwipe.current.width * 0.42;
    setHomeDragX(Math.max(-limit, Math.min(limit, travel)));
  };
  const finishHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    const travel = event.clientX - homeSwipe.current.startX;
    const elapsed = Math.max(1, performance.now() - homeSwipe.current.startTime);
    const velocity = Math.abs(travel) / elapsed;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    const distanceThreshold = homeSwipe.current.width * 0.18;
    const isFlick = velocity > 0.5 && Math.abs(travel) > 20;
    if (Math.abs(travel) > distanceThreshold || isFlick) shiftHomeBanner(travel > 0 ? -1 : 1);
    else setHomeDragX(0);
    homeSwipe.current.pointerId = -1;
    window.setTimeout(() => { homeSwipe.current.moved = false; }, 0);
  };
  const cancelHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    homeSwipe.current = { pointerId: -1, startX: 0, startTime: 0, width: homeSwipe.current.width, moved: false };
    setHomeDragX(0);
  };

  const renderHome = () => {
    const activeSquad = (save.squads[save.activeSquad] ?? save.party).slice(0, 5);
    return (
      <>
        <header className="frontier-home-header reference-home-header">
          <div className="home-player-panel reference-player-panel">
            <div className="home-player-line"><strong>CONOR</strong><span>Lv. {save.level}</span></div>
            <div className="home-meter xp"><small>EXP</small><i><b style={{ width: `${Math.min(100, save.xp / 10)}%` }} /></i><em>{save.xp}/1000</em></div>
            <div className="home-meter energy"><small>ENERGY</small><i><b style={{ width: `${save.energy / save.maxEnergy * 100}%` }} /></i><em>{save.energy}/{save.maxEnergy}</em></div>
            <small className="home-regen-note">{!hydrated ? "" : save.energy >= save.maxEnergy ? "ENERGY FULL" : `+1 ENERGY · ${formatRegenTime(regenRemaining(clockNow, save.lastEnergyAt, ENERGY_REGEN_MS, save.energy, save.maxEnergy))}`}</small>
          </div>

          <div className="home-crest reference-game-title" aria-label="Gates of Azura">
            <span className="crest-nameplate">
              <strong>GATES OF AZURA</strong>
            </span>
          </div>

          <div className="home-wallet-panel reference-wallet-panel">
            <div className="home-arena-counter" title="Arena charges">
              <Swords />
              <span><strong>{save.arenaOrbs}/{MAX_ARENA_ORBS}</strong><small>{!hydrated ? "" : save.arenaOrbs >= MAX_ARENA_ORBS ? "ARENA FULL" : `+1 · ${formatRegenTime(regenRemaining(clockNow, save.lastArenaAt, ARENA_REGEN_MS, save.arenaOrbs, MAX_ARENA_ORBS))}`}</small></span>
            </div>
            <span><Gem fill="currentColor" />{save.gems.toLocaleString()}</span>
            <span><Coins fill="currentColor" />{save.gold.toLocaleString()}</span>
          </div>
        </header>

        <section className="home-party-showcase reference-party-showcase" aria-label="Current five-unit squad">
          <div className="home-party-frame">
            <div className="home-party-panels">
              {Array.from({ length: 5 }, (_, index) => {
                const id = activeSquad[index];
                if (!id) return <span key={`empty-${index}`} className={`home-showcase-unit reference-empty-unit panel-${index + 1}`} aria-label={`Empty squad slot ${index + 1}`}><Plus /></span>;
                const unit = getUnit(id);
                const stars = save.unitStars[id] ?? 3;
                return (
                  <button
                    key={`${id}-${index}`}
                    className={`home-showcase-unit panel-${index + 1} unit-${unit.id} ${index === 0 ? "leader" : ""}`}
                    onClick={() => { setSquadEditSlot(index); go("units"); }}
                    aria-label={`${unit.name}, level ${save.unitLevels[id] ?? 1}, ${stars} star`}
                  >
                    <UnitKeyArt unit={unit} stars={stars} />
                    {index === 0 && <span className="home-leader-ribbon"><Crown /> LEADER</span>}
                    <span className="reference-unit-footer">
                      <span className="reference-unit-stars">{Array.from({ length: stars }, (_, star) => <i key={star}>★</i>)}</span>
                      <strong>Lv. {save.unitLevels[id] ?? 1}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="home-left-actions" aria-label="Home shortcuts">
          <button onClick={() => { setMenuOpen(true); playSfx("tap"); }}><ScrollText /><span>Menu</span></button>
          <button onClick={() => { setSettingsOpen(true); playSfx("tap"); }}><Settings2 /><span>Settings</span></button>
        </div>

        <section
          className="home-destination reference-gate-carousel"
          onPointerDown={beginHomeSwipe}
          onPointerMove={moveHomeSwipe}
          onPointerUp={finishHomeSwipe}
          onPointerCancel={cancelHomeSwipe}
          aria-label="Swipe between game destinations"
        >
          <div
            className="home-destination-track reference-gate-track"
            style={{
              transform: `translate3d(calc(-13% + ${homeDragX}px), 0, 0)`,
              transition: homeDragX === 0 ? "transform .34s cubic-bezier(.2,.78,.2,1)" : "none",
            }}
          >
            {[-1, 0, 1].map((offset) => {
              const index = (homeBanner + offset + homeDestinations.length) % homeDestinations.length;
              const destination = homeDestinations[index];
              return (
                <article
                  key={`${destination.id}-${offset}`}
                  className={`reference-gate-slide destination-${destination.tone} ${offset === 0 ? "active" : ""}`}
                  aria-hidden={false}
                >
                  <button
                    className="reference-gate-button"
                    onClick={() => openHomeDestination(destination)}
                    aria-label={`Open ${destination.title} ${destination.accent}`}
                  >
                    <span className="reference-gate-image">
                      <img src={destination.image} alt="" draggable={false} />
                    </span>
                    <strong>{destination.title}{destination.accent ? ` ${destination.accent}` : ""}</strong>
                  </button>
                </article>
              );
            })}
          </div>

          <div className="destination-dots reference-gate-dots" aria-label="Choose a destination">
            {homeDestinations.map((destination, index) => (
              <button
                key={destination.id}
                className={index === homeBanner ? "active" : ""}
                onClick={() => { setHomeDragX(0); setHomeBanner(index); }}
                aria-label={`${destination.title} ${destination.accent}`}
              />
            ))}
          </div>
        </section>
      </>
    );
  };

  const renderQuests = () => (
    <>
      <AppHeader save={save} title="Main Story" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="compact-story-map">
        <header>
          <div><small>THE SHATTERED CROWN</small><h1>Main Story</h1></div>
          <span>{Math.min(save.completed.length, 15)}/15<small>CLEARED</small></span>
        </header>
        <div className="compact-story-progress"><i><b style={{ width: `${Math.min(100, save.completed.length / 15 * 100)}%` }} /></i><small>{save.unlockedStage <= 4 ? "Sunpetal Vale" : save.unlockedStage <= 10 ? "The Glass Sea" : "Crownless Night"}</small></div>
        <div className="compact-quest-grid">
          {QUESTS.map((quest) => {
            const locked = quest.id > save.unlockedStage;
            const cleared = save.completed.includes(quest.id);
            return (
              <button key={quest.id} className={`compact-quest quest-chapter-${quest.chapter} ${locked ? "locked" : ""} ${cleared ? "cleared" : ""}`} disabled={locked} onClick={() => openStory(quest.id)}>
                <span>{locked ? <Lock /> : cleared ? <Check /> : quest.id}</span>
                <strong>{quest.name}</strong>
                <small><Zap />{quest.energy}</small>
              </button>
            );
          })}
        </div>
        <footer><ScrollText /><span><strong>15 story stages</strong><small>Tap any unlocked stage to enter its scene and battle.</small></span></footer>
      </section>
    </>
  );

  const renderStory = () => {
    const quest = QUESTS.find((item) => item.id === storyQuestId)!;
    const line = quest.intro[storyStep];
    const isLast = storyStep >= quest.intro.length - 1;
    const speakerUnit = line.speaker === "Kael"
      ? getUnit("kael")
      : line.speaker === "Lyra"
        ? getUnit("lyra")
        : line.speaker === "Brannock"
          ? getUnit("brannock")
          : getUnit("solenne");
    const speakerStars = save.unitStars[speakerUnit.id] ?? 2;
    return (
      <div className={`story-screen story-chapter-${quest.chapter}`}>
        <button className="story-back" onClick={() => go("quests")}><ChevronLeft /> Quest map</button>
        <div className={`story-sky ${quest.chapter === 1 ? "story-sky-sunpetal" : ""}`}><img src={quest.stage} alt="" /><span className="story-moon" /><span className="citadel" /></div>
        <div
          className={`story-unit story-speaker-sprite unit-${speakerUnit.id} form-${speakerStars}`}
          role="img"
          aria-label={`${speakerUnit.name}, ${speakerStars} star transparent dialogue sprite`}
        >
          <img src={getBattleSpriteSet(speakerUnit, speakerStars).idle[0]} alt="" draggable={false} />
        </div>
        <div className="dialogue-box">
          <small>{quest.location} · {quest.name}</small>
          <strong>{line.speaker}</strong>
          <p>{line.text}</p>
          {isLast && <div className="helper-select"><small>CHOOSE A GUEST WARDEN</small><div>{[
            ["Mira", "Start with 15% Burst"], ["Elian", "Squad ATK Up"], ["Sana", "Recovery Up"],
          ].map(([name, bonus]) => <button key={name} className={selectedHelper === name ? "active" : ""} onClick={() => setSelectedHelper(name)}><strong>{name}</strong><span>{bonus}</span></button>)}</div></div>}
          <button onClick={() => isLast ? beginBattle() : setStoryStep((step) => step + 1)}>
            {isLast ? "Begin quest" : "Continue"}<ChevronRight />
          </button>
        </div>
      </div>
    );
  };

  const renderBattle = () => {
    if (!battle) return null;
    const quest = QUESTS.find((item) => item.id === battle.questId)!;
    const livingEnemies = battle.enemies.filter((enemy) => enemy.hp > 0);
    const focusedInstance = battle.enemies.find((enemy) => enemy.instanceId === battle.targetEnemyId && enemy.hp > 0);
    const priorityInstance = focusedInstance ?? getTopPriorityEnemy(battle.enemies) ?? livingEnemies[0];
    const statusInstance = priorityInstance ?? battle.enemies[0];
    const targetedEnemy = getEnemy(priorityInstance?.enemyId ?? battle.enemies[0].enemyId);
    const sameNameEnemies = battle.enemies.filter((enemy) => getEnemy(enemy.enemyId).name === targetedEnemy.name);
    const targetedEnemyLabel = sameNameEnemies.length > 1
      ? `${targetedEnemy.name} ${String.fromCharCode(65 + sameNameEnemies.findIndex((enemy) => enemy.instanceId === statusInstance.instanceId))}`
      : targetedEnemy.name;
    const battleStageSrc = quest.chapter === 1 ? "/stages/chapter-1-sunmeadow.webp" : quest.stage;
    const stageId = quest.chapter === 1
      ? "field"
      : battleStageSrc.includes("emberwood")
        ? "emberwood"
        : battleStageSrc.includes("citadel")
          ? "citadel"
          : battleStageSrc.includes("reliquary")
            ? "reliquary"
            : "causeway";
    const burstIntroFxs = attackFxs.filter((fx) => fx.phase === "burst-intro");
    const burstIntroFx = burstIntroFxs[burstIntroFxs.length - 1];
    const burstIntroUnit = burstIntroFx ? getUnit(burstIntroFx.unitId) : null;
    const actionLocked = autoTurnActive || enemyTurnLock.current || battleFlowLock.current || combatFx.phase === "enemy" || combatFx.phase === "opening" || combatFx.phase === "wave";
    return (
      <div
        className={`battle-screen battle-${targetedEnemy.element} battle-speed-${battleSpeed} fx-${combatFx.phase}`}
        style={{ "--battle-time-scale": getBattleTimeScale(battleSpeed) } as CSSProperties}
      >
        <header className="battle-header">
          <button onClick={() => { setBattle(null); battleRef.current = null; go(battle.mode === "story" ? "quests" : "modes"); }}><ChevronLeft /></button>
          <div><small>{quest.name}</small><strong>WAVE {battle.wave + 1}/{quest.waves.length}</strong></div>
          <div className="battle-header-actions">
            <span>TURN {battle.turn}</span>
            <button onClick={() => setBattleSpeed((speed) => speed === 1 ? 2 : 1)}>{battleSpeed}×</button>
            <button
              className={`field-auto-button ${autoTurnActive ? "running" : ""}`}
              onClick={() => void queueAutoTurn()}
              disabled={actionLocked || battle.party.every((member) => member.acted || member.hp <= 0)}
              aria-label={autoTurnActive ? "Auto turn in progress" : "Play every ready unit in sequence"}
            ><Play fill="currentColor" /><span>{autoTurnActive ? "RUN" : "AUTO"}</span></button>
          </div>
        </header>
        <div
          ref={battlefieldRef}
          className={`battlefield impact-beat-${screenImpact % 2} ${gameSettings.screenShake ? "" : "no-screen-shake"} ${attackFxs.some((fx) => fx.stage === "hitstop") ? "hit-stop-active" : ""} ${impactPower >= 2.1 ? "heavy-impact" : ""} ${livingEnemies.length ? "" : "enemy-defeated"}`}
          style={{ "--impact-power": impactPower, maxHeight: `${Math.round(battlefieldSize.width * 355 / 430)}px` } as CSSProperties}
        >
          <AnimatedBattleStage stageId={stageId} stageSrc={battleStageSrc} />
          <img className={`stage-background stage-poster ${stageId === "field" ? "stage-poster-sunpetal" : ""}`} src={battleStageSrc} alt={`${quest.location} battle stage`} draggable={false} style={stageId === "field" ? { objectPosition: "center 25%" } : undefined} />
          <div className={`stage-atmosphere ${stageId === "field" ? "stage-atmosphere-sunpetal" : ""}`} />
          <div
            className="battlefield-stage-frame"
            style={{
              width: "430px",
              height: "355px",
              position: "absolute",
              left: "50%",
              bottom: "0",
              transformOrigin: "bottom center",
              transform: `translateX(-50%) scale(${Math.min(battlefieldSize.width / 430, battlefieldSize.height / 355)})`,
            } as CSSProperties}
          >
          <div className="battle-loot"><span><Gem />{battle.loot.crystals}</span><span><Heart />{battle.loot.hearts}</span><span><Coins />{battle.loot.gold}</span></div>
          <div className={`focus-state ${focusedInstance ? "manual" : "automatic"}`} role="status">
            <Target />
            <span><small>{focusedInstance ? "FOCUS TARGET" : "NO FOCUS · AUTO PRIORITY"}</small><strong>{focusedInstance ? getEnemy(focusedInstance.enemyId).name : "Uppermost living enemy"}</strong></span>
            <em>{focusedInstance ? "TAP AGAIN TO CLEAR" : "TAP AN ENEMY TO FOCUS"}</em>
          </div>
          <div className="battle-runes" />

          <div className={`enemy-party enemy-count-${battle.enemies.length}`} aria-label="Enemy formation">
            {battle.enemies.map((member, index) => {
              const enemy = getEnemy(member.enemyId);
              const isTargeted = member.instanceId === battle.targetEnemyId && member.hp > 0;
              const isAttacking = member.instanceId === combatFx.activeEnemyId && combatFx.phase === "enemy";
              const isDefeated = member.hp <= 0;
              const isHeldForChain = isDefeated && attackFxs.some((fx) => fx.scope === "single" && fx.targetEnemyId === member.instanceId);
              const staggerFx = damageFxs.filter((fx) => fx.targetEnemyId === member.instanceId).at(-1);
              const contactOffset = staggerFx ? getWeaponContactOffset(staggerFx.unitId, staggerFx.hit, staggerFx.burst) : null;
              const stagger = staggerFx && contactOffset ? getEnemyStaggerProfile({
                contactY: contactOffset.y,
                burst: staggerFx.burst,
                finisher: staggerFx.finisher,
                critical: staggerFx.critical,
                spark: staggerFx.spark,
                boss: Boolean(enemy.boss),
                compact: enemy.id.endsWith("-woblet"),
              }) : null;
              const isHit = Boolean(staggerFx && stagger);
              return (
                <button
                  key={member.instanceId}
                  className={`enemy-figure enemy-slot-${index + 1} ${enemy.element} ${enemy.id.endsWith("-woblet") ? "enemy-woblet" : ""} ${enemy.boss ? "enemy-boss" : ""} ${isTargeted ? "enemy-targeted" : ""} ${isAttacking ? "enemy-attacking" : ""} ${isHit ? "enemy-hit" : ""} ${staggerFx?.finisher ? "enemy-finisher-hit" : staggerFx?.critical || staggerFx?.spark ? "enemy-heavy-hit" : ""} ${isHeldForChain ? "enemy-overkill-locked" : isDefeated ? "enemy-member-defeated" : ""}`}
                  style={stagger && contactOffset && staggerFx ? {
                    "--enemy-recoil-x": `${stagger.recoilX}px`,
                    "--enemy-recoil-y": `${stagger.recoilY}px`,
                    "--enemy-recoil-rotate": `${stagger.recoilRotate}deg`,
                    "--enemy-rebound-x": `${stagger.reboundX}px`,
                    "--enemy-rebound-rotate": `${stagger.reboundRotate}deg`,
                    "--enemy-squash-x": stagger.squashX,
                    "--enemy-squash-y": stagger.squashY,
                    "--enemy-stagger-duration": `${stagger.durationSeconds}s`,
                    "--enemy-flash-brightness": stagger.flashBrightness,
                    "--enemy-hit-color": ELEMENTS[getUnit(staggerFx.unitId).element].color,
                    "--enemy-hit-local-x": `${41 + contactOffset.x + BATTLE_CONTACT_GAP_X}px`,
                    "--enemy-hit-local-y": `${62 + contactOffset.y + BATTLE_CONTACT_DROP_Y}px`,
                  } as CSSProperties : undefined}
                  onClick={() => selectEnemyTarget(member.instanceId)}
                  disabled={isDefeated || actionLocked}
                  aria-pressed={isTargeted}
                  aria-label={`${enemy.name}${isTargeted ? ", focused. Tap again to clear focus" : ", tap to focus single-target attacks"}`}
                >
                  <span className="enemy-stagger-rig" key={staggerFx?.id ?? `${member.instanceId}-rest`}>
                    <span className="enemy-aura" />
                    <img className="enemy-sprite" src={enemy.sprite} alt="" draggable={false} />
                  </span>
                  {member.ailments.length > 0 && <span className="enemy-ailments">{member.ailments.slice(0, 2).map((ailment) => <i key={ailment}>{ailment}</i>)}</span>}
                  {isTargeted && <span className="target-lock" aria-hidden="true"><Target /><small>FOCUS</small></span>}
                </button>
              );
            })}
          </div>

          <div className="field-party" aria-label="Squad on battlefield">
            {battle.party.map((member, index) => {
              const unit = getUnit(member.id);
              const attackFx = attackFxs.find((fx) => fx.unitId === unit.id);
              const isActive = Boolean(attackFx && attackFx.phase !== "burst-intro");
              const isTarget = combatFx.targetUnitId === unit.id;
              const spriteMode = attackFx?.phase === "burst" ? "burst" : attackFx?.phase === "attack" ? "attack" : "idle";
              const stars = save.unitStars[unit.id] ?? 3;
              const rangedAdvanceX = Math.round((attackFx?.contactX ?? 0) * ZEPHYRA_RANGED_ADVANCE);
              const rangedAdvanceY = Math.round((attackFx?.contactY ?? 0) * ZEPHYRA_RANGED_ADVANCE);
              return (
                <div
                  key={`${unit.id}-${index}`}
                  className={`field-unit field-slot-${index + 1} unit-${unit.id} form-${stars} ${RANGED_NORMAL_UNITS.has(unit.id) ? "ranged-normal" : "melee-normal"} ${member.acted ? "acted" : ""} ${member.guarding ? "guarded" : ""} ${member.hp <= 0 ? "fallen" : ""} ${isActive ? "active" : ""} ${attackFx?.phase === "burst" ? "bursting" : ""} attack-stage-${attackFx?.stage ?? "idle"} attack-beat-${(attackFx?.frame ?? 0) % 4} volley-${attackFx?.volley ?? 0} ${isTarget ? "targeted" : ""}`}
                  style={{
                    "--combo-duration": `${Math.max(620, (attackFx?.hits ?? getNormalAttackChain(unit, stars).length) * 165)}ms`,
                    "--contact-x": `${attackFx?.contactX ?? 0}px`,
                    "--contact-y": `${attackFx?.contactY ?? 0}px`,
                    "--ranged-x": `${rangedAdvanceX}px`,
                    "--ranged-y": `${rangedAdvanceY}px`,
                  } as CSSProperties}
                >
                  <span className="field-unit-shadow" />
                  <BattleUnitSprite
                    unit={unit}
                    stars={stars}
                    mode={spriteMode}
                    attackFrame={attackFx?.frame ?? 0}
                  />
                  <span className="field-unit-aura" />
                  {isTarget && combatFx.phase === "enemy" && <span className="target-damage">-{combatFx.damage.toLocaleString()}</span>}
                  {member.guarding && <span className="guard-sigil"><Shield /></span>}
                  {member.buffs.length > 0 && <span className="field-buffs">{member.buffs.slice(0, 2).join(" · ")}</span>}
                  {member.ailment && <span className="field-ailment">{member.ailment}</span>}
                </div>
              );
            })}
          </div>

          {damageFxs.map((fx) => {
            const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.instanceId === fx.targetEnemyId));
            const targetPosition = ENEMY_FORMATIONS[battle.enemies.length]?.[targetIndex] ?? ENEMY_FORMATIONS[2][0];
            const sourceUnit = getUnit(fx.unitId);
            const weaponContact = getWeaponContactPoint({
              unitId: sourceUnit.id,
              hitIndex: fx.hit,
              burst: fx.burst,
              targetLeft: targetPosition.left,
              targetBottom: targetPosition.bottom,
            });
            const impactLabel = fx.finisher
              ? "BURST FINISH"
              : fx.spark && fx.critical
                ? "SPARK · CRITICAL"
                : fx.spark
                  ? "SPARK +25%"
                  : fx.critical
                    ? "CRITICAL +50%"
                    : "";
            // Dense chains stacked every numeral on one point, so a nine-hit
            // Nyx phrase read as a single flickering number. Fanning them along
            // a short deterministic arc keeps each hit legible without moving
            // the contact point the effects are pinned to.
            const numeralSlot = Math.max(0, fx.hit - 1) % 6;
            const numeralDriftX = [0, 13, -11, 7, -15, 4][numeralSlot];
            const numeralDriftY = [0, -9, -5, -15, -2, -12][numeralSlot];
            // Zephyra's shots are a real projectile: computed from her own
            // field position to the exact contact point so the arrow both
            // travels and faces whatever it is currently flying at. Her
            // Burst volley overshoots past the contact point instead of
            // stopping dead on the connecting pose, reading as one arrow
            // punching through the whole formation.
            const zephyraAllBurst = sourceUnit.id === "zephyra" && fx.burst
              && getUnitStarProfile("zephyra", save.unitStars.zephyra ?? 3).burstScope === "all";
            const zephyraShot = sourceUnit.id === "zephyra" && !zephyraAllBurst ? (() => {
              const casterIndex = Math.max(0, battle.party.findIndex((member) => member.id === fx.unitId));
              const casterSlot = HERO_FORMATION[casterIndex] ?? HERO_FORMATION[0];
              const casterX = battlefieldWidth - casterSlot.right - casterSlot.width / 2;
              const casterY = 355 - casterSlot.bottom - 70;
              // The shared weaponContact point sits at the enemy's near
              // (weapon-side) edge, roughly 20-50px short of the sprite body
              // in screen space — melee hits bridge that gap with their own
              // lunge animation overlapping the target, but Zephyra stays
              // planted, so her arrow needs real extra travel to visibly
              // connect instead of stopping just short of the enemy.
              const overshoot = fx.burst ? 1.35 : 1.2;
              const dx = (weaponContact.x - casterX) * overshoot;
              const dy = (weaponContact.y - casterY) * overshoot;
              const angle = Math.atan2(weaponContact.y - casterY, weaponContact.x - casterX) * 180 / Math.PI;
              return { casterX, casterY, dx, dy, angle };
            })() : null;
            // Solenne's normal attack already lands as a vertical strike, so
            // a beam falling onto the same contact point and a floor sigil
            // beneath it read as one continuous invocation rather than a
            // separate effect bolted on top.
            const solenneStrike = sourceUnit.id === "solenne" && !fx.burst;
            const groundY = 355 - targetPosition.bottom;
            return <Fragment key={fx.id}>
              {zephyraShot && (
                <span
                  className={`zephyra-arrow-shot ${fx.burst ? "zephyra-arrow-shot-burst" : ""}`}
                  style={{
                    left: `${zephyraShot.casterX}px`,
                    top: `${zephyraShot.casterY}px`,
                    "--arrow-dx": `${zephyraShot.dx}px`,
                    "--arrow-dy": `${zephyraShot.dy}px`,
                    "--arrow-angle": `${zephyraShot.angle}deg`,
                  } as CSSProperties}
                  aria-hidden="true"
                >
                  <img src="/effects/projectiles/zephyra-arrow.webp" alt="" draggable={false} />
                </span>
              )}
              {solenneStrike && (
                <>
                  <span
                    className="solenne-beam"
                    style={{
                      left: `${weaponContact.x}px`,
                      "--beam-height": `${Math.max(40, groundY + 30)}px`,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                  <span
                    className="solenne-sigil"
                    style={{
                      left: `${weaponContact.x}px`,
                      top: `${groundY - 6}px`,
                    } as CSSProperties}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 100 40">
                      <ellipse cx="50" cy="20" rx="44" ry="15" fill="none" stroke="#fffdf0" strokeWidth="2.4" opacity={0.9} />
                      <ellipse cx="50" cy="20" rx="30" ry="10" fill="none" stroke="#fff3c2" strokeWidth="1.6" opacity={0.75} />
                      {Array.from({ length: 8 }, (_, index) => {
                        const theta = (index / 8) * Math.PI * 2;
                        const x1 = 50 + Math.cos(theta) * 44;
                        const y1 = 20 + Math.sin(theta) * 15;
                        const x2 = 50 + Math.cos(theta) * 54;
                        const y2 = 20 + Math.sin(theta) * 19;
                        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fffdf0" strokeWidth="1.8" opacity={0.8} />;
                      })}
                    </svg>
                  </span>
                </>
              )}
              <div
                className={`impact-stack concurrent-impact impact-count-${battle.enemies.length} impact-target-${targetIndex + 1} impact-${sourceUnit.element} impact-unit-${sourceUnit.id} burst-impact-frame-${fx.frame} ${fx.burst ? "burst-impact" : ""} ${fx.finisher ? "finisher-impact" : ""} ${fx.spark ? "spark-hit" : ""} ${fx.critical ? "critical-hit" : ""}`}
                style={{
                  left: `${weaponContact.x - 50}px`,
                  top: `${weaponContact.y - 50}px`,
                  bottom: "auto",
                  "--numeral-drift-x": `${numeralDriftX}px`,
                  "--numeral-drift-y": `${numeralDriftY}px`,
                } as CSSProperties}
              >
                {gameSettings.damageNumbers && <>
                  <strong>{fx.damage.toLocaleString()}</strong>
                  {impactLabel && <small>{impactLabel}</small>}
                  {fx.weakness && <em>WEAKNESS</em>}
                </>}
              </div>
            </Fragment>;
          })}
          {(() => {
            // Zephyra's all-foe Burst fires as one oversized shot rather than
            // one arrow per struck foe: it launches from her own position,
            // aims through whichever living enemy sits closest to the centre
            // of the formation, and keeps travelling well past the left edge
            // of the battlefield instead of stopping on a contact point.
            const pierceFx = damageFxs.find((fx) => fx.unitId === "zephyra" && fx.burst
              && getUnitStarProfile("zephyra", save.unitStars.zephyra ?? 3).burstScope === "all");
            if (!pierceFx) return null;
            const casterIndex = Math.max(0, battle.party.findIndex((member) => member.id === "zephyra"));
            const casterSlot = HERO_FORMATION[casterIndex] ?? HERO_FORMATION[0];
            const casterX = battlefieldWidth - casterSlot.right - casterSlot.width / 2;
            const casterY = 355 - casterSlot.bottom - 70;
            const formation = ENEMY_FORMATIONS[battle.enemies.length] ?? ENEMY_FORMATIONS[2];
            let middleSlot = formation[0];
            let bestDelta = Infinity;
            battle.enemies.forEach((enemy, index) => {
              if (enemy.hp <= 0) return;
              const slot = formation[index] ?? formation[0];
              const delta = Math.abs(slot.left - 50);
              if (delta < bestDelta) { bestDelta = delta; middleSlot = slot; }
            });
            const midContact = getWeaponContactPoint({
              unitId: "zephyra",
              hitIndex: 1,
              burst: true,
              targetLeft: middleSlot.left,
              targetBottom: middleSlot.bottom,
            });
            const rawDx = midContact.x - casterX;
            const rawDy = midContact.y - casterY;
            const rawDist = Math.hypot(rawDx, rawDy) || 1;
            const pierceDistance = 560;
            const dx = (rawDx / rawDist) * pierceDistance;
            const dy = (rawDy / rawDist) * pierceDistance;
            const angle = Math.atan2(rawDy, rawDx) * 180 / Math.PI;
            return (
              <span
                key={`${pierceFx.id}-pierce`}
                className="zephyra-arrow-shot zephyra-arrow-shot-pierce"
                style={{
                  left: `${casterX}px`,
                  top: `${casterY}px`,
                  "--arrow-dx": `${dx}px`,
                  "--arrow-dy": `${dy}px`,
                  "--arrow-angle": `${angle}deg`,
                } as CSSProperties}
                aria-hidden="true"
              >
                <img src="/effects/projectiles/zephyra-arrow.webp" alt="" draggable={false} />
              </span>
            );
          })()}
          {damageFxs.some((fx) => fx.spark) && <div className="spark-counter" key={`spark-${battle.combo}-${screenImpact}`}><Sparkles /> SPARK!!</div>}
          {crystalFxs.map((fx) => {
            const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.instanceId === fx.targetEnemyId));
            const unitIndex = Math.max(0, battle.party.findIndex((member) => member.id === fx.unitId));
            return <span key={fx.id} className={`crystal-flight crystal-${fx.kind} crystal-from-${targetIndex + 1} crystal-to-${unitIndex + 1}`} aria-hidden="true"><Gem /></span>;
          })}
          <div className="enemy-status-rail">
            <div className="enemy-status-top">
              <ElementBadge element={targetedEnemy.element} compact />
              <strong>{targetedEnemyLabel}</strong>
            </div>
            <div className="enemy-status-hp-row">
              <div className={`enemy-status-hp ${getHpTierClass(statusInstance.hp, statusInstance.maxHp)}`} aria-label={`${targetedEnemy.name} health: ${Math.max(0, statusInstance.hp).toLocaleString()} of ${statusInstance.maxHp.toLocaleString()}`}>
                <i style={{ clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, statusInstance.hp / statusInstance.maxHp * 100))}% 0 0)` }} />
              </div>
            </div>
          </div>
          {battle.telegraph && <div className={`boss-telegraph ${battle.telegraph.turns <= 1 ? "imminent" : ""}`}><Target /><span><small>BOSS ART CHARGING</small><strong>{battle.telegraph.label}</strong></span><em>{battle.telegraph.turns}</em></div>}
          {(combatFx.phase === "opening" || combatFx.phase === "wave") && <div className="wave-banner" key={combatFx.serial}><small>{quest.location}</small><strong>{combatFx.label}</strong><span>{battle.enemies.length} ENEMIES</span></div>}
          {combatFx.phase === "guarding" && <div className="guard-banner"><Shield /> GUARD</div>}
          </div>
        </div>

        {burstIntroUnit && burstIntroFx && (
          <BurstIntroOverlay
            key={`burst-intro-${burstIntroFx.id}`}
            instanceId={burstIntroFx.id}
            unitId={burstIntroUnit.id}
            stars={save.unitStars[burstIntroUnit.id] ?? 3}
            burstName={burstIntroFx.label}
            keyArtSrc={getBattleSpriteSet(burstIntroUnit, save.unitStars[burstIntroUnit.id] ?? 3).burst[0]}
            speed={battleSpeed}
          />
        )}

        <div className="battle-command">
          <div className="command-help"><span>Tap · Attack</span><span><Shield size={11} /> Swipe down · Guard</span><span><ArrowUp size={13} /> Swipe up · Burst</span></div>
          <div className="battle-party">
            {battle.party.map((member) => {
              const unit = getUnit(member.id);
              const canBurst = member.gauge >= 100;
              const stars = save.unitStars[unit.id] ?? 3;
              const maxHp = getFormStat(unit, stars, save.unitLevels[unit.id] ?? 1, "hp");
              const isQueued = attackFxs.some((fx) => fx.unitId === unit.id);
              return (
                <button
                  key={unit.id}
                  className={`battle-unit ${member.acted ? "acted" : ""} ${member.guarding ? "guarded" : ""} ${member.hp <= 0 ? "fallen" : ""} ${canBurst ? "burst-ready" : ""} ${isQueued ? "queued" : ""}`}
                  disabled={member.acted || member.hp <= 0 || !!victory || actionLocked}
                  onPointerDown={(event) => { pointerStart.current[unit.id] = { x: event.clientX, y: event.clientY, at: Date.now() }; }}
                  onPointerUp={(event) => {
                    const start = pointerStart.current[unit.id];
                    const swipeUp = start && start.y - event.clientY > 28;
                    const swipeDown = start && event.clientY - start.y > 28;
                    if (swipeDown) void queueGuard(unit.id);
                    else void queueAttack(unit.id, Boolean(swipeUp));
                  }}
                >
                  <BattleFacePortrait unit={unit} stars={stars} />
                  <div className="battle-unit-data"><span className="battle-unit-name">{unit.name} <i>{stars}★</i></span><small>{isQueued ? "CHAIN ACTIVE" : member.guarding ? "GUARDING" : member.acted ? "ACTED" : canBurst ? "BURST READY" : unit.role.toUpperCase()}</small>
                    <div className={`mini-hp ${getHpTierClass(member.hp, maxHp)}`}><span style={{ clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, member.hp / maxHp * 100))}% 0 0)` }} /><b>{member.hp.toLocaleString()}/{maxHp.toLocaleString()}</b></div>
                    <div className="burst-bar"><span style={{ clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, member.gauge))}% 0 0)` }} /><b>{member.gauge}% BB</b></div>
                  </div>
                </button>
              );
            })}
            <div className="support-link"><Sparkles /><span><small>GUEST WARDEN</small><strong>{selectedHelper}’s Link</strong></span><em>{selectedHelper === "Mira" ? "START BB +15" : selectedHelper === "Elian" ? "ATK UP" : "REC UP"}</em></div>
          </div>
          <div className="battle-item-tray">
            <small>ITEMS</small>
            <div className="battle-items">
              <button onClick={usePotion} disabled={save.potions < 1 || !!victory || actionLocked}><FlaskConical /><span>Potion</span><strong>x{save.potions}</strong></button>
              {Array.from({ length: 4 }, (_, slot) => <span className="empty-item-slot" key={slot}><PackageOpen /><i>EMPTY</i></span>)}
            </div>
          </div>
        </div>
        {victory && (
          <div className="result-overlay">
            <div className={`result-card ${victory.won ? "won" : "lost"}`}>
              {victory.won ? <Crown /> : <Shield />}
              <small>{victory.won ? "QUEST COMPLETE" : "PARTY DEFEATED"}</small>
              <h2>{victory.won ? "Victory" : "The Rift Endures"}</h2>
              {victory.won ? (
                <><div className="rewards"><span><Coins />{(victory.reward + battle.loot.gold).toLocaleString()}</span><span><Star />{90 + quest.id * 25} XP</span><span><Gem />{battle.loot.materials} shards</span></div><p className="result-detail">{battle.loot.crystals} Battle Crystals · {battle.loot.hearts} Heart Crystals · Unit XP awarded to the full squad</p></>
              ) : <p>Train your units, change the leader, or bring more potions.</p>}
              <button className="primary-cta" onClick={finishBattle}>{victory.won ? "Collect rewards" : battle.mode === "story" ? "Return to map" : "Return to modes"}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const clearUnitHold = () => {
    if (unitHold.current.timer) {
      clearTimeout(unitHold.current.timer);
      unitHold.current.timer = null;
    }
  };
  const beginUnitHold = (unitId: string | null | undefined, stars: StarTier) => {
    if (!unitId) return;
    clearUnitHold();
    unitHold.current.timer = setTimeout(() => {
      unitHold.current.timer = null;
      unitHold.current.suppressClick = true;
      setSelectedUnitId(unitId);
      setSelectedFormStars(stars);
      playSfx("tap");
    }, 480);
  };
  const finishUnitPress = (onTap: () => void) => {
    clearUnitHold();
    if (unitHold.current.suppressClick) {
      unitHold.current.suppressClick = false;
      return;
    }
    onTap();
  };

  const renderUnits = () => {
    const active = (save.squads[save.activeSquad] ?? save.party).slice(0, 5);
    return (
      <>
        <AppHeader save={save} title="Squad Builder" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
        <section className="squad-builder-screen">
          <header className="squad-builder-heading">
            <div><small>ACTIVE FORMATION {save.activeSquad + 1}</small><h1>Current Squad</h1></div>
            <span><Swords /><strong>{squadPower}</strong><small>POWER</small></span>
          </header>

          <div className="podium-party" aria-label="Current five-unit squad">
            {Array.from({ length: 5 }, (_, index) => {
              const id = active[index];
              const unit = id ? getUnit(id) : null;
              return (
                <button
                  key={`${id ?? "empty"}-${index}`}
                  className={`podium-slot ${squadEditSlot === index ? "selected" : ""} ${index === 0 ? "leader" : ""}`}
                  onClick={() => setSquadEditSlot(index)}
                  aria-label={unit ? `${unit.name}, level ${save.unitLevels[unit.id] ?? 1}` : `Empty squad slot ${index + 1}`}
                >
                  <span className="podium-light" />
                  {unit ? <img className="podium-sprite" src={unit.sprites.idleA} alt={unit.name} /> : <Plus className="podium-empty" />}
                  <span className="podium-base"><small>{index === 0 ? "LEADER" : `SLOT ${index + 1}`}</small><strong>{unit?.name ?? "Empty"}</strong></span>
                </button>
              );
            })}
          </div>

          <div className="owned-roster-heading">
            <div><small>UNLOCKED UNITS</small><strong>Choose a unit for slot {squadEditSlot + 1}</strong></div>
            <span>{save.owned.length} OWNED</span>
          </div>
          <div className="owned-unit-grid">
            {ownedUnits.map((unit) => {
              const inParty = active.includes(unit.id);
              return (
                <button
                  key={unit.id}
                  className={`${inParty ? "in-party" : ""} ${active[squadEditSlot] === unit.id ? "slot-match" : ""}`}
                  onPointerDown={() => beginUnitHold(unit.id, save.unitStars[unit.id] ?? 3)}
                  onPointerLeave={clearUnitHold}
                  onPointerCancel={clearUnitHold}
                  onClick={() => finishUnitPress(() => assignOwnedUnitToSquad(unit.id))}
                  aria-label={`${unit.name}, tap to assign or hold to view unit details`}
                >
                  <span className="owned-unit-art"><UnitPortrait unit={unit} stars={save.unitStars[unit.id] ?? 3} /></span>
                  <span><strong>{unit.name}</strong><small>Lv.{save.unitLevels[unit.id] ?? 1} · {save.unitStars[unit.id] ?? 3}★</small></span>
                  {inParty && <Check />}
                </button>
              );
            })}
          </div>
          <footer className="squad-builder-footer"><Users /><span>Tap a podium, then tap any unlocked unit below. Hold a unit below to view its details.</span></footer>
        </section>
      </>
    );
  };

  const renderSummon = () => (
    <>
      <AppHeader save={save} title="Aether Gate" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="summon-stage">
        <span className="summon-kicker">FEATURED GATE · FIRST LIGHT</span>
        <h1>Call beyond<br />the <em>Veil</em></h1>
        <p>Every summon reveals an original hero. Undiscovered units are guaranteed while the archive has space.</p>
        <div className="summon-resonance"><div><span>5★ RESONANCE PITY</span><strong>{save.summonPity}/10</strong></div><i><b style={{ width: `${Math.min(100, save.summonPity * 10)}%` }} /></i><small>The tenth Aether call is guaranteed to awaken at 5★</small></div>
        <div className="summon-portal"><GateArt /></div>
        <div className="featured-row">
          {[getUnit("nyx"), getUnit("zephyra"), getUnit("solenne")].map((unit) => <UnitPortrait key={unit.id} unit={unit} stars={5} />)}
        </div>
        {pendingSummon ? (
          <div className="summon-actions">
            <button className="summon-button" onClick={() => go("summon-chamber")}><Sparkles />RETURN TO THE GATE<span>Awaiting</span></button>
          </div>
        ) : (
          <div className="summon-actions">
            <button className="summon-button" onClick={() => summon("aether")}><Sparkles />AETHER CALL<span>5 <Gem size={15} /></span></button>
            <button className="summon-button covenant-button" onClick={() => summon("covenant")}><Users />COVENANT CALL<span>200 <Sparkles size={15} /></span></button>
          </div>
        )}
        <small className="rates">Aether: 5★ 8% · 4★ 30% · 3★ 40% · 2★ 22% · No purchases in this prototype</small>
        <div className="summon-history"><div><small>COVENANT POINTS</small><strong>{save.covenantPoints.toLocaleString()}</strong></div><div><small>RECENT CALLS</small><p>{save.summonHistory.length ? save.summonHistory.slice(0, 3).join(" · ") : "No calls recorded yet"}</p></div></div>
      </section>
    </>
  );

  const leaveGateSequence = () => {
    if (fadeBlack) return;
    if (gateHoldTimeout.current !== null) {
      window.clearTimeout(gateHoldTimeout.current);
      gateHoldTimeout.current = null;
    }
    if (gateBloomTimeout.current !== null) {
      window.clearTimeout(gateBloomTimeout.current);
      gateBloomTimeout.current = null;
    }
    setGateCharging(false);
    setGateBloom("off");
    fadeToScreen("summon");
  };

  const renderSummonChamber = () => (
    <section className="chamber-stage">
      <img className="chamber-backdrop" src="/summon/chamber-cell.jpg" alt="A stone chamber lit by the gate's glow" draggable={false} />
      <span className="chamber-backdrop-tint" aria-hidden="true" />
      <button type="button" className="chamber-back" onClick={leaveGateSequence} aria-label="Go back"><ChevronLeft /></button>
      <button
        type="button"
        className="chamber-gate"
        onClick={beginGateSequence}
        disabled={fadeBlack || gateCharging}
        aria-label="Press the gate to begin the summon"
        style={
          gateCharging
            ? {
                "--gate-glow-lo": gateGlowColor.lo,
                "--gate-glow-hi": gateGlowColor.hi,
                transitionDuration: `${GATE_HOLD_MS}ms`,
              } as CSSProperties
            : undefined
        }
      >
        {gateCharging && (
          <span
            className="chamber-gate-bloom"
            style={{
              animationDuration: `${GATE_HOLD_MS}ms`,
              "--bloom-core": gateBloomColor.core,
              "--bloom-mid": gateBloomColor.mid,
              "--bloom-edge": gateBloomColor.edge,
            } as CSSProperties}
          />
        )}
        {/* A separate layer from the bloom above - if the fade-out lived on
            .chamber-gate itself, opacity would multiply into the bloom span
            too (opacity compounds with descendants) and dim it right as it's
            supposed to be growing to full strength. */}
        <span
          className={`chamber-gate-art ${gateCharging ? "charging" : ""}`}
          style={gateCharging ? { animationDuration: `${GATE_HOLD_MS}ms` } as CSSProperties : undefined}
        >
          <GateArt
            voidCore={gateCharging ? gateVoidColor.core : undefined}
            voidMid={gateCharging ? gateVoidColor.mid : undefined}
            voidFilter={gateCharging ? gateVoidFilter : undefined}
            gemFilter={gateCharging ? gateGemFilter : undefined}
            voidFadeMs={GATE_HOLD_MS}
          />
        </span>
      </button>
      <p className="chamber-prompt">{gateCharging ? "THE GATE STIRS…" : "TAP THE GATE"}</p>
    </section>
  );

  const renderSummonReveal = () => {
    if (!summonResult) {
      return (
        <>
          <AppHeader save={save} title="The Aether Answers" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
          <section className="summon-reveal-stage"><p>Nothing to reveal yet.</p><button className="primary-cta" onClick={() => go("summon")}>Return to the Gate</button></section>
        </>
      );
    }
    const unit = summonResult.unit;
    return (
      <>
        <AppHeader save={save} title="The Aether Answers" onBack={() => { setSummonResult(null); go("home"); }} soundOn={soundOn} onSoundToggle={toggleSound} />
        <section className="summon-reveal-stage">
          <small>{summonResult.duplicate ? "ECHO CONVERTED · +8 SHARDS" : "A NEW HERO ANSWERS"}</small>
          <Stars count={summonResult.stars} />
          <button
            type="button"
            className={`summon-reveal-box ${unit.element}`}
            onPointerDown={() => beginUnitHold(unit.id, summonResult.stars)}
            onPointerLeave={clearUnitHold}
            onPointerCancel={clearUnitHold}
            onClick={() => finishUnitPress(() => setToast("Hold to view unit details"))}
            aria-label={`${unit.name}, hold to view unit details`}
          >
            <UnitPortrait unit={unit} stars={summonResult.stars} />
          </button>
          <h1>{unit.name}</h1>
          <p>{unit.formTitles[summonResult.stars]}</p>
          <small className="summon-reveal-hint">Hold the box to view full unit details</small>
          <div className="summon-reveal-actions">
            <button className="primary-cta" onClick={() => { setSummonResult(null); go("units"); }}>Build squad</button>
            <button onClick={() => { setSummonResult(null); go("summon"); }}>Return to the Gate</button>
          </div>
        </section>
      </>
    );
  };

  const renderTown = () => (
    <>
      <AppHeader save={save} title="Hearthvale" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="compact-town-screen">
        <header className="compact-town-hero"><span className="town-sun" /><div><small>YOUR RESTORED HAVEN</small><h1>Hearthvale</h1><p>Gather, improve facilities and prepare supplies.</p></div></header>
        <div className="compact-town-resources">
          {[{ key: "ore", name: "Shard Mine", Icon: Hammer }, { key: "herbs", name: "Remedy Grove", Icon: Leaf }, { key: "water", name: "Aether River", Icon: Droplets }, { key: "timber", name: "Warden Farm", Icon: Castle }].map(({ key, name, Icon }) => <button key={key} onClick={gatherTown} className={save.lastTownGather === todayKey() ? "gathered" : ""}><Icon /><span><small>{name}</small><strong>{save.townResources[key]}</strong></span>{save.lastTownGather === todayKey() ? <Check /> : <Plus />}</button>)}
        </div>
        <div className="compact-town-facilities">
          {[{ key: "forgeLevel" as const, name: "Relic Forge", Icon: Hammer, cost: 1500, level: save.forgeLevel }, { key: "wellLevel" as const, name: "Aether Well", Icon: Droplets, cost: 2200, level: save.wellLevel }, { key: "groveLevel" as const, name: "Remedy Grove", Icon: Leaf, cost: 1100, level: save.groveLevel }].map(({ key, name, Icon, cost, level }) => <article key={key}><Icon /><div><small>LEVEL {level}</small><strong>{name}</strong></div><button onClick={() => upgradeTown(key, cost)}>{cost.toLocaleString()}<Coins /></button></article>)}
        </div>
        <div className="compact-town-actions">
          <button onClick={() => {
            if (save.gold < 300) return setToast("Not enough gold");
            setSave((current) => ({ ...current, gold: current.gold - 300, potions: current.potions + 1 }));
            setToast("Potion crafted");
          }}><FlaskConical /><span><small>QUICK CRAFT</small><strong>Potion x{save.potions}</strong></span><em>300 <Coins /></em></button>
          <button onClick={craftRelic}><Hammer /><span><small>RELIC FORGE</small><strong>{save.materials.relicDust} Dust</strong></span><em>Forge</em></button>
          <button onClick={() => { if (save.eventTokens < 80) return setToast("You need 80 Rift Tokens"); setSave((current) => ({ ...current, eventTokens: current.eventTokens - 80, materials: { ...current.materials, seal: current.materials.seal + 2 } })); setToast("2 Ascension Seals acquired"); }}><Gift /><span><small>RIFT BAZAAR</small><strong>{save.eventTokens} Tokens</strong></span><em>Exchange</em></button>
        </div>
      </section>
    </>
  );

  const renderSquad = () => renderUnits();

  const renderInventory = () => (
    <>
      <AppHeader save={save} title="Warden Vault" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="vault-banner"><PackageOpen /><div><small>FIELD INVENTORY</small><h1>Every shard has a use</h1><p>Equip Relics, inspect Ascension materials and prepare consumables.</p></div></section>
      <section className="vault-tabs">{(["relics", "materials", "items"] as const).map((tab) => <button key={tab} className={inventoryTab === tab ? "active" : ""} onClick={() => setInventoryTab(tab)}>{tab === "relics" ? <Gem /> : tab === "materials" ? <Sparkles /> : <FlaskConical />}{tab}</button>)}</section>
      {inventoryTab === "relics" && <section className="relic-list">{save.relics.map((relic, index) => {
        const equippedBy = Object.entries(save.equippedRelics).find(([, value]) => value === relic)?.[0];
        const bonuses = ["ATK +8% · CRIT +5%", "DEF +10% · HP +6%", "REC +12% · Heart drop +8%", "Spark damage +14%", "Burst fill +10%"][index % 5];
        return <article key={relic}><span className="relic-icon"><Gem /></span><div><small>{equippedBy ? `EQUIPPED · ${getUnit(equippedBy).name}` : "AWAKENED RELIC"}</small><strong>{relic}</strong><p>{bonuses}</p></div><button onClick={() => equipRelic(save.party[0], relic)}>{equippedBy === save.party[0] ? <Check /> : "Equip leader"}</button></article>;
      })}</section>}
      {inventoryTab === "materials" && <section className="material-grid">{Object.entries(save.materials).map(([name, amount]) => <article key={name}><Gem /><span><small>{name.replace(/([A-Z])/g, " $1").toUpperCase()}</small><strong>{amount}</strong></span></article>)}</section>}
      {inventoryTab === "items" && <section className="item-list"><article><FlaskConical /><div><small>CONSUMABLE</small><strong>Restorative Potion</strong><p>Heals the whole squad by 35% in battle.</p></div><em>x{save.potions}</em></article><article><Lock /><div><small>EVENT KEY</small><strong>Rift Gate Key</strong><p>Granted by daily orders and special stages.</p></div><em>x2</em></article></section>}
      <section className="profile-cosmetics"><Trophy /><div><small>WARDEN TITLE</small><strong>{save.selectedTitle}</strong><p>{save.achievements.length} achievements · {save.completed.length}/15 story records</p></div><div>{save.titles.map((title) => <button key={title} className={save.selectedTitle === title ? "active" : ""} onClick={() => setSave((current) => ({ ...current, selectedTitle: title }))}>{title}</button>)}</div></section>
    </>
  );

  const renderModes = () => {
    const cards = modeTab === "events" ? [
      { mode: "rift" as BattleMode, Icon: Sparkles, kicker: "ROTATES DAILY · STORM", name: "Rift Gates", copy: "Elemental cores and evolution materials.", meta: "3 waves · 3 energy" },
      { mode: "vault" as BattleMode, Icon: Coins, kicker: "TRAINING / TREASURE", name: "Aether Vaults", copy: "Unit XP, Gold and Relic Dust.", meta: "High drops · 3 energy" },
      { mode: "hunt" as BattleMode, Icon: Target, kicker: "TIMED SCORE EVENT", name: "Shard Hunt", copy: "Build Sparks and chase a weekly score.", meta: `${save.shardHuntScore.toLocaleString()} best score` },
    ] : [
      { mode: "trial" as BattleMode, Icon: Crown, kicker: "RESTRICTED CHALLENGE", name: "Crown Trials", copy: "Scripted bosses, telegraphs and rare Sigils.", meta: "5 energy · boss phases" },
      { mode: "tower" as BattleMode, Icon: Castle, kicker: "ENDLESS ASCENT", name: "Aether Tower", copy: "Carry your squad through escalating floors.", meta: `Current floor ${save.towerFloor}` },
      { mode: "raid" as BattleMode, Icon: Users, kicker: "LARGE RIFT BEAST", name: "Rift Raid", copy: "A long-form local raid simulation with an enlarged boss formation.", meta: "6 energy · event tokens" },
    ];
    return <>
      <AppHeader save={save} title="Frontier Modes" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="modes-banner"><Castle /><div><small>THE FRONTIER NEVER CLOSES</small><h1>Beyond the story</h1><p>Rotating gates, score hunts, boss trials and the endless tower.</p></div><span>{save.eventTokens}<small>RIFT TOKENS</small></span></section>
      <section className="mode-tabs"><button className={modeTab === "events" ? "active" : ""} onClick={() => setModeTab("events")}><Gift />Events</button><button className={modeTab === "trials" ? "active" : ""} onClick={() => setModeTab("trials")}><Trophy />Trials</button></section>
      <section className="mode-list">{cards.map(({ mode, Icon, kicker, name, copy, meta }) => <article key={mode} className={`mode-card mode-${mode}`}><Icon /><div><small>{kicker}</small><h2>{name}</h2><p>{copy}</p><span>{meta}</span></div><button onClick={() => launchMode(mode)}><Play />Enter</button></article>)}</section>
      <section className="story-archive"><ScrollText /><div><small>STORY ARCHIVE</small><strong>{save.completed.length} / 15 records restored</strong><p>Replay unlocked scenes and revisit every regional stage.</p></div><button onClick={() => go("quests")}>Open archive</button></section>
    </>;
  };

  const renderArena = () => (
    <>
      <AppHeader save={save} title="Astral Arena" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="arena-hero"><Trophy /><small>BRONZE VANGUARD</small><h1>{save.arenaRank} AP</h1><p>Win duels to rise through the weekly ranks.</p><div className="arena-ladder"><div><span>Silver promotion</span><strong>{Math.max(0, 150 - save.arenaRank)} AP to go</strong></div><i><b style={{ width: `${Math.min(100, save.arenaRank / 1.5)}%` }} /></i></div><div className="orb-row">{Array.from({ length: MAX_ARENA_ORBS }, (_, orb) => <span key={orb} className={orb < save.arenaOrbs ? "full" : ""}><Zap /></span>)}</div><small className="arena-regen-label">{save.arenaOrbs >= MAX_ARENA_ORBS ? "5/5 CHARGES READY" : `NEXT CHARGE ${formatRegenTime(regenRemaining(clockNow, save.lastArenaAt, ARENA_REGEN_MS, save.arenaOrbs, MAX_ARENA_ORBS))}`}</small></section>
      <section className="opponent-card"><div className="opponent-top"><span className="rank-medallion"><Crown /></span><div><small>CHALLENGER</small><strong>Riftwalker Elian</strong><p>Squad power 112</p></div><span className="opponent-rank">#8,241</span></div><div className="mini-opponent-squad">{["nyx","brannock","lyra","zephyra","kael"].map((id) => <UnitPortrait key={id} unit={getUnit(id)} />)}</div><button className="primary-cta" onClick={quickArena}><Swords />Quick duel</button></section>
      <section className="arena-reward"><Gift /><div><small>NEXT RANK REWARD</small><strong>Silver Sigil Sphere</strong></div><span>150 AP</span></section>
    </>
  );

  const renderMissions = () => {
    const missions = [
      { label: "Clear any story quest", progress: save.completed.length > 0, value: save.completed.length > 0 ? 100 : 25, reward: "500 Gold" },
      { label: "Train a unit", progress: Object.values(save.unitLevels).some((level) => level >= 25), value: Math.min(100, Math.max(...Object.values(save.unitLevels)) * 4), reward: "1 Gem" },
      { label: "Fight in the Astral Arena", progress: save.arenaOrbs < MAX_ARENA_ORBS, value: save.arenaOrbs < MAX_ARENA_ORBS ? 100 : 40, reward: "1 Potion" },
    ];
    return <><AppHeader save={save} title="Warden’s Ledger" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} /><section className="ledger-banner"><ScrollText /><div><small>DAILY / WEEKLY ORDERS</small><h1>Every path gives progress</h1><p>Daily orders refresh at dawn; weekly feats reward long-term play.</p></div></section><section className="mission-list">{missions.map((mission, index) => <article key={mission.label}><span className={mission.progress ? "done" : ""}>{mission.progress ? <Check /> : index + 1}</span><div className="mission-copy"><strong>{mission.label}</strong><small>{mission.progress ? "Complete" : "In progress"}</small><i><b style={{ width: `${mission.value}%` }} /></i></div><em>{mission.reward}</em></article>)}</section><section className="weekly-orders"><div className="section-heading"><div><small>WEEKLY FEATS</small><h2>Frontier cadence</h2></div><span>4d 11h</span></div>{[
      ["Clear 10 quest waves", Math.min(100, save.completed.length * 20), "5 Gems"],
      ["Reach 25 Aether Sparks", Math.min(100, save.shardHuntScore / 40), "3 Seals"],
      ["Climb 3 Tower floors", Math.min(100, (save.towerFloor - 1) / 3 * 100), "Silver Sigil"],
    ].map(([label, progress, reward]) => <article key={String(label)}><div><strong>{label}</strong><small>{reward}</small></div><i><b style={{ width: `${Number(progress)}%` }} /></i></article>)}</section><section className="achievement-shelf"><Trophy /><div><small>ACHIEVEMENTS & TITLES</small><strong>{save.achievements.length || 0} feats recorded</strong><p>{save.achievements.length ? save.achievements.join(" · ") : "Clear regional finales to earn permanent profile titles."}</p></div></section></>;
  };

  const renderShop = () => (
    <><AppHeader save={save} title="Caravan Shop" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} /><section className="shop-banner"><PackageOpen /><div><small>NO REAL-MONEY PURCHASES</small><h1>Field Supplies</h1><p>Spend rewards earned through play.</p></div></section><section className="shop-list">
      {[{name:"Restorative Potion",desc:"Heal the full squad by 35%.",price:300,stock:"Fresh batch",icon:FlaskConical,art:"/ui/icons/shop-potion.png"},{name:"Vortex Key",desc:"Unlock a rotating event trial.",price:1800,stock:"2 remaining",icon:Lock,art:"/ui/icons/shop-key.png"},{name:"Bronze Relic Shard",desc:"Material for the Relic Forge.",price:950,stock:"Forge stock",icon:Gem,art:"/ui/icons/shop-relic-gem.png"}].map((item) => { const Icon=item.icon; return <article key={item.name}><div className="shop-icon">{item.art ? <img src={item.art} alt="" /> : <Icon />}</div><div><small className="shop-stock">{item.stock}</small><strong>{item.name}</strong><p>{item.desc}</p></div><button onClick={() => { if(save.gold<item.price){ playSfx("denied"); return setToast("Not enough gold"); } setSave(current=>({...current,gold:current.gold-item.price,potions:item.name.includes("Potion")?current.potions+1:current.potions})); playSfx("buy"); setToast(`${item.name} purchased`); }}>{item.price.toLocaleString()}<Coins /></button></article>; })}
    </section></>
  );

  const content = screen === "home" ? renderHome()
    : screen === "quests" ? renderQuests()
      : screen === "story" ? renderStory()
        : screen === "battle" ? renderBattle()
          : screen === "units" ? renderUnits()
            : screen === "squad" ? renderSquad()
              : screen === "inventory" ? renderInventory()
                : screen === "modes" ? renderModes()
                  : screen === "summon" ? renderSummon()
                    : screen === "summon-chamber" ? renderSummonChamber()
                      : screen === "summon-reveal" ? renderSummonReveal()
                        : screen === "town" ? renderTown()
                          : screen === "arena" ? renderArena()
                            : screen === "missions" ? renderMissions()
                              : renderShop();

  return (
    <main className="game-shell">
      <div className={`game-app screen-${screen} ${gameSettings.reducedEffects ? "reduced-effects" : ""}`} data-soundtrack={musicTrackKey} data-music-state={soundOn ? "playing" : "muted"}>
        {content}
        {!(["battle", "story", "summon-chamber", "summon-reveal"] as Screen[]).includes(screen) && <BottomNav screen={screen} go={go} save={save} />}
        {menuOpen && (
          <div className="menu-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
            <section className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title">
              <header><div><small>WARDEN COMMAND</small><h2 id="menu-title">Menu</h2></div><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button></header>
              <div className="menu-grid">
                <button onClick={() => go("quests")}><ScrollText /><span><strong>Main Story</strong><small>Continue the campaign</small></span></button>
                <button onClick={() => go("modes")}><Sparkles /><span><strong>Rift & Tower</strong><small>Events and trials</small></span></button>
                <button onClick={() => go("inventory")}><PackageOpen /><span><strong>Inventory</strong><small>Relics and materials</small></span></button>
                <button onClick={() => go("missions")}><Trophy /><span><strong>Missions</strong><small>Daily and weekly goals</small></span></button>
                <button onClick={() => go("units")}><Users /><span><strong>Squad Builder</strong><small>Change your active party</small></span></button>
                <button onClick={() => { setMenuOpen(false); void installApp(); }}><Home /><span><strong>Install Game</strong><small>Add to your home screen</small></span></button>
              </div>
            </section>
          </div>
        )}
        {settingsOpen && (
          <div className="settings-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
            <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
              <header>
                <div><small>GAME OPTIONS</small><h2 id="settings-title">Settings</h2></div>
                <button autoFocus onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X /></button>
              </header>

              <button className={`settings-master ${soundOn ? "active" : ""}`} onClick={toggleSound} aria-pressed={soundOn}>
                {soundOn ? <Volume2 /> : <VolumeX />}
                <span><strong>Game audio</strong><small>{soundOn ? "Music and effects enabled" : "All audio muted"}</small></span>
                <em>{soundOn ? "ON" : "OFF"}</em>
              </button>

              <label className="settings-slider">
                <span><strong>Music volume</strong><output>{gameSettings.musicVolume}</output></span>
                <input type="range" min="0" max="100" step="1" value={gameSettings.musicVolume} onChange={(event) => updateGameSetting("musicVolume", Number(event.target.value))} />
              </label>
              <label className="settings-slider">
                <span><strong>Effects volume</strong><output>{gameSettings.sfxVolume}</output></span>
                <input type="range" min="0" max="100" step="1" value={gameSettings.sfxVolume} onChange={(event) => updateGameSetting("sfxVolume", Number(event.target.value))} />
              </label>

              <div className="settings-toggles">
                <button className={gameSettings.vibration ? "active" : ""} onClick={() => updateGameSetting("vibration", !gameSettings.vibration)} aria-pressed={gameSettings.vibration}><span><strong>Vibration</strong><small>Impact feedback</small></span><em>{gameSettings.vibration ? "ON" : "OFF"}</em></button>
                <button className={gameSettings.screenShake ? "active" : ""} onClick={() => updateGameSetting("screenShake", !gameSettings.screenShake)} aria-pressed={gameSettings.screenShake}><span><strong>Screen shake</strong><small>Battle hit motion</small></span><em>{gameSettings.screenShake ? "ON" : "OFF"}</em></button>
                <button className={gameSettings.damageNumbers ? "active" : ""} onClick={() => updateGameSetting("damageNumbers", !gameSettings.damageNumbers)} aria-pressed={gameSettings.damageNumbers}><span><strong>Damage numbers</strong><small>Combat readout</small></span><em>{gameSettings.damageNumbers ? "ON" : "OFF"}</em></button>
                <button className={gameSettings.reducedEffects ? "active" : ""} onClick={() => updateGameSetting("reducedEffects", !gameSettings.reducedEffects)} aria-pressed={gameSettings.reducedEffects}><span><strong>Reduced effects</strong><small>Lower flash intensity</small></span><em>{gameSettings.reducedEffects ? "ON" : "OFF"}</em></button>
              </div>

              <footer>
                <button onClick={() => { setGameSettings(DEFAULT_GAME_SETTINGS); setSoundOn(true); playSfx("tap"); }}><RotateCcw />Reset</button>
                <button className="settings-done" onClick={() => { setSettingsOpen(false); playSfx("tap"); }}>Done</button>
              </footer>
            </section>
          </div>
        )}
        {selectedUnitId && (() => {
          const unit = selectedUnit;
          const ownedStars = save.unitStars[unit.id] ?? 3;
          const level = save.unitLevels[unit.id] ?? 1;
          const maxLevel = getMaxLevel(ownedStars, unit.id);
          const profile = getUnitCombatProfile(unit, ownedStars);
          const spriteSet = getBattleSpriteSet(unit, ownedStars);
          const trainCost = 420 + level * 12;
          const equippedRelic = save.equippedRelics[unit.id];
          const closeDetail = () => setSelectedUnitId("");
          return (
            <div className="menu-backdrop unit-detail-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
              <section className={`unit-detail detail-${unit.element}`} role="dialog" aria-modal="true" aria-labelledby="unit-detail-name">
                <div className="detail-hero">
                  <div className="detail-topline"><span>UNIT DETAILS</span><button onClick={closeDetail} aria-label="Close unit details"><X /></button></div>
                  <UnitKeyArt unit={unit} stars={ownedStars} className="detail-portrait detail-key-art" />
                  <span className="detail-rating"><Star size={13} fill="currentColor" /><span>{ownedStars}★</span><b>{unit.role} · {unit.nature}</b></span>
                  <div className="detail-name">
                    <ElementBadge element={unit.element} />
                    <h1 id="unit-detail-name">{unit.name}</h1>
                    <p>{unit.formTitles[ownedStars]}</p>
                  </div>
                </div>
                <div className="unit-sheet">
                  <div className="level-row"><span>Level {level} <small>/ {maxLevel}</small></span><span className="nature">{unit.nature}</span></div>
                  <div className="stat-grid">
                    <div><Heart /><span>HP</span><strong>{getFormStat(unit, ownedStars, level, "hp")}</strong></div>
                    <div><Swords /><span>ATK</span><strong>{getFormStat(unit, ownedStars, level, "atk")}</strong></div>
                    <div><Shield /><span>DEF</span><strong>{getFormStat(unit, ownedStars, level, "def")}</strong></div>
                    <div><Zap /><span>REC</span><strong>{getFormStat(unit, ownedStars, level, "rec")}</strong></div>
                  </div>
                  <div className="skill-panel">
                    <small><Crown size={14} />LEADER SKILL</small>
                    <p>{profile.leader}</p>
                  </div>
                  <div className="skill-panel burst-skill">
                    <small><Sparkles size={14} />{profile.burstDoesDamage ? `${profile.burstHits}-HIT BURST` : "HEALING BURST"}</small>
                    <strong>{profile.burstName}</strong>
                    <p>{profile.burstDescription}</p>
                  </div>
                  <div className="sphere-slot">
                    <div><Gem /><div><small>EQUIPPED RELIC</small><strong>{equippedRelic ?? "None equipped"}</strong></div></div>
                    <em>{save.relics.length} owned</em>
                  </div>
                  <div className="motion-preview">
                    <small>UNIT MOTION</small>
                    <div>
                      <span><img src={spriteSet.idle[0]} alt="" /><em>IDLE</em></span>
                      <span><img src={spriteSet.attack[2]} alt="" /><em>{profile.attackName}</em></span>
                      <span><img src={spriteSet.burst[3]} alt="" /><em>{profile.burstDoesDamage ? "BURST" : "HEAL"}</em></span>
                      <span><img src={getFormPortrait(unit, ownedStars)} alt="" /><em>FORM ART</em></span>
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button onClick={() => trainUnit(unit.id)} disabled={level >= maxLevel}><Hammer />Train<span>{trainCost.toLocaleString()} <Coins /></span></button>
                    <button onClick={() => ascendUnit(unit.id)} disabled={ownedStars >= 5 || level < maxLevel}><Sparkles />Ascend</button>
                  </div>
                </div>
              </section>
            </div>
          );
        })()}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
      <div className={`fade-overlay ${fadeBlack ? "active" : ""}`} aria-hidden="true" />
      {gateBloom === "fading" && (
        <div className="gate-bloom fading" aria-hidden="true">
          <span
            className="gate-bloom-core"
            style={{
              "--bloom-core": gateBloomColor.core,
              "--bloom-mid": gateBloomColor.mid,
              "--bloom-edge": gateBloomColor.edge,
            } as CSSProperties}
          />
        </div>
      )}
      <aside className="desktop-note"><Sparkles /><h2>Gates of Azura</h2><p>A portrait RPG designed for touch. Open this page on Android and choose <strong>Add to Home screen</strong> for the app experience.</p><span>ORIGINAL PLAYABLE PROTOTYPE</span></aside>
      {(!hydrated || !titleAssetsReady) && (
        <div className="title-gate title-gate-loading" role="status" aria-live="polite">
          <span className="title-gate-crest"><Sparkles /></span>
          <strong className="title-gate-wordmark">GATES OF AZURA</strong>
          <span className="title-gate-loading-bar"><i /></span>
          <small>Gathering the Frontier…</small>
        </div>
      )}
      {hydrated && titleAssetsReady && titleGateOpen && (
        <div className="title-gate title-gate-splash">
          <div className="title-gate-collage" aria-hidden="true">
            {UNITS.map((unit) => (
              <img key={unit.id} src={getFormPortrait(unit, 5) ?? unit.keyArt} alt="" draggable={false} />
            ))}
          </div>
          <div className="title-gate-scrim" />
          <div className="title-gate-content">
            <span className="title-gate-eyebrow">A PORTRAIT RPG</span>
            <h1 className="title-gate-wordmark">GATES OF <em>AZURA</em></h1>
            <button className="title-gate-start" onClick={() => setTitleGateOpen(false)}>
              <Play fill="currentColor" />TAP TO BEGIN
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
