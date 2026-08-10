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
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  BATTLE_CONTACT_DROP_Y,
  BATTLE_CONTACT_GAP_X,
  getEnemyStaggerProfile,
  getWeaponContactOffset,
  getWeaponContactPoint,
  type BattleUnitId,
} from "../game/battle-choreography";
import { getBattleDuration, getBattlePlaybackRate, getBattleTimeScale, type BattleSpeed } from "../game/battle-timing";
import { AnimatedBattleStage, AttackImpactOverlay, BurstIntroOverlay, BurstRemotionOverlay } from "./components/BattleRemotion";

type Screen =
  | "home"
  | "quests"
  | "units"
  | "squad"
  | "inventory"
  | "modes"
  | "summon"
  | "town"
  | "battle"
  | "story"
  | "arena"
  | "missions"
  | "shop";
type ElementKey = "fire" | "water" | "earth" | "thunder" | "light" | "dark";
type Nature = "Valiant" | "Stalwart" | "Fierce" | "Mystic" | "Vital";
type StarTier = 3 | 4 | 5;
type BattleMode = "story" | "rift" | "trial" | "tower" | "hunt" | "raid" | "vault";
type CrystalKind = "burst" | "heart" | "gold" | "material";
type AttackScope = "single" | "all";
type AttackStage = "approach" | "windup" | "release" | "flight" | "impact" | "hitstop" | "recover" | "return";

const CRITICAL_CHANCE = 1 / 32;
const CRITICAL_DAMAGE_MULTIPLIER = 1.5;
const SPARK_DAMAGE_MULTIPLIER = 1.25;

type Unit = {
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
  burstVfx: string[];
  sprites: { idleA: string; idleB: string; attack: string[]; burst: string[] };
  glyph: string;
  cost: number;
  formTitles: Record<StarTier, string>;
};

type NormalAttackBeat = {
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

type Quest = {
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

type SaveState = {
  level: number;
  xp: number;
  gold: number;
  gems: number;
  energy: number;
  maxEnergy: number;
  arenaOrbs: number;
  arenaRank: number;
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

type BattleState = {
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

type AttackFx = {
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

type DamageFx = {
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

type CrystalFx = {
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
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/kael/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/kael-idle-a.webp",
      idleB: "/sprites/units/kael-idle-b.webp",
      attack: Array.from({ length: 5 }, (_, index) => `/sprites/units/kael-attack-${index + 1}.webp`),
      burst: Array.from({ length: 12 }, (_, index) => `/sprites/units/burst/kael-burst-${index + 1}.webp`),
    },
    glyph: "K",
    cost: 22,
    formTitles: { 3: "Ember Cadet", 4: "Cinder Knight", 5: "Ember Vanguard" },
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
    burstName: "Moonlit Current",
    burstHits: 10,
    attackScope: "single",
    burstScope: "single",
    burst: "10-hit Tide attack, heals the squad, and cleanses one ailment.",
    leader: "Flowing Grace — all allies gain 18% HP and recovery crystals heal more.",
    portrait: "/units/lyra.webp",
    keyArt: "/units/key-art/lyra.webp",
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/lyra/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/lyra-idle-a.webp",
      idleB: "/sprites/units/lyra-idle-b.webp",
      attack: Array.from({ length: 6 }, (_, index) => `/sprites/units/lyra-attack-${index + 1}.webp`),
      burst: Array.from({ length: 10 }, (_, index) => `/sprites/units/burst/lyra-burst-${index + 1}.webp`),
    },
    glyph: "L",
    cost: 21,
    formTitles: { 3: "Tide Initiate", 4: "Moonwater Adept", 5: "Tide Dancer" },
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
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/brannock/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/brannock-idle-a.webp",
      idleB: "/sprites/units/brannock-idle-b.webp",
      attack: Array.from({ length: 3 }, (_, index) => `/sprites/units/brannock-attack-${index + 1}.webp`),
      burst: Array.from({ length: 8 }, (_, index) => `/sprites/units/burst/brannock-burst-${index + 1}.webp`),
    },
    glyph: "B",
    cost: 23,
    formTitles: { 3: "Grove Guard", 4: "Stonebark Warden", 5: "Verdant Bulwark" },
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
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/zephyra/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/zephyra-idle-a.webp",
      idleB: "/sprites/units/zephyra-idle-b.webp",
      attack: Array.from({ length: 8 }, (_, index) => `/sprites/units/zephyra-attack-${index + 1}.webp`),
      burst: Array.from({ length: 16 }, (_, index) => `/sprites/units/burst/zephyra-burst-${index + 1}.webp`),
    },
    glyph: "Z",
    cost: 22,
    formTitles: { 3: "Storm Scout", 4: "Gale Pursuer", 5: "Skybolt Huntress" },
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
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/solenne/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/solenne-idle-a.webp",
      idleB: "/sprites/units/solenne-idle-b.webp",
      attack: Array.from({ length: 6 }, (_, index) => `/sprites/units/solenne-attack-${index + 1}.webp`),
      burst: Array.from({ length: 8 }, (_, index) => `/sprites/units/burst/solenne-burst-${index + 1}.webp`),
    },
    glyph: "S",
    cost: 21,
    formTitles: { 3: "Dawn Acolyte", 4: "Sunveil Chorister", 5: "Dawn Cantor" },
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
    burstVfx: Array.from({ length: 4 }, (_, index) => `/effects/bursts/nyx/phase-${index + 1}.webp`),
    sprites: {
      idleA: "/sprites/units/nyx-idle-a.webp",
      idleB: "/sprites/units/nyx-idle-b.webp",
      attack: Array.from({ length: 9 }, (_, index) => `/sprites/units/nyx-attack-${index + 1}.webp`),
      burst: Array.from({ length: 18 }, (_, index) => `/sprites/units/burst/nyx-burst-${index + 1}.webp`),
    },
    glyph: "N",
    cost: 24,
    formTitles: { 3: "Veilblade", 4: "Nightfall Reaver", 5: "Veil Reaper" },
  },
];

// These ranged chains keep their rapid damage packets grouped while still
// allowing the authored character drawings to progress. Zephyra plays a full
// bow draw before each three-number volley; Solenne plays a complete planted
// staff invocation before each two-number beam. The multiplier is applied to
// the unit's unsplit normal-attack damage.
const NORMAL_ATTACK_CHAINS: Partial<Record<BattleUnitId, readonly NormalAttackBeat[]>> = {
  zephyra: [
    { frame: 5, multiplier: 1, pose: 0, tick: 0 },
    { frame: 6, multiplier: 0.6, pose: 0, tick: 1 },
    { frame: 7, multiplier: 0.6, pose: 0, tick: 2 },
    { frame: 5, multiplier: 1, pose: 1, tick: 0 },
    { frame: 6, multiplier: 0.6, pose: 1, tick: 1 },
    { frame: 7, multiplier: 0.6, pose: 1, tick: 2 },
  ],
  solenne: [
    { frame: 4, multiplier: 0.8, pose: 0, tick: 0 },
    { frame: 5, multiplier: 1.2, pose: 0, tick: 1 },
    { frame: 4, multiplier: 0.8, pose: 1, tick: 0 },
    { frame: 5, multiplier: 1.2, pose: 1, tick: 1 },
  ],
  // Kael is a Breaker: two aggressive lunges, the second ending on a heavy
  // committed downswing that carries most of the chain's weight.
  kael: [
    { frame: 0, multiplier: 0.9, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.55, pose: 0, tick: 1 },
    { frame: 2, multiplier: 0.55, pose: 0, tick: 2 },
    { frame: 3, multiplier: 0.9, pose: 1, tick: 0 },
    { frame: 4, multiplier: 1.5, pose: 1, tick: 1 },
  ],
  // Lyra fights in linked dance phrases: three light pairs, each opened by a
  // turning step rather than a fresh run-in.
  lyra: [
    { frame: 0, multiplier: 0.75, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.75, pose: 0, tick: 1 },
    { frame: 2, multiplier: 0.8, pose: 1, tick: 0 },
    { frame: 3, multiplier: 0.8, pose: 1, tick: 1 },
    { frame: 4, multiplier: 0.85, pose: 2, tick: 0 },
    { frame: 5, multiplier: 1.15, pose: 2, tick: 1 },
  ],
  // Brannock is deliberately slow and single-phrase: one long shouldered
  // wind-up into a grounded three-beat crush.
  brannock: [
    { frame: 0, multiplier: 1.05, pose: 0, tick: 0 },
    { frame: 1, multiplier: 1.25, pose: 0, tick: 1 },
    { frame: 2, multiplier: 2.1, pose: 0, tick: 2 },
  ],
  // Nyx is the opposite extreme: three blink-flurries of three, accelerating
  // into the final cut.
  nyx: [
    { frame: 0, multiplier: 0.5, pose: 0, tick: 0 },
    { frame: 1, multiplier: 0.5, pose: 0, tick: 1 },
    { frame: 2, multiplier: 0.55, pose: 0, tick: 2 },
    { frame: 3, multiplier: 0.5, pose: 1, tick: 0 },
    { frame: 4, multiplier: 0.5, pose: 1, tick: 1 },
    { frame: 5, multiplier: 0.6, pose: 1, tick: 2 },
    { frame: 6, multiplier: 0.55, pose: 2, tick: 0 },
    { frame: 7, multiplier: 0.6, pose: 2, tick: 1 },
    { frame: 8, multiplier: 1.1, pose: 2, tick: 2 },
  ],
};

// Every authored chain above is written for readability of its internal
// *shape* — which beat is light and which one lands heavy. Totals are then
// normalised so no unit gains raw damage simply by having an authored chain.
// Previously an authored chain multiplied the unit's whole normal attack once
// per beat, which made Zephyra and Solenne roughly four times stronger than
// any unit still on the generic even split. Set this to `false` to restore the
// old un-normalised behaviour.
const NORMALISE_AUTHORED_CHAINS = true;

const ZEPHYRA_VOLLEY_DRAW_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 64 },
  { frame: 1, stage: "windup", hold: 72 },
  { frame: 2, stage: "windup", hold: 78 },
  { frame: 3, stage: "windup", hold: 92 },
  { frame: 4, stage: "release", hold: 54 },
  { frame: 5, stage: "flight", hold: 96 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

const ZEPHYRA_RANGED_ADVANCE = 0;

const SOLENNE_BEAM_CAST_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 72 },
  { frame: 1, stage: "windup", hold: 82 },
  { frame: 2, stage: "windup", hold: 88 },
  { frame: 3, stage: "release", hold: 92 },
  { frame: 4, stage: "flight", hold: 70 },
  { frame: 5, stage: "impact", hold: 104 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

// Melee phrases open with their own short authored wind-up instead of jumping
// straight onto the contact drawing. Each sequence ends on the frame that
// actually connects, so damage still resolves on the pose the player sees.
const KAEL_LUNGE_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 26 },
  { frame: 1, stage: "release", hold: 20 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

const LYRA_STEP_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 22 },
  { frame: 1, stage: "release", hold: 18 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

// Brannock's whole identity is the commitment before the swing lands.
const BRANNOCK_HEAVE_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 62 },
  { frame: 0, stage: "windup", hold: 74 },
  { frame: 1, stage: "release", hold: 34 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

// Nyx barely winds up at all — the blink is the wind-up.
const NYX_BLINK_SEQUENCE = [
  { frame: 0, stage: "windup", hold: 14 },
] as const satisfies readonly { frame: number; stage: AttackStage; hold: number }[];

// One shared table so a new unit only needs its own sequence, not another
// hand-written branch inside queueAttack.
const NORMAL_CAST_SEQUENCES: Partial<Record<BattleUnitId, readonly { frame: number; stage: AttackStage; hold: number }[]>> = {
  zephyra: ZEPHYRA_VOLLEY_DRAW_SEQUENCE,
  solenne: SOLENNE_BEAM_CAST_SEQUENCE,
  kael: KAEL_LUNGE_SEQUENCE,
  lyra: LYRA_STEP_SEQUENCE,
  brannock: BRANNOCK_HEAVE_SEQUENCE,
  nyx: NYX_BLINK_SEQUENCE,
};

// Ranged units hold their ground; melee units still travel to contact.
const RANGED_NORMAL_UNITS = new Set<BattleUnitId>(["zephyra", "solenne"]);

// A single global 10 ms gap made every authored chain read as the same
// machine-gun rattle. Cadence is characterisation: `tick` is the pause between
// beats inside one phrase, `phrase` the pause between authored phrases.
type NormalCadence = { tick: number; phrase: number };

const DEFAULT_NORMAL_CADENCE: NormalCadence = { tick: 10, phrase: 140 };

const NORMAL_CADENCE: Partial<Record<BattleUnitId, NormalCadence>> = {
  zephyra: { tick: 10, phrase: 140 },
  solenne: { tick: 10, phrase: 140 },
  kael: { tick: 34, phrase: 150 },
  lyra: { tick: 26, phrase: 96 },
  brannock: { tick: 96, phrase: 190 },
  nyx: { tick: 14, phrase: 76 },
};

function getNormalCadence(unitId: BattleUnitId): NormalCadence {
  return NORMAL_CADENCE[unitId] ?? DEFAULT_NORMAL_CADENCE;
}

function showsZephyraProjectile(stage: AttackStage) {
  return stage === "release" || stage === "flight" || stage === "impact" || stage === "hitstop" || stage === "recover";
}

function showsZephyraBowLightning(stage: AttackStage) {
  return stage !== "approach" && stage !== "return";
}

function showsSolenneBeam(stage: AttackStage) {
  return stage === "impact" || stage === "hitstop" || stage === "recover";
}

const normalisedChainCache = new Map<string, readonly NormalAttackBeat[]>();

function normaliseChain(unitId: BattleUnitId, chain: readonly NormalAttackBeat[]): readonly NormalAttackBeat[] {
  if (!NORMALISE_AUTHORED_CHAINS) return chain;
  const cached = normalisedChainCache.get(unitId);
  if (cached) return cached;
  const total = chain.reduce((sum, beat) => sum + beat.multiplier, 0);
  const scaled = total > 0
    ? chain.map((beat) => ({ ...beat, multiplier: beat.multiplier / total }))
    : chain;
  normalisedChainCache.set(unitId, scaled);
  return scaled;
}

function getNormalAttackChain(unit: Unit, stars: StarTier): readonly NormalAttackBeat[] {
  const authoredChain = NORMAL_ATTACK_CHAINS[unit.id];
  if (authoredChain) return normaliseChain(unit.id, authoredChain);
  const hitCount = stars < 5 ? 4 : unit.sprites.attack.length;
  return Array.from({ length: hitCount }, (_, frame) => ({
    frame: Math.min(frame, unit.sprites.attack.length - 1),
    multiplier: 1 / hitCount,
    pose: frame,
    tick: 0,
  }));
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
  owned: ["kael", "lyra", "brannock", "zephyra", "solenne"],
  party: ["kael", "lyra", "brannock", "zephyra", "solenne"],
  unitLevels: { kael: 22, lyra: 20, brannock: 21, zephyra: 18, solenne: 18 },
  unitStars: { kael: 5, lyra: 5, brannock: 5, zephyra: 5, solenne: 5 },
  unitXp: { kael: 240, lyra: 180, brannock: 210, zephyra: 120, solenne: 120 },
  burstLevels: { kael: 4, lyra: 4, brannock: 3, zephyra: 3, solenne: 3 },
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
  equippedRelics: { kael: "Moonstone Edge", brannock: "Rootbound Crest", lyra: "Tideglass Charm" },
  covenantPoints: 820,
  summonPity: 2,
  summonHistory: [],
  squads: [
    ["kael", "lyra", "brannock", "zephyra", "solenne"],
    ["brannock", "lyra", "kael"],
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
  return stars === 5 ? unit.portrait : `/units/forms/${unit.id}-${stars}.webp`;
}

function getMaxLevel(stars: StarTier) {
  return stars === 3 ? 40 : stars === 4 ? 60 : 80;
}

function getFormMultiplier(stars: StarTier) {
  return stars === 3 ? 0.72 : stars === 4 ? 0.86 : 1;
}

function getFormStat(unit: Unit, stars: StarTier, level: number, stat: "hp" | "atk" | "def" | "rec") {
  const growth = stat === "hp" ? 1 + level / 100 : stat === "atk" ? 1 + level / 110 : 1 + level / 120;
  return Math.round(unit[stat] * getFormMultiplier(stars) * growth);
}

function getSquadCost(ids: string[], stars: Record<string, StarTier>) {
  return ids.reduce((total, id) => total + Math.max(12, getUnit(id).cost - (5 - (stars[id] ?? 3)) * 4), 0);
}

const ENEMY_FORMATIONS: Record<number, { left: number; bottom: number }[]> = {
  2: [{ left: 28, bottom: 79 }, { left: 125, bottom: 132 }],
  3: [{ left: 10, bottom: 71 }, { left: 91, bottom: 145 }, { left: 127, bottom: 51 }],
  4: [{ left: 2, bottom: 69 }, { left: 69, bottom: 151 }, { left: 78, bottom: 45 }, { left: 145, bottom: 119 }],
  5: [{ left: 0, bottom: 73 }, { left: 58, bottom: 156 }, { left: 66, bottom: 44 }, { left: 127, bottom: 136 }, { left: 145, bottom: 42 }],
};

const HERO_FORMATION = [
  // Keep the field positions in the same row-major order as the command deck:
  // 1/2 top row, 3/4 middle row, 5 bottom-left. Every slot is centred on one
  // of two exact column axes so differently sized unit canvases still line up.
  // The tighter vertical spacing keeps every foot line above the enemy HP rail.
  { right: 88, bottom: 174, width: 78 },
  { right: 14, bottom: 174, width: 64 },
  { right: 89.5, bottom: 130, width: 75 },
  { right: 14.5, bottom: 130, width: 63 },
  { right: 96, bottom: 88, width: 62 },
];

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
  const contactCenter = enemy.left + 82 + hero.width * 0.4;
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
    <div className={`unit-portrait ${unit.element} form-${stars} ${className}`}>
      {portrait && !failed ? (
        <img src={portrait} alt={`${unit.name}, ${unit.formTitles[stars]}, ${stars} star form`} onError={() => setFailed(true)} draggable={false} />
      ) : (
        <span className="portrait-fallback">{unit.glyph}</span>
      )}
      <span className="portrait-glow" />
    </div>
  );
}

function UnitKeyArt({ unit, className = "" }: { unit: Unit; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`unit-key-art key-art-${unit.element} unit-${unit.id} ${className}`}>
      <img
        src={failed ? unit.portrait : unit.keyArt}
        alt={`${unit.name}, ${unit.title} character illustration`}
        onError={() => setFailed(true)}
        draggable={false}
      />
      <span className="key-art-vignette" aria-hidden="true" />
    </div>
  );
}

function StableBattleFrame({ src, className }: { src: string; className: string }) {
  const [displayedSrc, setDisplayedSrc] = useState(src);

  useEffect(() => {
    if (src === displayedSrc) return;
    let cancelled = false;
    const nextFrame = new Image();
    nextFrame.src = src;
    const commit = () => {
      if (!cancelled) setDisplayedSrc(src);
    };
    if (nextFrame.complete) {
      void nextFrame.decode().catch(() => undefined).then(commit);
    } else {
      nextFrame.onload = () => void nextFrame.decode().catch(() => undefined).then(commit);
    }
    return () => {
      cancelled = true;
      nextFrame.onload = null;
    };
  }, [displayedSrc, src]);

  return <img className={className} src={displayedSrc} alt="" draggable={false} data-frame-ready="true" />;
}

/* BurstAnimationCanvas removed: it was a from-scratch Canvas2D 88-particle
   draw loop duplicating ElementalBurstLayer's job in a second renderer.
   Bursts now render through BurstRemotionOverlay only (called directly
   where this component used to be invoked). See app/globals.css for the
   corresponding removal of .burst-signature / .burst-animation-canvas. */

const IDLE_CYCLE_MS = 1420;
const IDLE_FRAME_B_START_MS = 568;
const IDLE_FRAME_B_END_MS = 1022;
const UNIT_IDLE_OFFSETS: Record<string, number> = {
  kael: 150,
  lyra: 670,
  brannock: 1040,
  zephyra: 1390,
  solenne: 860,
  nyx: 420,
};

function BattleUnitSprite({ unit, mode, attackFrame = 0, stars = 5 }: { unit: Unit; mode: "idle" | "attack" | "burst"; attackFrame?: number; stars?: StarTier }) {
  const [idleFrame, setIdleFrame] = useState<"a" | "b">("a");

  useEffect(() => {
    if (mode !== "idle" || stars < 5) return;
    let timer = 0;
    const offset = UNIT_IDLE_OFFSETS[unit.id] ?? 0;
    const updateExclusiveIdleFrame = () => {
      const phase = (performance.now() + offset) % IDLE_CYCLE_MS;
      const nextFrame = phase >= IDLE_FRAME_B_START_MS && phase < IDLE_FRAME_B_END_MS ? "b" : "a";
      setIdleFrame(nextFrame);
      const untilBoundary = nextFrame === "b"
        ? IDLE_FRAME_B_END_MS - phase
        : phase < IDLE_FRAME_B_START_MS
          ? IDLE_FRAME_B_START_MS - phase
          : IDLE_CYCLE_MS - phase + IDLE_FRAME_B_START_MS;
      timer = window.setTimeout(updateExclusiveIdleFrame, Math.max(16, untilBoundary + 1));
    };
    timer = window.setTimeout(updateExclusiveIdleFrame, 0);
    return () => window.clearTimeout(timer);
  }, [mode, stars, unit.id]);

  useEffect(() => {
    if (stars < 5) return;
    const sources = [unit.sprites.idleA, unit.sprites.idleB, ...unit.sprites.attack, ...unit.sprites.burst];
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
  }, [stars, unit.id, unit.sprites.attack, unit.sprites.burst, unit.sprites.idleA, unit.sprites.idleB]);

  const lowerForm = stars < 5;
  const lowerSource = lowerForm ? getFormPortrait(unit, stars) : "";
  const normalFrame = attackFrame % Math.max(1, unit.sprites.attack.length);
  const burstFrame = attackFrame % Math.max(1, unit.sprites.burst.length);
  const activeSource = lowerForm
    ? lowerSource
    : mode === "idle"
      ? idleFrame === "a" ? unit.sprites.idleA : unit.sprites.idleB
      : mode === "attack"
        ? unit.sprites.attack[normalFrame] ?? unit.sprites.idleA
        : unit.sprites.burst[burstFrame] ?? unit.sprites.idleA;
  const frameClass = mode === "idle"
    ? `sprite-idle-${lowerForm ? "a" : idleFrame}`
    : mode === "attack"
      ? `sprite-attack-frame${lowerForm ? ` lower-hit-${attackFrame % 4 + 1}` : ""}`
      : "sprite-burst sprite-burst-frame";
  return (
    <div
      className={`battle-unit-sprite single-frame-renderer ${lowerForm ? "lower-form-sprite " : ""}sprite-${mode}`}
      role="img"
      aria-label={`${unit.name}${lowerForm ? ` ${stars} star` : ""} ${mode === "attack" ? `combo hit ${attackFrame + 1}` : mode} battle sprite facing the enemy`}
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
  const tabs: { id: Screen; label: string; Icon: LucideIcon }[] = [
    { id: "home", label: "Home", Icon: Home },
    { id: "units", label: "Units", Icon: Users },
    { id: "town", label: "Town", Icon: Castle },
    { id: "shop", label: "Shop", Icon: ShoppingBag },
    { id: "summon", label: "Summon", Icon: Sparkles },
    { id: "arena", label: "Arena", Icon: Swords },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} className={screen === id ? "active" : ""} onClick={() => go(id)}>
          <span className="nav-icon-frame">
            <Icon size={21} strokeWidth={2.1} />
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
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedFormStars, setSelectedFormStars] = useState<StarTier>(5);
  const [unitFilter, setUnitFilter] = useState<ElementKey | "all">("all");
  const [unitSort, setUnitSort] = useState<"rarity" | "level">("rarity");
  const [soundOn, setSoundOn] = useState(true);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [battlefieldWidth, setBattlefieldWidth] = useState(430);
  const [storyQuestId, setStoryQuestId] = useState(1);
  const [storyStep, setStoryStep] = useState(0);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [victory, setVictory] = useState<{ won: boolean; reward: number } | null>(null);
  const [battleSpeed, setBattleSpeed] = useState<BattleSpeed>(1);
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
  const homeSwipe = useRef({ pointerId: -1, startX: 0, moved: false });
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

  // Every combat layer uses the same shortened cadence. CSS travel, Remotion
  // contact art, damage feedback and enemy recoil therefore stay on one clock.
  const waitForBattle = (milliseconds: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, getBattleDuration(milliseconds, battleSpeed)));

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
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

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
      setSave((current) => {
        if (current.energy >= current.maxEnergy) return current;
        const gained = Math.floor((Date.now() - current.lastEnergyAt) / 180000);
        if (gained < 1) return current;
        return {
          ...current,
          energy: Math.min(current.maxEnergy, current.energy + gained),
          lastEnergyAt: current.lastEnergyAt + gained * 180000,
        };
      });
    };
    refill();
    const timer = window.setInterval(refill, 30000);
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
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const playSfx = (kind: "tap" | "hit" | "spark" | "burst" | "crystal" | "warning" | "victory" | "evolve") => {
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
      }[kind];
      if (vibration) navigator.vibrate(vibration);
    }
    const context = menuMusic.current?.context;
    if (!soundOn || !context || gameSettings.sfxVolume <= 0) return;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const now = context.currentTime;
    const sfxProfile = {
      tap: [420, 610, 0.05, 0.035, "sine"],
      hit: [150, 78, 0.09, 0.065, "square"],
      spark: [720, 1180, 0.16, 0.05, "triangle"],
      burst: [95, 520, 0.52, 0.075, "sawtooth"],
      crystal: [980, 1480, 0.13, 0.035, "sine"],
      warning: [92, 70, 0.42, 0.055, "square"],
      victory: [392, 784, 0.7, 0.05, "triangle"],
      evolve: [240, 960, 0.8, 0.055, "sine"],
    }[kind] as [number, number, number, number, OscillatorType];
    oscillator.type = sfxProfile[4];
    oscillator.frequency.setValueAtTime(sfxProfile[0], now);
    oscillator.frequency.exponentialRampToValueAtTime(sfxProfile[1], now + sfxProfile[2]);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sfxProfile[3] * gameSettings.sfxVolume / 100), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sfxProfile[2]);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + sfxProfile[2] + 0.02);
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
    setSave((current) => ({ ...current, energy: current.energy - quest.energy, lastEnergyAt: Date.now() }));
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
    const enemy = getEnemy(target.enemyId);
    const burst = wantsBurst && actor.gauge >= 100;
    const now = Date.now();
    const combo = now - lastAttackAt.current < 1250 ? Math.min(battle.combo + 1, 12) : 1;
    lastAttackAt.current = now;
    const advantage = ELEMENTS[unit.element].strong === enemy.element ? 1.45 : ELEMENTS[enemy.element].strong === unit.element ? 0.78 : 1;
    const level = save.unitLevels[unit.id] ?? 1;
    const base = unit.atk * (0.55 + level / 100);
    const damage = Math.round(base * (burst ? 2.7 : 1) * advantage * (1 + (combo - 1) * 0.08));
    const normalHits = unit.sprites.attack.length;
    const hits = burst ? Math.min(18, normalHits * 2) : normalHits;
    let updatedParty = battle.party.map((member) =>
      member.id === unitId
        ? { ...member, acted: true, guarding: false, gauge: burst ? 0 : Math.min(100, member.gauge + 34 + Math.min(8, hits)) }
        : member,
    );
    if (burst && (unit.id === "lyra" || unit.id === "solenne")) {
      const healRatio = unit.id === "solenne" ? 0.3 : 0.2;
      updatedParty = updatedParty.map((member) => ({ ...member, hp: Math.min(getUnit(member.id).hp, member.hp + Math.round(getUnit(member.id).hp * healRatio)) }));
    }
    const hitMessage = burst
      ? `${unit.burstName}! Aether Burst`
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
      label: burst ? unit.burstName : "",
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
        message: burst ? `${unit.burstName} tears through ${enemy.name}!` : `${unit.name} strikes ${enemy.name}.`,
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
        label: burst ? unit.burstName : "",
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

  const queueAttack = async (unitId: string, wantsBurst = false, fromAuto = false) => {
    const opening = battleRef.current;
    if (!opening || victory || enemyTurnLock.current || battleFlowLock.current || (autoTurnLock.current && !fromAuto)) return;
    const actor = opening.party.find((member) => member.id === unitId);
    if (!actor || actor.acted || actor.hp <= 0 || activeAttackIds.current.has(unitId)) return;
    const quest = QUESTS.find((item) => item.id === opening.questId)!;
    const unit = getUnit(unitId);
    const stars = save.unitStars[unitId] ?? 3;
    const burst = wantsBurst && actor.gauge >= 100;
    const attackScope = burst ? unit.burstScope : unit.attackScope;
    const openingTargets = getBattleTargets(opening, attackScope);
    const firstTarget = openingTargets[0];
    if (!firstTarget) return;
    const lockedTargetIds = openingTargets.map((target) => target.instanceId);
    const normalAttackChain = getNormalAttackChain(unit, stars);
    const rapidNormalChain = !burst && Boolean(NORMAL_ATTACK_CHAINS[unit.id]);
    const hits = burst ? (stars < 5 ? 6 : unit.burstHits) : normalAttackChain.length;
    const animationSteps = hits;
    const attackId = `${unitId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const heroIndex = Math.max(0, opening.party.findIndex((member) => member.id === unitId));
    const openingTargetIndex = Math.max(0, opening.enemies.findIndex((enemy) => enemy.instanceId === firstTarget.instanceId));
    const contactAnchor = getContactOffset(opening.enemies.length, openingTargetIndex, heroIndex, battlefieldWidth);
    activeAttackIds.current.add(unitId);
    updateBattleLive((state) => ({
      ...state,
      party: state.party.map((member) => member.id === unitId ? { ...member, acted: true, guarding: false, gauge: burst ? 0 : member.gauge } : member),
      message: burst
        ? `${unit.burstName}!${attackScope === "all" ? " All enemies caught in range." : state.targetEnemyId ? " Focus locked." : " Upper-foe priority."}`
        : unit.id === "solenne"
          ? `${unit.name} invokes judgement above ${state.targetEnemyId ? "the focused target" : "the upper-priority target"}.`
          : unit.id === "zephyra"
            ? `${unit.name} draws on ${state.targetEnemyId ? "the focused target" : "the upper-priority target"}.`
            : `${unit.name} rushes ${state.targetEnemyId ? "the focused target" : "the upper-priority target"}.`,
    }));
    setAttackFxs((current) => [...current, {
      id: attackId,
      unitId: unit.id,
      targetEnemyId: firstTarget.instanceId,
      scope: attackScope,
      phase: burst ? "burst-intro" : "attack",
      stage: "approach",
      frame: burst || unit.id === "zephyra" || unit.id === "solenne" ? 0 : normalAttackChain[0]?.frame ?? 0,
      volley: 0,
      hits,
      label: burst ? unit.burstName : "",
      contactX: contactAnchor.x,
      contactY: contactAnchor.y,
    }]);
    playSfx(burst ? "burst" : "tap");
    if (burst) {
      // Keep combat parked until the named Burst illustration has fully faded.
      await waitForBattle(760);
      setAttackFxs((current) => current.map((fx) => fx.id === attackId ? { ...fx, phase: "burst", stage: "approach" } : fx));
      playSfx("burst");
      await waitForBattle(180);
    } else {
      await waitForBattle(180);
    }

    const attackPower = getFormStat(unit, stars, save.unitLevels[unitId] ?? 1, "atk");
    const totalBase = attackPower * (burst ? 3.25 + (save.burstLevels[unitId] ?? 1) * 0.08 : 1.18);
    for (const step of Array.from({ length: animationSteps }, (_, index) => index)) {
      const state = battleRef.current;
      if (!state) break;
      // A move owns the targets it selected at launch. In particular, a
      // single-target chain never hops to a second enemy after a lethal hit;
      // the original target remains present for every overkill pose and impact.
      const targets = state.enemies.filter((enemy) => lockedTargetIds.includes(enemy.instanceId));
      const primaryTarget = targets[0];
      if (!primaryTarget) break;
      const visualTargetId = primaryTarget.instanceId;
      const normalBeat = normalAttackChain[Math.min(step, normalAttackChain.length - 1)];
      const previousNormalBeat = step > 0 ? normalAttackChain[Math.min(step - 1, normalAttackChain.length - 1)] : null;
      const nextNormalBeat = step < animationSteps - 1 ? normalAttackChain[Math.min(step + 1, normalAttackChain.length - 1)] : null;
      const startsNormalPose = !burst && (!previousNormalBeat || previousNormalBeat.pose !== normalBeat.pose);
      const endsNormalPose = !burst && (!nextNormalBeat || nextNormalBeat.pose !== normalBeat.pose);
      const attackFrame = burst ? Math.min(step, unit.sprites.burst.length - 1) : normalBeat.frame;
      // Every authored unit now opens each damage packet with its own drawn
      // wind-up. Zephyra plays a full bow draw, Solenne a planted invocation,
      // and the melee units their own lunge, turning step, shouldered heave or
      // blink. One table drives all of them.
      const castSequence = !burst && startsNormalPose ? NORMAL_CAST_SEQUENCES[unit.id] : undefined;
      if (castSequence) {
        for (const drawing of castSequence) {
          setAttackFxs((current) => current.map((fx) => fx.id === attackId ? {
            ...fx,
            frame: drawing.frame,
            volley: normalBeat.pose,
            targetEnemyId: visualTargetId,
            stage: drawing.stage,
          } : fx));
          await waitForBattle(drawing.hold);
        }
        // The wind-up owns the frames leading up to contact; the beat itself
        // owns the frame that connects. Ranged draws already end on their
        // contact frame, so this only moves the melee phrases into place.
        if (castSequence[castSequence.length - 1]?.frame !== attackFrame) {
          setAttackFxs((current) => current.map((fx) => fx.id === attackId ? {
            ...fx,
            frame: attackFrame,
            volley: normalBeat.pose,
            targetEnemyId: visualTargetId,
            stage: "impact",
          } : fx));
          await waitForBattle(12);
        }
      } else {
        setAttackFxs((current) => current.map((fx) => fx.id === attackId ? {
          ...fx,
          frame: attackFrame,
          volley: normalBeat.pose,
          targetEnemyId: visualTargetId,
          stage: startsNormalPose || burst ? "windup" : "impact",
        } : fx));
        await waitForBattle(burst ? 55 : rapidNormalChain ? startsNormalPose ? 42 : 10 : 65);
      }
      const sparkTargets = await resolveSparkFrame(unitId, targets.map((target) => target.instanceId));
      const critical = Math.random() < CRITICAL_CHANCE;
      const now = performance.now();
      const timingScale = getBattleTimeScale(battleSpeed);
      const heartDrop = primaryTarget.hp > 0 && step % 4 === 3 && state.party.some((member) => member.hp > 0 && member.hp < getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp"));
      const anySpark = sparkTargets.size > 0;
      const ailment = burst && unit.id === "kael" ? "Burn" : anySpark && unit.id === "zephyra" ? "Shock" : critical && unit.id === "nyx" ? "Def Down" : "";
      const outcomes = targets.map((target, targetIndex) => {
        const enemy = getEnemy(target.enemyId);
        const advantage = ELEMENTS[unit.element].strong === enemy.element ? 1.45 : ELEMENTS[enemy.element].strong === unit.element ? 0.78 : 1;
        const variance = 0.93 + Math.random() * 0.14;
        const spark = sparkTargets.has(target.instanceId);
        const wasAlive = target.hp > 0;
        const hitMultiplier = burst ? 1 / animationSteps : normalBeat.multiplier;
        const damage = Math.max(1, Math.round(totalBase * hitMultiplier * advantage * variance * (critical ? CRITICAL_DAMAGE_MULTIPLIER : 1) * (spark ? SPARK_DAMAGE_MULTIPLIER : 1)));
        const killed = wasAlive && target.hp - damage <= 0;
        const kind: CrystalKind = killed ? (enemy.boss ? "material" : "gold") : heartDrop && targetIndex === 0 ? "heart" : "burst";
        return { target, enemy, advantage, damage, killed, kind, spark, wasAlive, fxId: `${attackId}-hit-${step}-${target.instanceId}` };
      });

      if (anySpark) lastSparkAt.current = now;

      const impactFeedback = [
        unit.name,
        attackScope === "all" ? "ALL-FOE" : "",
        anySpark ? "AETHER SPARK +25%" : "",
        critical ? "CRITICAL +50%" : "",
        !anySpark && !critical && outcomes.some((outcome) => outcome.advantage > 1) ? "WEAKNESS!" : "",
      ].filter(Boolean).join(" · ");

      updateBattleLive((current) => {
        const nextCombo = anySpark ? Math.min(99, current.combo + 1) : now - lastSparkAt.current > 650 * timingScale ? 0 : current.combo;
        let healed = false;
        const nextParty = current.party.map((member) => {
          if (member.id === unitId) return { ...member, gauge: burst ? 0 : Math.min(100, member.gauge + Math.ceil(44 / animationSteps)) };
          if (heartDrop && !healed && member.hp > 0) {
            const maxHp = getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp");
            if (member.hp < maxHp) {
              healed = true;
              return { ...member, hp: Math.min(maxHp, member.hp + Math.round(maxHp * 0.07)) };
            }
          }
          return member;
        });
        const recoveredParty = burst && step === animationSteps - 1 && (unit.id === "lyra" || unit.id === "solenne") ? nextParty.map((member) => {
          const ratio = unit.id === "solenne" ? 0.28 : 0.18;
          const maxHp = getFormStat(getUnit(member.id), save.unitStars[member.id] ?? 3, save.unitLevels[member.id] ?? 1, "hp");
          return { ...member, hp: Math.min(maxHp, member.hp + Math.round(maxHp * ratio)), ailment: "" };
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
          party: recoveredParty.map((member) => burst && step === animationSteps - 1 && unit.id === "kael" ? { ...member, buffs: member.buffs.includes("ATK UP") ? member.buffs : [...member.buffs, "ATK UP"] } : burst && step === animationSteps - 1 && unit.id === "brannock" ? { ...member, buffs: member.buffs.includes("GUARD UP") ? member.buffs : [...member.buffs, "GUARD UP"] } : member),
          targetEnemyId: focusDefeated ? "" : current.targetEnemyId,
          loot: {
            gold: current.loot.gold + outcomes.reduce((total, outcome) => total + (outcome.killed ? 24 + quest.chapter * 8 : 0), 0),
            materials: current.loot.materials + outcomes.filter((outcome) => outcome.killed && (outcome.enemy.boss || Math.random() < 0.35)).length,
            hearts: current.loot.hearts + (heartDrop ? 1 : 0),
            crystals: current.loot.crystals + outcomes.filter((outcome) => outcome.wasAlive).length,
          },
          message: impactFeedback,
        };
      });

      setAttackFxs((current) => current.map((fx) => fx.id === attackId ? { ...fx, stage: "impact" } : fx));
      const damageEffects: DamageFx[] = outcomes.map((outcome) => ({
        id: outcome.fxId,
        unitId: unit.id,
        targetEnemyId: outcome.target.instanceId,
        damage: outcome.damage,
        spark: outcome.spark,
        critical,
        weakness: outcome.advantage > 1,
        hit: burst ? step + 1 : attackFrame + 1,
        burst,
        frame: attackFrame,
        finisher: burst && step === animationSteps - 1,
      }));
      const crystalEffects: CrystalFx[] = outcomes.filter((outcome) => outcome.wasAlive).map((outcome) => ({ id: outcome.fxId, targetEnemyId: outcome.target.instanceId, unitId, kind: outcome.kind }));
      setDamageFxs((current) => [...current, ...damageEffects]);
      setCrystalFxs((current) => [...current, ...crystalEffects]);
      const effectIds = new Set(outcomes.map((outcome) => outcome.fxId));
      // Slow authored chains (Brannock) must not have their numerals culled
      // before the next beat even lands; dense ones (Nyx) must not stack into
      // an unreadable pile.
      const numeralLife = rapidNormalChain ? (normalAttackChain.length <= 4 ? 470 : normalAttackChain.length >= 8 ? 300 : 380) : 450;
      window.setTimeout(() => setDamageFxs((current) => current.filter((fx) => !effectIds.has(fx.id))), getBattleDuration(numeralLife, battleSpeed));
      window.setTimeout(() => setCrystalFxs((current) => current.filter((fx) => !effectIds.has(fx.id))), getBattleDuration(500, battleSpeed));
      playSfx(anySpark ? "spark" : outcomes.some((outcome) => outcome.wasAlive && outcome.kind !== "burst") ? "crystal" : "hit");
      // Weight the camera by what actually happened rather than shaking the
      // same amount for every beat. A heavy authored beat (Brannock's crush,
      // Kael's downswing) already carries a larger multiplier, so the chain's
      // own shape feeds the camera for free.
      const finisherBeat = burst && step === animationSteps - 1;
      const beatWeight = burst ? 1 : Math.min(2.2, normalBeat.multiplier * normalAttackChain.length);
      const hitPower = Math.min(
        3.4,
        beatWeight
        * (burst ? 1.35 : 1)
        * (finisherBeat ? 1.9 : 1)
        * (critical ? 1.3 : 1)
        * (anySpark ? 1.22 : 1)
        * (outcomes.some((outcome) => outcome.killed) ? 1.25 : 1),
      );
      setImpactPower(Number(hitPower.toFixed(2)));
      setScreenImpact((value) => value + 1);

      // A hit is a small authored sequence rather than an immediate frame swap:
      // connect, freeze on the damage pose, then recoil before the next drawing.
      await waitForBattle(burst ? 18 : rapidNormalChain ? 12 : 22);
      setAttackFxs((current) => current.map((fx) => fx.id === attackId ? { ...fx, stage: "hitstop" } : fx));
      await waitForBattle(burst ? 48 : rapidNormalChain ? 26 : 55);
      setAttackFxs((current) => current.map((fx) => fx.id === attackId ? { ...fx, stage: "recover" } : fx));
      await waitForBattle(burst ? 32 : rapidNormalChain ? 16 : 38);
      if (anySpark || critical || (burst && step === animationSteps - 1)) await waitForBattle(34);
      // Leave the completed contact drawing on screen before the next pose is
      // loaded. Follow-up ticks inside one pose are deliberately much tighter;
      // the larger gap appears only between the two authored strike drawings.
      await waitForBattle(
        burst
          ? 30
          : rapidNormalChain
            ? endsNormalPose && step < animationSteps - 1
              ? getNormalCadence(unit.id).phrase
              : getNormalCadence(unit.id).tick
            : 92,
      );
    }

    const resolved = battleRef.current;
    if (resolved) updateBattleLive((state) => ({ ...state, message: `${unit.name} completes ${burst ? unit.burstName : "the attack chain"}. Tap another unit—overlap attacks to Spark.` }));
    setAttackFxs((current) => current.map((fx) => fx.id === attackId ? { ...fx, stage: "return" } : fx));
    await waitForBattle(140);
    setAttackFxs((current) => current.filter((fx) => fx.id !== attackId));
    activeAttackIds.current.delete(unitId);
    await advanceModernBattle();
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
    playSfx("tap");
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
    const maxLevel = getMaxLevel(stars);
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
    const sealCost = stars === 3 ? 2 : 4;
    const elementKey = unit.element === "fire" ? "ember" : unit.element === "water" ? "tide" : unit.element === "earth" ? "grove" : unit.element === "thunder" ? "storm" : unit.element === "light" ? "radiance" : "umbral";
    if (level < getMaxLevel(stars)) return setToast(`Reach Lv.${getMaxLevel(stars)} before Ascension`);
    if (save.materials.seal < sealCost || (save.materials[elementKey] ?? 0) < 6) return setToast(`Ascension needs ${sealCost} Seals and 6 ${ELEMENTS[unit.element].label} Cores`);
    const nextStars = (stars + 1) as StarTier;
    setSave((current) => ({
      ...current,
      unitStars: { ...current.unitStars, [id]: nextStars },
      unitLevels: { ...current.unitLevels, [id]: 1 },
      materials: { ...current.materials, seal: current.materials.seal - sealCost, [elementKey]: current.materials[elementKey] - 6 },
    }));
    setSelectedFormStars(nextStars);
    playSfx("evolve");
    setToast(`${unit.name} ascended to ${nextStars}★ · ${unit.formTitles[nextStars]}`);
  };

  const summon = (gate: "aether" | "covenant" = "aether") => {
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
    const stars: StarTier = gate === "covenant" ? (roll < 0.08 ? 4 : 3) : save.summonPity >= 9 || roll < 0.08 ? 5 : roll < 0.48 ? 4 : 3;
    const duplicate = save.owned.includes(result.id);
    setSave((current) => ({
      ...current,
      gems: gate === "aether" ? current.gems - 5 : current.gems,
      covenantPoints: gate === "covenant" ? current.covenantPoints - 200 : current.covenantPoints,
      gold: duplicate ? current.gold + 900 : current.gold,
      materials: duplicate ? { ...current.materials, aether: current.materials.aether + 8 } : current.materials,
      owned: duplicate ? current.owned : [...current.owned, result.id],
      unitLevels: { ...current.unitLevels, [result.id]: current.unitLevels[result.id] ?? 1 },
      unitStars: { ...current.unitStars, [result.id]: Math.max(current.unitStars[result.id] ?? 3, stars) as StarTier },
      unitXp: { ...current.unitXp, [result.id]: current.unitXp[result.id] ?? 0 },
      burstLevels: { ...current.burstLevels, [result.id]: current.burstLevels[result.id] ?? 1 },
      summonPity: gate === "aether" ? (stars === 5 ? 0 : current.summonPity + 1) : current.summonPity,
      summonHistory: [`${stars}★ ${result.name}${duplicate ? " · Echo" : ""}`, ...current.summonHistory].slice(0, 12),
    }));
    setSummonResult({ unit: result, stars, duplicate });
    playSfx(stars === 5 ? "evolve" : "crystal");
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
    setSave((current) => ({ ...current, energy: current.energy - energyCost, lastEnergyAt: Date.now() }));
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
      arenaRank: Math.max(0, current.arenaRank + (won ? 18 : -6)),
      gold: current.gold + (won ? 700 : 120),
    }));
    setToast(won ? "Victory! +18 AP, +700 gold" : "Defeat. Your squad gained experience.");
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
      kicker: isSunpetalChapter ? "MAIN STORY · SUNPETAL VALE" : "MAIN STORY · THE SHATTERED CROWN",
      title: "STORY",
      accent: "QUEST",
      copy: isSunpetalChapter
        ? "Begin your adventure across sunny meadows, sparkling streams and flower-filled trails."
        : "Cross three regions and reclaim the Crown before the Rift consumes Lume.",
      meta: `Stage ${Math.min(save.unlockedStage, 15)} of 15 · ${save.energy} energy`,
      action: "CONTINUE",
      image: isSunpetalChapter ? "/stages/chapter-1-sunmeadow.webp" : "/destinations/story.webp",
      medallionArt: "/destinations/medallions/story.webp",
      medallionAlt: "The shattered Crown floating above an ancient Aether pedestal",
      tone: "story",
      screen: "quests",
    },
    {
      id: "rift",
      kicker: "ROTATING FRONTIER · REWARDS REFRESH",
      title: "RIFT",
      accent: "GATE",
      copy: "Challenge shifting elemental formations for cores, Relic Dust and rare Seals.",
      meta: `${save.eventTokens} Rift tokens · 3 energy`,
      action: "ENTER GATE",
      image: "/destinations/rift-gate.webp",
      medallionArt: "/destinations/medallions/rift-gate.webp",
      medallionAlt: "An ancient dimensional gate opening into the elemental Rift",
      tone: "rift",
      screen: "modes",
      modeTab: "events",
    },
    {
      id: "tower",
      kicker: "CROWN TRIAL · ENDLESS ASCENT",
      title: "AETHER",
      accent: "TOWER",
      copy: "Carry one squad through escalating floors, boss laws and persistent pressure.",
      meta: `Floor ${save.towerFloor} · Squad power ${squadPower}`,
      action: "ASCEND",
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
    setHomeBanner((current) => Math.max(0, Math.min(homeDestinations.length - 1, current + direction)));
  };
  const openHomeDestination = (destination = activeHomeDestination) => {
    if (homeSwipe.current.moved) return;
    if (destination.modeTab) setModeTab(destination.modeTab);
    go(destination.screen);
  };
  const beginHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    homeSwipe.current = { pointerId: event.pointerId, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHomeDragX(0);
  };
  const moveHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    const travel = event.clientX - homeSwipe.current.startX;
    if (Math.abs(travel) > 10) homeSwipe.current.moved = true;
    setHomeDragX(Math.max(-110, Math.min(110, travel)));
  };
  const finishHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    const travel = event.clientX - homeSwipe.current.startX;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    if (Math.abs(travel) > 45) shiftHomeBanner(travel > 0 ? -1 : 1);
    else setHomeDragX(0);
    homeSwipe.current.pointerId = -1;
    window.setTimeout(() => { homeSwipe.current.moved = false; }, 0);
  };
  const cancelHomeSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (homeSwipe.current.pointerId !== event.pointerId) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    homeSwipe.current = { pointerId: -1, startX: 0, moved: false };
    setHomeDragX(0);
  };

  const renderHome = () => {
    const dailyClaimed = save.dailyClaimed === todayKey();
    return (
      <>
        <header className="frontier-home-header">
          <div className="home-player-panel">
            <div className="home-player-line"><strong>CONOR</strong><span>Lv. {save.level}</span></div>
            <div className="home-meter xp"><small>EXP</small><i><b style={{ width: `${Math.min(100, save.xp / 10)}%` }} /></i><em>{save.xp}/1000</em></div>
            <div className="home-meter energy"><small>ENERGY</small><i><b style={{ width: `${save.energy / save.maxEnergy * 100}%` }} /></i><em>{save.energy}/{save.maxEnergy}</em></div>
          </div>

          <div className="home-crest" aria-label="Gates of Azura">
            <span className="crest-radiance" aria-hidden="true" />
            <button className="crest-gem" onClick={installApp} aria-label="Install Gates of Azura app"><Gem fill="currentColor" /></button>
            <span className="crest-nameplate">
              <small>GATES OF</small>
              <strong>AZURA</strong>
            </span>
            <em>{isSunpetalChapter ? "SUNPETAL VALE" : "THE SHATTERED CROWN"}</em>
          </div>

          <div className="home-wallet-panel">
            <div className="home-wallet-heading">
              <strong>CROWN WARDEN</strong>
              <button className="home-settings-button" onClick={() => { setSettingsOpen(true); playSfx("tap"); }} aria-label="Open game settings">
                <Settings2 />
              </button>
            </div>
            <span><Gem fill="currentColor" />{save.gems.toLocaleString()}</span>
            <span><Coins fill="currentColor" />{save.gold.toLocaleString()}</span>
            <div className="home-arena-orbs"><small>ARENA</small>{[0, 1, 2].map((orb) => <i key={orb} className={orb < save.arenaOrbs ? "full" : ""} />)}</div>
          </div>
        </header>

        <button
          className="home-main-story-gate"
          onClick={() => { playSfx("tap"); go("quests"); }}
          aria-label="Enter the Main Story"
        >
          <img src="/ui/main-story-gate.png" alt="Main Story dragon gate" draggable={false} />
        </button>

        <section
          className={`home-destination destination-${activeHomeDestination.tone}`}
          onPointerDown={beginHomeSwipe}
          onPointerMove={moveHomeSwipe}
          onPointerUp={finishHomeSwipe}
          onPointerCancel={cancelHomeSwipe}
        >
          <div
            className="home-destination-track"
            style={{
              transform: `translate3d(calc(${-homeBanner * 100}% + ${homeDragX}px), 0, 0)`,
              transition: homeDragX === 0 ? "transform .38s cubic-bezier(.2,.78,.2,1)" : "none",
            }}
          >
            {homeDestinations.map((destination, index) => (
              <article
                key={destination.id}
                className={`home-destination-slide destination-${destination.tone} ${destination.id === "story" && isSunpetalChapter ? "destination-sunpetal" : ""}`}
                style={{ "--destination-image": `url(${destination.image})` } as CSSProperties}
                aria-hidden={index !== homeBanner}
              >
                <div className="destination-atmosphere" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
                <div className="destination-copy">
                  <span>{destination.kicker}</span>
                  <h1>{destination.title}<em>{destination.accent}</em></h1>
                  <p>{destination.copy}</p>
                  <small>{destination.meta}</small>
                  <button className="destination-enter" onClick={() => openHomeDestination(destination)} tabIndex={index === homeBanner ? 0 : -1}>
                    <Play fill="currentColor" />{destination.action}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button className="destination-arrow previous" disabled={homeBanner === 0} onClick={() => shiftHomeBanner(-1)} aria-label="Previous destination"><ChevronLeft /></button>
          <button className="destination-arrow next" disabled={homeBanner === homeDestinations.length - 1} onClick={() => shiftHomeBanner(1)} aria-label="Next destination"><ChevronRight /></button>
          <button className={`home-cache-ticket ${dailyClaimed ? "claimed" : ""}`} disabled={dailyClaimed} onClick={claimDaily}>
            {dailyClaimed ? <Check /> : <Gift />}
            <span><small>{dailyClaimed ? "CACHE OPENED" : "FREE AETHER CACHE"}</small><strong>{dailyClaimed ? "Return tomorrow" : "3 Gems + 1,200 Gold"}</strong></span>
          </button>
          <div className="destination-dots" aria-label="Choose a destination">
            {homeDestinations.map((destination, index) => <button key={destination.id} className={index === homeBanner ? "active" : ""} onClick={() => { setHomeDragX(0); setHomeBanner(index); }} aria-label={destination.title + " " + destination.accent} />)}
          </div>
        </section>
      </>
    );
  };

  const renderQuests = () => (
    <>
      <AppHeader save={save} title="Quest Map" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className={`map-banner ${isSunpetalChapter ? "map-banner-sunpetal" : ""}`}>
        <span>{isSunpetalChapter ? "CHAPTER 1 · A CHEERFUL BEGINNING" : "STORY CAMPAIGN"}</span>
        <h1>{isSunpetalChapter ? "Sunpetal Vale" : "The Shattered Crown"}</h1>
        <p>{isSunpetalChapter
          ? "Your adventure begins among warm meadows, crystal streams and playful Woblets."
          : "Three regions, fifteen stages and a choice that will reshape the Aether."}</p>
        <div className="chapter-progress"><span style={{ width: `${Math.min(100, save.completed.length / 15 * 100)}%` }} /></div>
        <small>{Math.min(save.completed.length, 15)} / 15 stages cleared · {save.unlockedStage <= 4 ? "Sunpetal Vale" : save.unlockedStage <= 10 ? "The Glass Sea" : "Crownless Night"}</small>
      </section>
      <section className={`quest-path ${isSunpetalChapter ? "quest-path-sunpetal" : ""}`}>
        {QUESTS.map((quest, index) => {
          const locked = quest.id > save.unlockedStage;
          const cleared = save.completed.includes(quest.id);
          return (
            <article key={quest.id} className={`quest-node quest-chapter-${quest.chapter} ${locked ? "locked" : ""} ${cleared ? "cleared" : ""}`}>
              {[1, 5, 11].includes(quest.id) && <span className="region-ribbon">REGION {quest.chapter} · {quest.region}</span>}
              {index < QUESTS.length - 1 && <span className="path-line" />}
              <button className="node-orb" disabled={locked} onClick={() => openStory(quest.id)}>
                {locked ? <Lock /> : cleared ? <Check /> : <span>{quest.id}</span>}
              </button>
              <div className="quest-card">
                <div>
                  <small>STAGE {quest.chapter}-{quest.chapter === 1 ? quest.id : quest.chapter === 2 ? quest.id - 4 : quest.id - 10}</small>
                  <h2>{quest.name}</h2>
                  <p>{quest.location}</p>
                </div>
                <div className="quest-intel"><span>{quest.waves.length} WAVES</span><span>REC. POWER {quest.recommended}</span></div>
                <div className="quest-meta">
                  <ElementBadge element={quest.element} compact />
                  <span><Zap size={12} />{quest.energy}</span>
                  <span><Coins size={12} />{quest.reward}</span>
                </div>
                {!locked && <button className="quest-enter" onClick={() => openStory(quest.id)}>{cleared ? "Replay" : "Enter"}<ChevronRight size={15} /></button>}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );

  const renderStory = () => {
    const quest = QUESTS.find((item) => item.id === storyQuestId)!;
    const line = quest.intro[storyStep];
    const isLast = storyStep >= quest.intro.length - 1;
    return (
      <div className={`story-screen story-chapter-${quest.chapter}`}>
        <button className="story-back" onClick={() => go("quests")}><ChevronLeft /> Quest map</button>
        <div className={`story-sky ${quest.chapter === 1 ? "story-sky-sunpetal" : ""}`}><img src={quest.stage} alt="" /><span className="story-moon" /><span className="citadel" /></div>
        <UnitPortrait unit={line.speaker === "Kael" ? getUnit("kael") : line.speaker === "Lyra" ? getUnit("lyra") : line.speaker === "Brannock" ? getUnit("brannock") : getUnit("solenne")} className="story-unit" />
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
    const activeBurstFxs = attackFxs.filter((fx) => fx.phase === "burst");
    const activeBurstFx = activeBurstFxs[activeBurstFxs.length - 1];
    const activeBurstUnit = activeBurstFx ? getUnit(activeBurstFx.unitId) : null;
    const burstIntroFxs = attackFxs.filter((fx) => fx.phase === "burst-intro");
    const burstIntroFx = burstIntroFxs[burstIntroFxs.length - 1];
    const burstIntroUnit = burstIntroFx ? getUnit(burstIntroFx.unitId) : null;
    const kaelBurstScreenFx = attackFxs.find((fx) => fx.unitId === "kael" && (fx.phase === "burst-intro" || fx.phase === "burst"));
    const actionLocked = autoTurnActive || enemyTurnLock.current || battleFlowLock.current || combatFx.phase === "enemy" || combatFx.phase === "opening" || combatFx.phase === "wave";
    return (
      <div
        className={`battle-screen battle-${targetedEnemy.element} battle-speed-${battleSpeed} fx-${combatFx.phase} ${activeBurstUnit ? `burst-unit-${activeBurstUnit.id}` : ""}`}
        style={{ "--battle-time-scale": getBattleTimeScale(battleSpeed) } as CSSProperties}
      >
        <header className="battle-header">
          <button onClick={() => { setBattle(null); battleRef.current = null; go(battle.mode === "story" ? "quests" : "modes"); }}><ChevronLeft /></button>
          <div><small>{quest.name}</small><strong>WAVE {battle.wave + 1}/{quest.waves.length}</strong></div>
          <div className="battle-header-actions"><span>TURN {battle.turn}</span><button onClick={() => setBattleSpeed((speed) => speed === 1 ? 2 : 1)}>{battleSpeed}×</button></div>
        </header>
        <div
          className={`battlefield impact-beat-${screenImpact % 2} ${gameSettings.screenShake ? "" : "no-screen-shake"} ${attackFxs.some((fx) => fx.stage === "hitstop") ? "hit-stop-active" : ""} ${impactPower >= 2.1 ? "heavy-impact" : ""} ${livingEnemies.length ? "" : "enemy-defeated"}`}
          style={{ "--impact-power": impactPower } as CSSProperties}
        >
          <AnimatedBattleStage stageId={stageId} stageSrc={battleStageSrc} />
          <img className={`stage-background stage-poster ${stageId === "field" ? "stage-poster-sunpetal" : ""}`} src={battleStageSrc} alt={`${quest.location} battle stage`} draggable={false} style={stageId === "field" ? { objectPosition: "center 25%" } : undefined} />
          <div className={`stage-atmosphere ${stageId === "field" ? "stage-atmosphere-sunpetal" : ""}`} />
          {kaelBurstScreenFx && (
            <video
              key={`kael-battlefield-source-${kaelBurstScreenFx.id}`}
              className="kael-burst-fullscreen-source"
              src="/effects/bursts/kael/fullscreen-embers.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              ref={(video) => { if (video) video.playbackRate = getBattlePlaybackRate(battleSpeed); }}
              aria-hidden="true"
            />
          )}
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
              const solenneBeamFx = attackFxs.find((fx) => (
                fx.unitId === "solenne"
                && fx.phase === "attack"
                && fx.targetEnemyId === member.instanceId
                && showsSolenneBeam(fx.stage)
              ));
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
                  {solenneBeamFx && (
                    <span
                      key={`${solenneBeamFx.id}-beam-${solenneBeamFx.volley}`}
                      className={`solenne-judgement-beam solenne-beam-stage-${solenneBeamFx.stage}`}
                      aria-hidden="true"
                    ><i /><b /><em /></span>
                  )}
                  <span className="enemy-stagger-rig" key={staggerFx?.id ?? `${member.instanceId}-rest`}>
                    <span className="enemy-aura" />
                    <img className="enemy-sprite" src={enemy.sprite} alt="" draggable={false} />
                  </span>
                  {staggerFx && <span className="enemy-contact-pin" key={`contact-${staggerFx.id}`} aria-hidden="true" />}
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
              const arrowTravelX = (attackFx?.contactX ?? 0) - rangedAdvanceX - 18;
              const arrowTravelY = (attackFx?.contactY ?? 0) - rangedAdvanceY;
              const arrowAngle = Math.atan2(arrowTravelY, arrowTravelX) * 180 / Math.PI - 180;
              const showProjectile = Boolean(
                attackFx
                && attackFx.phase === "attack"
                && unit.id === "zephyra"
                && showsZephyraProjectile(attackFx.stage),
              );
              const showBowLightning = Boolean(
                attackFx
                && attackFx.phase === "attack"
                && unit.id === "zephyra"
                && showsZephyraBowLightning(attackFx.stage),
              );
              return (
                <div
                  key={`${unit.id}-${index}`}
                  className={`field-unit field-slot-${index + 1} unit-${unit.id} ${RANGED_NORMAL_UNITS.has(unit.id) ? "ranged-normal" : "melee-normal"} ${member.acted ? "acted" : ""} ${member.guarding ? "guarded" : ""} ${member.hp <= 0 ? "fallen" : ""} ${isActive ? "active" : ""} ${attackFx?.phase === "burst" ? "bursting" : ""} attack-stage-${attackFx?.stage ?? "idle"} attack-beat-${(attackFx?.frame ?? 0) % 4} volley-${attackFx?.volley ?? 0} ${isTarget ? "targeted" : ""}`}
                  style={{
                    "--combo-duration": `${Math.max(620, (attackFx?.hits ?? getNormalAttackChain(unit, stars).length) * 165)}ms`,
                    "--contact-x": `${attackFx?.contactX ?? 0}px`,
                    "--contact-y": `${attackFx?.contactY ?? 0}px`,
                    "--ranged-x": `${rangedAdvanceX}px`,
                    "--ranged-y": `${rangedAdvanceY}px`,
                    "--arrow-travel-x": `${arrowTravelX}px`,
                    "--arrow-travel-y": `${arrowTravelY}px`,
                    "--arrow-angle": `${arrowAngle}deg`,
                  } as CSSProperties}
                >
                  <span className="field-unit-shadow" />
                  <BattleUnitSprite
                    unit={unit}
                    stars={stars}
                    mode={spriteMode}
                    attackFrame={(attackFx?.frame ?? 0) % Math.max(1, attackFx?.phase === "burst" ? unit.sprites.burst.length : unit.sprites.attack.length)}
                  />
                  {showBowLightning && attackFx && (
                    <span
                      key={`${attackFx.id}-storm-${attackFx.volley}`}
                      className={`zephyra-bow-lightning lightning-stage-${attackFx.stage}`}
                      aria-hidden="true"
                    >{Array.from({ length: 3 }, (_, arc) => <i key={arc} />)}</span>
                  )}
                  {showProjectile && attackFx && (
                    <span
                      key={`${attackFx.id}-volley-${attackFx.volley}`}
                      className="zephyra-arrow-flight"
                      aria-hidden="true"
                    ><i /></span>
                  )}
                  <span className="field-unit-aura" />
                  {isTarget && combatFx.phase === "enemy" && <span className="target-damage">-{combatFx.damage.toLocaleString()}</span>}
                  {member.guarding && <span className="guard-sigil"><Shield /></span>}
                  {member.buffs.length > 0 && <span className="field-buffs">{member.buffs.slice(0, 2).join(" · ")}</span>}
                  {member.ailment && <span className="field-ailment">{member.ailment}</span>}
                </div>
              );
            })}
          </div>

          {/* The per-hit .attack-frame-transition streak was removed: a 190px
              near-white bar in screen blend mode sat across the contact point on
              every single hit, washing out the artwork it was meant to punctuate.
              Contact is now read from the enemy pin, stagger and elemental VFX. */}

          {/* Previously every burst rendered THREE independent, fully overlapping
              VFX systems at once: this CSS .burst-signature flourish (border/
              clip-path shapes), a from-scratch Canvas2D 88-particle draw loop
              inside BurstAnimationCanvas, and the Remotion composition below it.
              All three drew the same moment in different techniques, which is
              why bursts read as visual noise rather than one clear effect.
              Consolidated onto the Remotion layer, which now owns the full
              charge -> hits -> finisher arc procedurally per element (see
              ElementalBurstLayer and BurstFinisherFlourish in BattleVfx.tsx) and
              carries each unit's distinct silhouette that .burst-signature used
              to provide, without three renderers fighting for the same pixels. */}
          {activeBurstFxs.map((burstFx) => {
            const burstUnit = getUnit(burstFx.unitId);
            const finisher = burstFx.frame >= burstFx.hits - 1;
            const burstTargetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.instanceId === burstFx.targetEnemyId));
            const targetPosition = ENEMY_FORMATIONS[battle.enemies.length]?.[burstTargetIndex] ?? ENEMY_FORMATIONS[2][0];
            return (
              <Fragment key={`burst-${burstFx.id}`}>
                <BurstRemotionOverlay
                  instanceId={burstFx.id}
                  unitId={burstUnit.id}
                  hitCount={burstFx.hits}
                  speed={battleSpeed}
                  targetLeft={targetPosition.left}
                  targetBottom={targetPosition.bottom}
                  reducedEffects={gameSettings.reducedEffects}
                />
                {finisher && burstFx.stage !== "windup" && (
                  <span className="burst-finisher-mark" aria-hidden="true"><strong>FINAL</strong><small>{burstUnit.burstName}</small></span>
                )}
              </Fragment>
            );
          })}

          {damageFxs.filter((fx) => !fx.burst).map((fx) => {
            const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.instanceId === fx.targetEnemyId));
            const targetPosition = ENEMY_FORMATIONS[battle.enemies.length]?.[targetIndex] ?? ENEMY_FORMATIONS[2][0];
            return (
              <AttackImpactOverlay
                key={`attack-impact-${fx.id}`}
                instanceId={fx.id}
                unitId={fx.unitId}
                speed={battleSpeed}
                targetLeft={targetPosition.left}
                targetBottom={targetPosition.bottom}
                hitIndex={fx.hit}
                reducedEffects={gameSettings.reducedEffects}
                critical={fx.critical}
                spark={fx.spark}
              />
            );
          })}

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
            return <div
              className={`impact-stack concurrent-impact impact-count-${battle.enemies.length} impact-target-${targetIndex + 1} impact-${sourceUnit.element} impact-unit-${sourceUnit.id} burst-impact-frame-${fx.frame} ${fx.burst ? "burst-impact" : ""} ${fx.finisher ? "finisher-impact" : ""} ${fx.spark ? "spark-hit" : ""} ${fx.critical ? "critical-hit" : ""}`}
              key={fx.id}
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
            </div>;
          })}
          {damageFxs.some((fx) => fx.spark) && <div className="spark-counter" key={`spark-${battle.combo}-${screenImpact}`}><Sparkles /> SPARK!!</div>}
          {crystalFxs.map((fx) => {
            const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.instanceId === fx.targetEnemyId));
            const unitIndex = Math.max(0, battle.party.findIndex((member) => member.id === fx.unitId));
            return <span key={fx.id} className={`crystal-flight crystal-${fx.kind} crystal-from-${targetIndex + 1} crystal-to-${unitIndex + 1}`} aria-hidden="true"><Gem /></span>;
          })}
          <div className="enemy-status-rail">
            <ElementBadge element={targetedEnemy.element} compact />
            <div className="enemy-status-copy">
              <span><small>{focusedInstance ? "FOCUS" : "PRIORITY"}</small><strong>{targetedEnemy.name}</strong></span>
              <div className="enemy-status-hp" aria-label={`${targetedEnemy.name} health`}><i style={{ width: `${Math.max(0, statusInstance.hp / statusInstance.maxHp * 100)}%` }} /></div>
            </div>
            <em>{Math.max(0, statusInstance.hp).toLocaleString()} / {statusInstance.maxHp.toLocaleString()}</em>
            <button
              className={`field-auto-button ${autoTurnActive ? "running" : ""}`}
              onClick={() => void queueAutoTurn()}
              disabled={actionLocked || battle.party.every((member) => member.acted || member.hp <= 0)}
              aria-label={autoTurnActive ? "Auto turn in progress" : "Play every ready unit in sequence"}
            ><Play fill="currentColor" /><span>{autoTurnActive ? "RUN" : "AUTO"}</span></button>
          </div>
          {battle.telegraph && <div className={`boss-telegraph ${battle.telegraph.turns <= 1 ? "imminent" : ""}`}><Target /><span><small>BOSS ART CHARGING</small><strong>{battle.telegraph.label}</strong></span><em>{battle.telegraph.turns}</em></div>}
          {(combatFx.phase === "opening" || combatFx.phase === "wave") && <div className="wave-banner" key={combatFx.serial}><small>{quest.location}</small><strong>{combatFx.label}</strong><span>{battle.enemies.length} ENEMIES</span></div>}
          {combatFx.phase === "guarding" && <div className="guard-banner"><Shield /> GUARD</div>}
          <div className="battle-message">{battle.message}</div>
        </div>

        {burstIntroUnit && burstIntroFx && (
          <BurstIntroOverlay
            key={`burst-intro-${burstIntroFx.id}`}
            instanceId={burstIntroFx.id}
            unitId={burstIntroUnit.id}
            burstName={burstIntroFx.label}
            keyArtSrc={burstIntroUnit.keyArt}
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
                  <UnitPortrait unit={unit} stars={stars} />
                  <div className="battle-unit-data"><span className="battle-unit-name">{unit.name} <i>{stars}★</i></span><small>{isQueued ? "CHAIN ACTIVE" : member.guarding ? "GUARDING" : member.acted ? "ACTED" : canBurst ? "BURST READY" : unit.role.toUpperCase()}</small>
                    <div className="mini-hp"><span style={{ width: `${Math.max(0, member.hp / maxHp * 100)}%` }} /></div>
                    <div className="burst-bar"><span style={{ width: `${member.gauge}%` }} /></div>
                    <em>{member.hp.toLocaleString()} HP <b>{member.gauge}% BB</b></em>
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

  const renderUnits = () => (
    <>
      <AppHeader save={save} title="Unit Archive" onBack={() => selectedUnitId ? setSelectedUnitId("") : go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      {selectedUnitId ? (
        <section className={`unit-detail detail-${selectedUnit.element} viewing-form-${selectedFormStars}`}>
          <div className="detail-hero">
            <div className="detail-topline"><span>UNIT No. {String(UNITS.indexOf(selectedUnit) + 101).padStart(4, "0")}</span><Stars count={selectedFormStars} /></div>
            {selectedFormStars === 5
              ? <UnitKeyArt unit={selectedUnit} className="detail-portrait detail-key-art" />
              : <UnitPortrait unit={selectedUnit} stars={selectedFormStars} className="detail-portrait" />}
            <div className="detail-name"><ElementBadge element={selectedUnit.element} /><h1>{selectedUnit.name}</h1><p>{selectedUnit.formTitles[selectedFormStars]}</p></div>
            <div className="detail-rating"><Swords /><span>{Math.round((selectedUnit.hp + selectedUnit.atk * 2 + selectedUnit.def) / 100 * getFormMultiplier(selectedFormStars))} POWER</span><b>{selectedUnit.role.toUpperCase()}</b></div>
          </div>
          <div className="unit-sheet">
            <div className="evolution-track">
              {([3, 4, 5] as StarTier[]).map((stars) => <button key={stars} className={`${selectedFormStars === stars ? "active" : ""} ${(save.unitStars[selectedUnit.id] ?? 3) >= stars ? "unlocked" : "locked"}`} onClick={() => setSelectedFormStars(stars)}><UnitPortrait unit={selectedUnit} stars={stars} /><span><Stars count={stars} /><strong>{selectedUnit.formTitles[stars]}</strong><small>{(save.unitStars[selectedUnit.id] ?? 3) === stars ? "CURRENT FORM" : (save.unitStars[selectedUnit.id] ?? 3) > stars ? "ARCHIVED" : "ASCENSION PREVIEW"}</small></span></button>)}
            </div>
            <div className="level-row"><span>Lv. <strong>{save.unitLevels[selectedUnit.id] ?? 1}</strong>/{getMaxLevel(save.unitStars[selectedUnit.id] ?? 3)}</span><span className="nature">{selectedUnit.nature} Nature · {save.unitStars[selectedUnit.id] ?? 3}★</span></div>
            <div className="stat-grid">
              <div><Heart /><span>HP</span><strong>{getFormStat(selectedUnit, selectedFormStars, save.unitLevels[selectedUnit.id] ?? 1, "hp").toLocaleString()}</strong></div>
              <div><Swords /><span>ATK</span><strong>{getFormStat(selectedUnit, selectedFormStars, save.unitLevels[selectedUnit.id] ?? 1, "atk").toLocaleString()}</strong></div>
              <div><Shield /><span>DEF</span><strong>{getFormStat(selectedUnit, selectedFormStars, save.unitLevels[selectedUnit.id] ?? 1, "def").toLocaleString()}</strong></div>
              <div><Sparkles /><span>REC</span><strong>{getFormStat(selectedUnit, selectedFormStars, save.unitLevels[selectedUnit.id] ?? 1, "rec").toLocaleString()}</strong></div>
            </div>
            <div className="skill-panel leader-skill"><small><Crown /> LEADER ART</small><strong>{selectedUnit.leader.split(" — ")[0]}</strong><p>{selectedUnit.leader.split(" — ")[1]}</p></div>
            <div className="skill-panel burst-skill"><small><Sparkles /> AETHER BURST · Lv. {save.burstLevels[selectedUnit.id] ?? 1}</small><strong>{selectedUnit.burstName}</strong><p>{selectedUnit.burst}</p></div>
            {selectedFormStars >= 4 && <div className="skill-panel ascendant-skill"><small><Zap /> ASCENDANT BURST</small><strong>{selectedUnit.burstName} · Zenith</strong><p>Enhanced hit timing, a wider Spark window and an elemental squad boon.</p></div>}
            {selectedFormStars === 5 && <div className="skill-panel crown-skill"><small><Crown /> CROWN ART</small><strong>{selectedUnit.formTitles[5]} Awakening</strong><p>A once-per-quest finisher unlocked when the Burst gauge overflows.</p></div>}
            {(save.unitStars[selectedUnit.id] ?? 3) === 5 ? <div className="motion-preview"><small>5★ BATTLE MOTION SET · {getNormalAttackChain(selectedUnit, 5).length}-HIT NORMAL CHAIN · {selectedUnit.id === "zephyra" ? `${selectedUnit.sprites.attack.length}-FRAME BOW SEQUENCE` : selectedUnit.id === "solenne" ? `${selectedUnit.sprites.attack.length}-FRAME STAFF INVOCATION` : `${getNormalAttackChain(selectedUnit, 5).filter((beat, index, chain) => index === 0 || beat.pose !== chain[index - 1].pose).length} STRIKE POSES`}</small><div>{[
              ["Idle A", selectedUnit.sprites.idleA],
              ["Idle B", selectedUnit.sprites.idleB],
              ...(selectedUnit.id === "zephyra" || selectedUnit.id === "solenne"
                ? selectedUnit.sprites.attack.map((src, index) => [selectedUnit.id === "zephyra" ? `Bow ${index + 1}` : `Invocation ${index + 1}`, src])
                : getNormalAttackChain(selectedUnit, 5)
                  .filter((beat, index, chain) => index === 0 || beat.pose !== chain[index - 1].pose)
                  .map((beat, index) => [`Strike ${index + 1}`, selectedUnit.sprites.attack[beat.frame]])),
              ...selectedUnit.sprites.burst.map((src, index) => [`Burst ${index + 1}`, src]),
            ].map(([label, src]) => <span key={label}><img src={src} alt={`${selectedUnit.name} ${label}`} /><em>{label}</em></span>)}</div></div> : <div className="motion-preview compact-form-motion"><small>{save.unitStars[selectedUnit.id] ?? 3}★ BATTLE MODEL · IDLE / DASH / 4-HIT CHAIN / BURST</small><div>{["Idle A", "Idle B", "Hit 1", "Hit 2", "Hit 3", "Hit 4", "Burst"].map((label) => <span key={label}><img src={getFormPortrait(selectedUnit, save.unitStars[selectedUnit.id] ?? 3)} alt={`${selectedUnit.name} ${label}`} /><em>{label}</em></span>)}</div></div>}
            <div className="sphere-slot"><div><Gem /><span><small>EQUIPPED RELIC</small><strong>{save.equippedRelics[selectedUnit.id] ?? "No relic equipped"}</strong></span></div><em>{save.equippedRelics[selectedUnit.id] ? "BONUS ACTIVE" : "OPEN SLOT"}</em></div>
            <div className="infusion-cost"><span><Gem /> Aether Shards <strong>{save.materials.aether}</strong></span><span><ArrowUp /> Ascension Seals <strong>{save.materials.seal}</strong></span></div>
            <div className="detail-actions"><button onClick={() => trainUnit(selectedUnit.id)}><Plus />Aether Infusion <span>{420 + (save.unitLevels[selectedUnit.id] ?? 1) * 12} <Coins size={13} /></span></button><button onClick={() => ascendUnit(selectedUnit.id)} disabled={(save.unitStars[selectedUnit.id] ?? 3) >= 5}><ArrowUp />Ascend</button></div>
          </div>
        </section>
      ) : (
        <section className="archive-list">
          <div className="archive-summary"><span><strong>{ownedUnits.length}</strong> / {UNITS.length}<small>DISCOVERED</small></span><span><strong>{save.party.length}</strong> / 5<small>IN SQUAD</small></span><button onClick={() => setUnitSort((current) => current === "rarity" ? "level" : "rarity")}><Target />{unitSort === "rarity" ? "Rarity" : "Level"}</button><button onClick={() => go("squad")}><Users />Squads</button></div>
          <div className="unit-filters" role="group" aria-label="Filter units by element">
            {ELEMENT_FILTERS.map((filter) => {
              const Icon = filter === "all" ? Users : ELEMENTS[filter].Icon;
              return <button key={filter} className={unitFilter === filter ? "active" : ""} onClick={() => setUnitFilter(filter)} aria-pressed={unitFilter === filter}><Icon />{filter === "all" ? "All" : ELEMENTS[filter].label}</button>;
            })}
          </div>
          <div className="unit-grid">
            {filteredUnits.map((unit) => {
              const owned = save.owned.includes(unit.id);
              return (
                <button key={unit.id} className={`archive-unit ${owned ? "" : "unowned"}`} disabled={!owned} onClick={() => { setSelectedUnitId(unit.id); setSelectedFormStars(save.unitStars[unit.id] ?? 3); }}>
                  <UnitPortrait unit={unit} stars={save.unitStars[unit.id] ?? 3} />
                  <ElementBadge element={unit.element} compact />
                  <span className="archive-stars"><Stars count={save.unitStars[unit.id] ?? 3} /></span>
                  <strong>{owned ? unit.name : "Unknown"}</strong>
                  <small>{owned ? `Lv.${save.unitLevels[unit.id] ?? 1} · ${unit.role}` : "Summon to discover"}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </>
  );

  const renderSummon = () => (
    <>
      <AppHeader save={save} title="Aether Gate" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="summon-stage">
        <span className="summon-kicker">FEATURED GATE · FIRST LIGHT</span>
        <h1>Call beyond<br />the <em>Veil</em></h1>
        <p>Every summon reveals an original hero. Undiscovered units are guaranteed while the archive has space.</p>
        <div className="summon-resonance"><div><span>5★ RESONANCE PITY</span><strong>{save.summonPity}/10</strong></div><i><b style={{ width: `${Math.min(100, save.summonPity * 10)}%` }} /></i><small>The tenth Aether call is guaranteed to awaken at 5★</small></div>
        <div className="summon-portal"><span className="portal-ring ring-one" /><span className="portal-ring ring-two" /><span className="portal-core" /><div className="summon-motes" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div><Gem size={54} /></div>
        <div className="featured-row">
          {[getUnit("nyx"), getUnit("zephyra"), getUnit("solenne")].map((unit) => <UnitPortrait key={unit.id} unit={unit} stars={5} />)}
        </div>
        <div className="summon-actions"><button className="summon-button" onClick={() => summon("aether")}><Sparkles />AETHER CALL<span>5 <Gem size={15} /></span></button><button className="summon-button covenant-button" onClick={() => summon("covenant")}><Users />COVENANT CALL<span>200 <Sparkles size={15} /></span></button></div>
        <small className="rates">5★ 8% · 4★ 42% · 3★ 50% · No purchases in this prototype</small>
        <div className="summon-history"><div><small>COVENANT POINTS</small><strong>{save.covenantPoints.toLocaleString()}</strong></div><div><small>RECENT CALLS</small><p>{save.summonHistory.length ? save.summonHistory.slice(0, 3).join(" · ") : "No calls recorded yet"}</p></div></div>
      </section>
      {summonResult && (
        <div className="result-overlay summon-result" onClick={() => setSummonResult(null)}>
          <div className={`summoned-card ${summonResult.unit.element} rarity-${summonResult.stars}`} onClick={(event) => event.stopPropagation()}>
            <small>{summonResult.duplicate ? "ECHO CONVERTED · +8 SHARDS" : "THE AETHER ANSWERS"}</small><Stars count={summonResult.stars} />
            <UnitPortrait unit={summonResult.unit} stars={summonResult.stars} />
            <ElementBadge element={summonResult.unit.element} />
            <h2>{summonResult.unit.name}</h2><p>{summonResult.unit.formTitles[summonResult.stars]}</p>
            <button onClick={() => { setSummonResult(null); setSelectedUnitId(summonResult.unit.id); setSelectedFormStars(summonResult.stars); go("units"); }}>View evolution path</button>
          </div>
        </div>
      )}
    </>
  );

  const renderTown = () => (
    <>
      <AppHeader save={save} title="Hearthvale" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="town-skyline"><span className="town-sun" /><div className="tower tower-a" /><div className="tower tower-b" /><div className="tower tower-c" /><div><small>YOUR RESTORED HAVEN</small><h1>Build hope from ruin</h1></div></section>
      <section className="town-resource-nodes">
        {[{ key: "ore", name: "Shard Mine", Icon: Hammer }, { key: "herbs", name: "Remedy Grove", Icon: Leaf }, { key: "water", name: "Aether River", Icon: Droplets }, { key: "timber", name: "Warden Farm", Icon: Castle }].map(({ key, name, Icon }) => <button key={key} onClick={gatherTown} className={save.lastTownGather === todayKey() ? "gathered" : ""}><Icon /><span><small>{name}</small><strong>{save.townResources[key]}</strong></span>{save.lastTownGather === todayKey() ? <Check /> : <Plus />}</button>)}
      </section>
      <section className="town-status"><span><Hammer /><small>FORGE</small><strong>Tier {save.forgeLevel}</strong></span><span><Droplets /><small>WELL</small><strong>+{save.wellLevel * 5}%</strong></span><span><Leaf /><small>GROVE</small><strong>{save.potions} ready</strong></span></section>
      <section className="town-list">
        <article><div className="facility-icon forge"><Hammer /></div><div><small>LEVEL {save.forgeLevel}</small><h2>Relic Forge</h2><p>Craft and refine Relics and Sigils.</p></div><button onClick={() => upgradeTown("forgeLevel", 1500)}>Upgrade<span>1,500 <Coins size={12} /></span></button></article>
        <article><div className="facility-icon well"><Droplets /></div><div><small>LEVEL {save.wellLevel}</small><h2>Aether Well</h2><p>Improves energy recovery.</p></div><button onClick={() => upgradeTown("wellLevel", 2200)}>Upgrade<span>2,200 <Coins size={12} /></span></button></article>
        <article><div className="facility-icon grove"><Leaf /></div><div><small>LEVEL {save.groveLevel}</small><h2>Remedy Grove</h2><p>Brews stronger quest items.</p></div><button onClick={() => upgradeTown("groveLevel", 1100)}>Upgrade<span>1,100 <Coins size={12} /></span></button></article>
      </section>
      <section className="craft-card"><div><FlaskConical /><span><small>QUICK CRAFT</small><strong>Restorative Potion</strong></span></div><p>Restore 35% HP to the full squad.</p><button onClick={() => {
        if (save.gold < 300) return setToast("Not enough gold");
        setSave((current) => ({ ...current, gold: current.gold - 300, potions: current.potions + 1 }));
        setToast("Potion crafted");
      }}>Craft 1 <span>300 <Coins size={12} /></span></button></section>
      <section className="craft-card relic-craft"><div><Hammer /><span><small>RECIPE · STORY DISCOVERY</small><strong>Forge an awakened Relic</strong></span></div><p>10 Ore · 6 Timber · 5 Relic Dust. Crafted gear can be equipped from the Warden Vault.</p><button onClick={craftRelic}>Forge Relic <span>{save.materials.relicDust} dust</span></button></section>
      <section className="town-services">
        <article className="npc-dialogue"><span className="npc-avatar">M</span><div><small>MIRA · SHARDKEEPER</small><p>“The forge sings differently after every Crown Shard. New recipes appear as the story advances.”</p></div></article>
        <article className="jukebox"><Volume2 /><div><small>SHARED MENU THEME</small><strong>{MUSIC_TRACKS["title-theme"].title}</strong><p>The same theme continues through every menu; only the Caravan Shop changes it.</p></div></article>
        <article className="event-bazaar"><Gift /><div><small>RIFT TOKEN BAZAAR</small><strong>{save.eventTokens} tokens</strong><p>Exchange 80 tokens for 2 Ascension Seals.</p></div><button onClick={() => { if (save.eventTokens < 80) return setToast("You need 80 Rift Tokens"); setSave((current) => ({ ...current, eventTokens: current.eventTokens - 80, materials: { ...current.materials, seal: current.materials.seal + 2 } })); setToast("2 Ascension Seals acquired"); }}>Exchange</button></article>
      </section>
    </>
  );

  const renderSquad = () => {
    const active = save.squads[save.activeSquad] ?? save.party;
    const usedCapacity = getSquadCost(active, save.unitStars);
    return <>
      <AppHeader save={save} title="Squad Hall" onBack={() => go("units")} soundOn={soundOn} onSoundToggle={toggleSound} />
      <section className="squad-banner"><Users /><div><small>WARDEN FORMATIONS</small><h1>Build the chain</h1><p>Arrange five Eidolons, choose a Commander Art and stay within Warden Capacity.</p></div></section>
      <section className="squad-tabs">{save.squads.map((squad, index) => <button key={index} className={save.activeSquad === index ? "active" : ""} onClick={() => selectSquad(index)}><small>FORMATION {index + 1}</small><strong>{squad.length}/5</strong></button>)}</section>
      <section className="capacity-panel"><div><span>WARDEN CAPACITY</span><strong>{usedCapacity} / {save.wardenCapacity}</strong></div><i><b style={{ width: `${Math.min(100, usedCapacity / save.wardenCapacity * 100)}%` }} /></i></section>
      <section className="formation-board">
        {Array.from({ length: 5 }, (_, index) => {
          const id = active[index];
          const unit = id ? getUnit(id) : null;
          return <div key={index} className={`formation-slot ${unit ? "filled" : "empty"}`}>
            <span className="formation-order">{index === 0 ? <Crown /> : index + 1}</span>
            {unit ? <><UnitPortrait unit={unit} stars={save.unitStars[id] ?? 3} /><strong>{unit.name}</strong><small>{save.unitStars[id] ?? 3}★ · COST {Math.max(12, unit.cost - (5 - (save.unitStars[id] ?? 3)) * 4)}</small></> : <><Plus /><strong>Open slot</strong><small>Tap a unit below</small></>}
          </div>;
        })}
      </section>
      {active[0] && <section className="commander-panel"><Crown /><div><small>COMMANDER ART · {getUnit(active[0]).name}</small><strong>{getUnit(active[0]).leader.split(" — ")[0]}</strong><p>{getUnit(active[0]).leader.split(" — ")[1]}</p></div></section>}
      <section className="squad-roster"><div className="section-heading"><div><small>OWNED EIDOLONS</small><h2>Tap to add or remove</h2></div><span>{active.length}/5 selected</span></div><div>{ownedUnits.map((unit) => {
        const selected = active.includes(unit.id);
        return <button key={unit.id} className={selected ? "selected" : ""} onClick={() => toggleSquadUnit(unit.id)}><UnitPortrait unit={unit} stars={save.unitStars[unit.id] ?? 3} /><span><Stars count={save.unitStars[unit.id] ?? 3} /><strong>{unit.name}</strong><small>Lv.{save.unitLevels[unit.id] ?? 1} · {unit.role}</small></span>{selected ? <Check /> : <Plus />}</button>;
      })}</div></section>
    </>;
  };

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
      <section className="arena-hero"><Trophy /><small>BRONZE VANGUARD</small><h1>{save.arenaRank} AP</h1><p>Win duels to rise through the weekly ranks.</p><div className="arena-ladder"><div><span>Silver promotion</span><strong>{Math.max(0, 150 - save.arenaRank)} AP to go</strong></div><i><b style={{ width: `${Math.min(100, save.arenaRank / 1.5)}%` }} /></i></div><div className="orb-row">{[0,1,2].map((orb) => <span key={orb} className={orb < save.arenaOrbs ? "full" : ""}><Zap /></span>)}</div></section>
      <section className="opponent-card"><div className="opponent-top"><span className="rank-medallion"><Crown /></span><div><small>CHALLENGER</small><strong>Riftwalker Elian</strong><p>Squad power 112</p></div><span className="opponent-rank">#8,241</span></div><div className="mini-opponent-squad">{["nyx","brannock","lyra","zephyra","kael"].map((id) => <UnitPortrait key={id} unit={getUnit(id)} />)}</div><button className="primary-cta" onClick={quickArena}><Swords />Quick duel</button></section>
      <section className="arena-reward"><Gift /><div><small>NEXT RANK REWARD</small><strong>Silver Sigil Sphere</strong></div><span>150 AP</span></section>
    </>
  );

  const renderMissions = () => {
    const missions = [
      { label: "Clear any story quest", progress: save.completed.length > 0, value: save.completed.length > 0 ? 100 : 25, reward: "500 Gold" },
      { label: "Train a unit", progress: Object.values(save.unitLevels).some((level) => level >= 25), value: Math.min(100, Math.max(...Object.values(save.unitLevels)) * 4), reward: "1 Gem" },
      { label: "Fight in the Astral Arena", progress: save.arenaOrbs < 3, value: save.arenaOrbs < 3 ? 100 : 40, reward: "1 Potion" },
    ];
    return <><AppHeader save={save} title="Warden’s Ledger" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} /><section className="ledger-banner"><ScrollText /><div><small>DAILY / WEEKLY ORDERS</small><h1>Every path gives progress</h1><p>Daily orders refresh at dawn; weekly feats reward long-term play.</p></div></section><section className="mission-list">{missions.map((mission, index) => <article key={mission.label}><span className={mission.progress ? "done" : ""}>{mission.progress ? <Check /> : index + 1}</span><div className="mission-copy"><strong>{mission.label}</strong><small>{mission.progress ? "Complete" : "In progress"}</small><i><b style={{ width: `${mission.value}%` }} /></i></div><em>{mission.reward}</em></article>)}</section><section className="weekly-orders"><div className="section-heading"><div><small>WEEKLY FEATS</small><h2>Frontier cadence</h2></div><span>4d 11h</span></div>{[
      ["Clear 10 quest waves", Math.min(100, save.completed.length * 20), "5 Gems"],
      ["Reach 25 Aether Sparks", Math.min(100, save.shardHuntScore / 40), "3 Seals"],
      ["Climb 3 Tower floors", Math.min(100, (save.towerFloor - 1) / 3 * 100), "Silver Sigil"],
    ].map(([label, progress, reward]) => <article key={String(label)}><div><strong>{label}</strong><small>{reward}</small></div><i><b style={{ width: `${Number(progress)}%` }} /></i></article>)}</section><section className="achievement-shelf"><Trophy /><div><small>ACHIEVEMENTS & TITLES</small><strong>{save.achievements.length || 0} feats recorded</strong><p>{save.achievements.length ? save.achievements.join(" · ") : "Clear regional finales to earn permanent profile titles."}</p></div></section></>;
  };

  const renderShop = () => (
    <><AppHeader save={save} title="Caravan Shop" onBack={() => go("home")} soundOn={soundOn} onSoundToggle={toggleSound} /><section className="shop-banner"><PackageOpen /><div><small>NO REAL-MONEY PURCHASES</small><h1>Field Supplies</h1><p>Spend rewards earned through play.</p></div></section><section className="shop-list">
      {[{name:"Restorative Potion",desc:"Heal the full squad by 35%.",price:300,stock:"Fresh batch",icon:FlaskConical},{name:"Vortex Key",desc:"Unlock a rotating event trial.",price:1800,stock:"2 remaining",icon:Lock},{name:"Bronze Relic Shard",desc:"Material for the Relic Forge.",price:950,stock:"Forge stock",icon:Gem}].map((item) => { const Icon=item.icon; return <article key={item.name}><div className="shop-icon"><Icon /></div><div><small className="shop-stock">{item.stock}</small><strong>{item.name}</strong><p>{item.desc}</p></div><button onClick={() => { if(save.gold<item.price)return setToast("Not enough gold"); setSave(current=>({...current,gold:current.gold-item.price,potions:item.name.includes("Potion")?current.potions+1:current.potions})); setToast(`${item.name} purchased`); }}>{item.price.toLocaleString()}<Coins /></button></article>; })}
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
                    : screen === "town" ? renderTown()
                      : screen === "arena" ? renderArena()
                        : screen === "missions" ? renderMissions()
                          : renderShop();

  return (
    <main className="game-shell">
      <div className={`game-app screen-${screen} ${gameSettings.reducedEffects ? "reduced-effects" : ""}`} data-soundtrack={musicTrackKey} data-music-state={soundOn ? "playing" : "muted"}>
        {content}
        {!(["battle", "story"] as Screen[]).includes(screen) && <BottomNav screen={screen} go={go} save={save} />}
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
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
      <aside className="desktop-note"><Sparkles /><h2>Gates of Azura</h2><p>A portrait RPG designed for touch. Open this page on Android and choose <strong>Add to Home screen</strong> for the app experience.</p><span>ORIGINAL PLAYABLE PROTOTYPE</span></aside>
    </main>
  );
}
