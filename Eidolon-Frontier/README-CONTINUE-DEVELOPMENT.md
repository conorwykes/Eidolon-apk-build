# Eidolon Frontier / Gates of Azura — continuation guide

This archive is an export of the current saved Work project for **Gates of Azura** (`eidolon-frontier`), source version **44**, at commit **`d814761`** (`Correct Zephyra bow and add ranged spell attacks`).

All original tracked source files and assets were copied from that exact revision with their folder structure intact. No game code, artwork, animation, VFX, audio, data, or configuration was rewritten for this export. The project’s original `README.md` is also preserved unchanged; this continuation guide is the only explanatory file added to the snapshot.

## Requirements

- Node.js **22.13.0 or newer**
- npm (the exact dependency versions are locked in `package-lock.json`)
- On Linux, the supplied build/install scripts also use `bash`, `flock`, `curl`, `sha256sum`, and GNU `timeout`

## Run the game locally

From the extracted `Eidolon-Frontier` directory:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite. The current game is a client-rendered Vinext/React application; no database setup is required for the existing gameplay and save system.

Useful checks and tools:

```bash
npm run lint
npm test
npm run build
npm run validate:artifact
npm run remotion:studio
```

`npm test` builds the deployable application and runs the current rendered-game regression tests. `npm run remotion:studio` opens the editable Remotion compositions used by the battle VFX layer.

## Main entry points

| File or folder | What it controls |
| --- | --- |
| `app/page.tsx` | Main game entry point and current game implementation: unit/enemy/quest definitions, screens, battle state, damage, attack queues, story, progression, summoning, town, squad, inventory, modes, arena, missions, shop, audio control, and browser save/load. |
| `app/globals.css` | All game UI styling and most DOM/CSS animation work, including field movement, idle motion, damage text, Zephyra’s detached arrow/lightning, and Solenne’s beam/floor seal. |
| `app/layout.tsx` | Root HTML layout, metadata, fonts, PWA manifest, and top-level document setup. |
| `game/battle-timing.ts` | Battle-speed scaling and conversion of authored milliseconds to the selected 1×/2× battle speed. |
| `game/battle-choreography.ts` | Weapon/contact positions, hit angles, enemy recoil/stagger direction, and contact alignment for normal attacks and Bursts. |
| `app/components/BattleRemotion.tsx` | In-game React wrappers around the Remotion stage, normal-impact, Burst, and Kael cut-in compositions. |
| `remotion/BattleVfx.tsx` | Editable elemental Burst, impact, particle, sprite-strip, stage-motion, and Kael cut-in compositions. |
| `remotion/Root.tsx` / `remotion/index.ts` | Remotion composition registration and Studio entry point. |
| `public/` | Every runtime-served sprite, portrait, unit form, enemy, stage, destination, VFX image/video, font, icon, audio track, manifest, and service worker. |
| `package.json` / `package-lock.json` | Exact runtime/development dependencies and commands. |
| `vite.config.ts`, `next.config.ts`, `build/`, `scripts/`, `worker/` | Vinext/Vite/Cloudflare build, validation, Worker adapter, and deployment configuration. |
| `.openai/hosting.json` | Identity/configuration for the existing hosted Site. It is not required just to run locally. |
| `tests/rendered-html.test.mjs` | Current eight-part render, asset-reference, combat, and timing regression suite. |

## Where the game data lives

The present project intentionally keeps most editable game data in `app/page.tsx`:

- `UNITS`: all six unit definitions, stats, roles, Burst descriptions, scopes, art paths, sprite sequences, costs, and evolution/form titles.
- `NORMAL_ATTACK_CHAINS`: authored normal-hit frames and per-hit multipliers.
- `ENEMIES`: enemy stats, elements, sprites, bosses, and enemy skills.
- `LEGACY_QUESTS`, `EXPANDED_QUESTS`, and `QUESTS`: story text, regions, stages, energy costs, rewards, recommended power, waves, and enemy line-ups.
- `defaultSave` and `SaveState`: every progression/save field and starting value.
- `MUSIC_TRACKS`: audio paths, volume levels, and loop points.
- `ELEMENTS`: element labels, colours, and advantage relationships.
- `renderHome`, `renderQuests`, `renderStory`, `renderBattle`, `renderUnits`, `renderSummon`, `renderTown`, `renderSquad`, `renderInventory`, `renderModes`, `renderArena`, `renderMissions`, and `renderShop`: the current screens and their interactions.

The `db/`, `drizzle.config.ts`, `drizzle/`, and `examples/d1/` files preserve the project’s optional database scaffolding. The current game does not depend on D1 for its existing save/progression behaviour.

## Battle system and damage

The active battle flow is in `app/page.tsx`, principally:

- `beginBattle`: creates the opening wave and party state.
- `queueAttack`: runs normal attacks and Bursts, drives authored frame/stage changes, resolves Spark windows, calculates damage, applies ailments/buffs/healing, spawns damage/crystal effects, and advances the turn.
- `queueGuard`, `queueAutoTurn`, `runModernEnemyTurn`, and `advanceModernBattle`: guard, auto-play, enemy actions, wave transitions, defeat, and victory.
- `getFormStat`: level/star stat scaling.
- `getBattleTargets` and `getTopPriorityEnemy`: single/all-target selection and default target priority.

The current player-hit calculation inside `queueAttack` is based on:

```text
attackPower = scaled unit ATK for current star tier and level
normal totalBase = attackPower × 1.18
Burst totalBase = attackPower × (3.25 + Burst level × 0.08)

damage = round(
  totalBase
  × authored per-hit multiplier
  × element multiplier
  × random variance
  × critical multiplier
  × Spark multiplier
)
```

Current modifiers are:

- elemental advantage: **1.45×**
- elemental disadvantage: **0.78×**
- random variance: **0.93–1.07×**
- critical chance: **1/32**, critical damage: **1.5×**
- Spark damage: **1.25×**

Normal multi-hit units without a special authored chain split their total normal damage evenly. Bursts split Burst damage across their configured hit count.

## Zephyra’s current normal attack

The saved version in this archive includes the corrected bow artwork, progressive bow action, detached target-aligned arrow, and white-blue ricocheting lightning.

Edit these areas together:

- `app/page.tsx`
  - Zephyra entry in `UNITS`
  - Zephyra entry in `NORMAL_ATTACK_CHAINS`
  - `ZEPHYRA_VOLLEY_DRAW_SEQUENCE`
  - `ZEPHYRA_RANGED_ADVANCE`
  - `showsZephyraProjectile`
  - `showsZephyraBowLightning`
  - Zephyra branches inside `queueAttack`
  - arrow vector, lightning markup, and unit rendering inside `renderBattle`
- `app/globals.css`
  - `.field-unit.unit-zephyra...`
  - `.zephyra-arrow-flight...`
  - `.zephyra-bow-lightning...`
  - `@keyframes zephyraRangedApproach`, `zephyraRangedReturn`, `zephyraDetachedArrow`, `zephyraBowCharge`, `zephyraBowLeadArc`, and `zephyraBowRicochet`
- `public/sprites/units/zephyra-attack-1.webp` through `zephyra-attack-8.webp`
- `public/sprites/units/zephyra-idle-a.webp` and `zephyra-idle-b.webp`
- `game/battle-choreography.ts` for Zephyra’s contact path and enemy reaction

Her normal chain is **1.0×, 0.6×, 0.6× → 140 ms authored group pause → 1.0×, 0.6×, 0.6×**. Each three-number packet is driven by one progressive draw/lock/release/flight sequence.

Zephyra’s Burst sprites and effects are separate from her normal attack:

- `public/sprites/units/burst/zephyra-burst-*.webp`
- `public/effects/bursts/zephyra/`
- `public/effects/rpg-bursts/zephyra-*.webp`
- Zephyra presets/branches in `remotion/BattleVfx.tsx`

## Solenne’s current normal attack

The saved version in this archive includes her stationary two-handed staff invocation: raise/look up, overhead charge, staff slam, and target-centred beam with a circular floor seal.

Edit these areas together:

- `app/page.tsx`
  - Solenne entry in `UNITS`
  - Solenne entry in `NORMAL_ATTACK_CHAINS`
  - `SOLENNE_BEAM_CAST_SEQUENCE`
  - `showsSolenneBeam`
  - Solenne branches inside `queueAttack`
  - beam markup and target placement inside `renderBattle`
- `app/globals.css`
  - `.field-unit.unit-solenne...`
  - `.solenne-judgement-beam...`
  - `@keyframes solenneBeamEnvelope`, `solenneBeamRain`, `solenneBeamCore`, `solenneFloorSeal`, `solenneInnerSeal`, and `solenneImpactHalo`
- `public/sprites/units/solenne-attack-1.webp` through `solenne-attack-6.webp`
- `public/sprites/units/solenne-idle-a.webp` and `solenne-idle-b.webp`
- `game/battle-choreography.ts` for Solenne’s vertical contact path and enemy reaction

Her normal chain is **0.8×, 1.2× → 140 ms authored group pause → 0.8×, 1.2×**. Each pair belongs to one complete staff-raise/charge/slam/beam cycle.

Solenne’s Burst sprites and effects are separate from her normal attack:

- `public/sprites/units/burst/solenne-burst-*.webp`
- `public/effects/bursts/solenne/`
- `public/effects/rpg-bursts/solenne-*.webp`
- Solenne presets/branches in `remotion/BattleVfx.tsx`

## Assets

- `public/sprites/units/`: battle idle, normal-attack, and Burst frames.
- `public/units/`: archive portraits, PNG originals used by the game, evolution forms, and full key art.
- `public/sprites/enemies/` and `public/enemies/`: enemy artwork.
- `public/effects/bursts/`: four-phase authored elemental Burst imagery; Kael also has the full-screen ember video.
- `public/effects/rpg-bursts/`: processed animated-effect strips and their source note.
- `public/stages/`: battle backgrounds.
- `public/destinations/`: home/map destination art and medallions.
- `public/audio/`: the exact MP3 tracks used at runtime.
- `public/fonts/`, `public/icons/`, `public/manifest.webmanifest`, and `public/sw.js`: fonts, install icons, PWA metadata, asset caching, and offline behaviour.

Do not rename runtime assets without updating their string paths in `app/page.tsx`, `remotion/BattleVfx.tsx`, `public/sw.js`, and any relevant CSS.

## Save/progression system

The existing game saves locally in the browser. Its keys are:

- `eidolon-frontier-save-v1`: progression and roster state
- `eidolon-frontier-audio-v1`: sound on/off
- `gates-of-azura-settings-v1`: music/SFX/effects/accessibility settings

`SaveState`, `defaultSave`, the initial restore effect, and the save effects are all in `app/page.tsx`. Clearing site/browser storage resets local progress.

## Continuing in another ChatGPT conversation

Attach or select this ZIP, ask ChatGPT to extract it, and explicitly say to **edit the existing project in place without rebuilding or replacing its architecture**. The assistant should run `npm ci`, inspect this continuation guide plus `package.json`, and use the existing tests before changing gameplay. For animation work, provide the relevant sprite/VFX files and name the unit, attack type, hit cadence, and whether the change is normal-attack CSS/DOM animation or a Remotion Burst composition.

## What is intentionally not embedded

The export does not contain `.git/`, `node_modules/`, disposable `.sites-runtime/` data, or a locally generated `dist/` folder. Those are repository metadata, installed third-party packages, recovery-machine caches, and reproducible build output—not editable game source. All package versions needed to regenerate them are locked, and all project-authored source/assets required by the current game are included.

---

# v45 → v46 battle VFX pass

This revision reworks the four battle-feel areas below. No architecture was
replaced; the existing attack-stage pipeline, contact-lock rules and Remotion
layer all still drive combat. Two defects found during the pass are documented
first because they change gameplay numbers as well as visuals.

## Defects fixed

### 1. Screen shake was disabled

`app/globals.css` contained a contact-lock rule that set
`animation:none!important; transform:none!important` on
`.battlefield.impact-beat-0/1`. Because it appeared after the `microShakeA/B`
declarations, it overrode them completely — the **Screen shake** setting in the
options panel had no visible effect at all.

The intent behind the rule was correct (the *attacker* must not drift away from
its contact anchor), but it was applied one level too high. A translate on
`.battlefield` moves the attacker, the target and every effect layer by the
same vector, so contact alignment is mathematically unchanged. The camera is
now restored on the battlefield only, with burst contexts still excluded, and
the `no-screen-shake` class properly honoured.

### 2. Authored chains granted roughly 4× damage

`NORMAL_ATTACK_CHAINS` multipliers apply to the unit's **unsplit** normal
attack damage. Generic chains use `1 / hitCount`, so they sum to exactly `1.0`.
The two authored chains did not:

| Unit | Raw chain total | Effective normal damage |
| --- | --- | --- |
| Zephyra | 4.40 | ~4.4× every generic unit |
| Solenne | 4.00 | ~4.0× every generic unit |
| Kael / Lyra / Brannock / Nyx | 1.00 | baseline |

`getNormalAttackChain` now normalises any authored chain to `1.0`, preserving
its internal shape (which beat is light, which lands heavy) while removing the
free damage. This is gated by `NORMALISE_AUTHORED_CHAINS` in `app/page.tsx` —
set it to `false` to restore the previous behaviour.

**This is a balance change.** Zephyra and Solenne are meaningfully weaker on
normal attacks than they were in v45. If the 4× was intended as their identity,
turn the flag off and rebalance the melee chains upward instead.

## 1. Melee normal-attack choreography

Kael, Lyra, Brannock and Nyx previously shared one generic
approach/strike/return and read as the same character with different artwork.
Each now has an authored chain, a wind-up sequence, its own cadence and its own
contact effect.

| Unit | Chain shape | Cadence (tick / phrase) | Signature effect |
| --- | --- | --- | --- |
| Kael | 3 + 2, heavy committed downswing | 34 / 150 ms | ember arc through contact |
| Lyra | three linked pairs | 26 / 96 ms | tide ribbon between steps |
| Brannock | one 3-beat crush | 96 / 190 ms | floor dust ring, sprite compresses |
| Nyx | three flurries of three | 14 / 76 ms | blink afterimage |

New editable data in `app/page.tsx`: `NORMAL_ATTACK_CHAINS` (all six units),
`NORMAL_CADENCE`, `KAEL_LUNGE_SEQUENCE`, `LYRA_STEP_SEQUENCE`,
`BRANNOCK_HEAVE_SEQUENCE`, `NYX_BLINK_SEQUENCE`.
New CSS lives at the end of `app/globals.css` under
*Melee normal-attack choreography*, keyed on `.melee-normal` plus the existing
`attack-stage-*` classes.

## 2. Generalised cast sequences

`queueAttack` previously carried one hardcoded branch per authored unit
(`startsZephyraVolley`, `startsSolenneBeam`). Both are replaced by a single
table, `NORMAL_CAST_SEQUENCES`, so adding a unit needs only a sequence entry.
Zephyra's and Solenne's authored frames and holds are unchanged.

One correctness fix came with it: a wind-up now always resolves onto the beat's
real contact frame before damage lands. Previously a sequence ending on a
different frame than the beat would have resolved damage on a drawing the
player never saw. The ranged sequences already ended on their contact frame, so
only the new melee phrases are affected.

Cadence between beats is now per unit rather than a global 10 ms, which is what
made every authored chain read as the same rattle.

## 3. Hit feedback

- `--impact-power` is written per hit from the beat's own multiplier, scaled by
  Burst, finisher, critical, Spark and kill. It drives camera magnitude, so a
  heavy authored beat kicks harder for free.
- The camera kick rides a matching micro-zoom, because `.battlefield` clips its
  own overflow and a bare translate would expose the container edge.
- `heavy-impact` (power ≥ 2.1) adds a brief vignette punch.
- Damage numerals fan along a short deterministic arc instead of stacking on one
  point — a nine-hit Nyx phrase previously read as one flickering number.
- Sparks, criticals and Burst finishers now have distinct motion curves rather
  than only distinct colours. The finisher numeral is 34 px.
- Hitstop adds a contrast pinch on the stage so the freeze registers as impact
  rather than as a dropped frame.
- All additions honour `reduced-effects` and `prefers-reduced-motion`.

## 4. Burst cut-in for every unit

`KaelFireBurstIntro` was a fire-only composition, so Kael got a staged
full-screen awakening and the other five fell back to a flat CSS banner. The
composition is now palette-driven via `BURST_INTRO_STYLE` in
`remotion/BattleVfx.tsx` — same authored timing and layout, six elemental
readings, per-element awakening label.

- `BattleRemotion.tsx` exports `BurstIntroOverlay` (with `KaelBurstIntroOverlay`
  kept as an alias).
- `remotion/Root.tsx` registers `IntroKael` … `IntroNyx` so each is editable in
  `npm run remotion:studio`.
- The `.burst-cut-in` CSS banner path is no longer used by battle and can be
  removed once you are happy with the Remotion version.

Kael's extra full-screen ember video overlay is unchanged and still Kael-only.

## Verify

```bash
npm ci
npm run dev     # play a battle: check each unit's normal attack and Burst
npm test        # includes four new regression tests for this pass
npm run remotion:studio   # inspect IntroKael … IntroNyx
```

The service worker cache is bumped to `gates-of-azura-v29` so installed players
receive the new CSS instead of a stale cached copy.

These changes were authored without running the project's install or build
(no network was available in the editing environment). Syntax and assertion
checks pass, but run `npm test` and play a battle before trusting the pass.

---

# v46 → v47 burst and contact-overlay pass

## Removed: per-hit white swipe

`.attack-frame-transition` rendered a 190×58 px near-white bar
(`--attack-b:#eaffff`) in `mix-blend-mode:screen`, pinned to the weapon contact
point on **every** hit of every chain. On dense chains it strobed across the
target and washed out the artwork it was meant to punctuate. Removed from
`app/page.tsx` and `app/globals.css`. Contact now reads from the enemy contact
pin, the stagger profile and the elemental VFX, which were already doing the
work.

## Removed: Zephyra's lightning hexagon

Her `zephyra-bow-lightning` layer rendered six arcs at ring positions
(`-71°, 3°, 70°, 112°, 177°, 249°`) around her formation slot, which drew a
visible hexagon orbiting her and read as a UI element rather than as weapon
charge. Reduced to three arcs that run along the bow and string, so the storm
reads as energy she is holding. The core bowstring charge glow is unchanged.

## Burst progression

Brave Frontier's own frame data describes a unit action as five parts:
starting delay, movement, attack, buff application, return movement. The
existing composition had charge → hits → finisher, but every hit in the chain
used an identical envelope — which is why an 18-hit Nyx burst read as one flash
repeating rather than as a build.

Two additions in `remotion/BattleVfx.tsx`:

- **`hitRamp`** — each hit scales and brightens by its position in the chain
  (`0.78` → `1.4`), so the finisher arrives as the peak of a curve the player
  has been watching rise.
- **`accentHit`** — every fourth hit lands 1.24× harder, giving the chain
  internal rhythm instead of a flat ramp.
- **Launch streak** — a caster→target streak covering the "movement" phase.
  Previously the charge cut straight to the first contact with nothing crossing
  the gap.

Tune all three at the top of `BurstVfxComposition`. Per-element palettes remain
in `BURST_STYLE` and `RPG_BURST_PRESETS`.

Service worker cache bumped to `gates-of-azura-v30`.

---

# v47 → v48 procedural elemental burst layer

`ElementalBurstLayer` in `remotion/BattleVfx.tsx` adds authored per-element
motion on top of the existing sprite-strip presets. The presets supplied each
element's colour and stock shape, but all six shared one particle behaviour, so
a Grove burst moved exactly like a Void one.

| Element | Behaviour |
| --- | --- |
| flame | licks accelerate upward, shear sideways, thin as they rise |
| tide | ribbons orbit and spiral *inward* to the contact point |
| earth | shards thrown on ballistic arcs, pulled back by a gravity term |
| lightning | segmented bolts that strobe and re-roll their break points |
| radiance | fixed rays descending from above with a widening bloom |
| void | shards collapse inward — the deliberate inverse of earth |

Being procedural, it is resolution-independent and follows the real hit cadence
rather than a fixed-rate GIF. `hitIndex` seeds the randomiser, so every hit in a
chain throws a different pattern instead of replaying one canned spray, and the
finisher reuses the same generator at higher count and radius — a burst ends
with *more of what it already was* rather than an unrelated effect.

Tuning: `count`, `intensity` and `spread` at the top of the component.

Service worker cache bumped to `gates-of-azura-v31`.

---

# v48 → v49 raster/procedural weight rebalance

Investigated vectorizing the sprite-strip assets (`image_vectorize` via Adobe)
to sharpen the finisher effects. Ruled it out after inspecting the actual
files:

- Every strip is WebP; `image_vectorize` only accepts PNG/JPEG.
- Content is stippled particle texture, not flat shapes — tracing that
  produces heavy path soup, not a clean vector.
- The real constraint is source resolution: **every cell is 80×80px**, and
  Brannock's finisher alone scales to `5.1×` at runtime (~408px on screen from
  an 80px source). Vectorizing an 80px raster traces the blur that's already
  there; it can't invent detail that was never captured.

So the softness is structural, not a format problem, and no processing tool
fixes it. Instead, weight was shifted from the raster strips onto
`ElementalBurstLayer` (added in the previous pass), which draws procedurally at
stage resolution and stays sharp at any scale:

- Finisher `count` 16 → 26, `intensity` 1.55 → 1.85.
- Per-hit `intensity` now `hitRamp * 1.2` (was `hitRamp`).
- The upscaled charge and finisher glow rasters are dimmed (`0.34→0.26`,
  `0.44→0.3`) and the main finisher strip gets a light `blur(1.1px)` plus a
  30% opacity cut — softening it slightly hides raster stair-stepping far
  better than leaving it crisp-but-pixelated at 5×.

Net effect: the sharp, resolution-independent layer now carries more of what
the player's eye follows; the raster strips recede into a glow bed underneath
rather than being the crisp subject at a scale they were never drawn for.

If you later obtain higher-resolution source strips (larger than 80×80 per
cell), these opacity/blur values should be revisited — they are compensating
for a resolution limit that better source art would remove.

Service worker cache bumped to `gates-of-azura-v32`.

---

# v49 → v50 burst VFX consolidation + Zephyra bow-lightning fix

## Zephyra's bow lightning was at waist height, not on her bow

`.zephyra-bow-lightning`'s box had `top:2px`. Its internal elements (the charge
circle, the lead arc, the three ricochet arcs) sit ~50-68px down *inside* that
box, which put the visible effect roughly 45-55% down her sprite - waist
height, well below her raised bow hand. Changed to `top:-24px`, which shifts
the same internal geometry up to chest/hand height without touching the arc
shapes themselves.

## Three full VFX systems were rendering on every burst at once

Tracing the burst render path turned up three **independent, fully
overlapping** systems drawing the same moment simultaneously:

1. A CSS `.burst-signature` flourish - per-unit shapes built from borders,
   `clip-path`, and `repeating-conic-gradient` (flame pillars, water vortex,
   root eruption, lightning volley, aurora bloom, rift slashes + black sun).
2. `BurstAnimationCanvas` - a from-scratch Canvas2D draw loop animating 88
   particles per burst with its own palette and easing, completely separate
   from everything else in the file.
3. The Remotion composition (`BurstRemotionOverlay` -> `BurstVfxComposition`) -
   raster sprite strips plus the procedural `ElementalBurstLayer` added in the
   previous pass.

This is almost certainly the real reason bursts read as visual noise rather
than one clear effect - not any single system being weak, but three different
techniques drawing on top of each other every time.

**Consolidated onto the Remotion layer only:**

- `BurstAnimationCanvas` deleted entirely (~370 lines: palette, 88-particle
  system, resize/observer logic, draw loop). The burst render loop in
  `app/page.tsx` now calls `<BurstRemotionOverlay>` directly with the same
  props it always received (`instanceId`, `unitId`, `hitCount`, `speed`,
  `targetLeft`, `targetBottom` - `BurstAnimationCanvas`'s extra `hitFrame`,
  `stage`, `finisher` props only existed to drive the deleted Canvas2D loop
  and the deleted `.burst-signature` step classes).
- The `.burst-signature` CSS system removed via a CSS-aware stripper (splits
  the stylesheet into top-level statements by brace depth, drops any whose
  selector is `.burst-signature*` / `.burst-core` / `.burst-wave` /
  `.burst-emblem` / `.burst-particles` / `.burst-canvas-grade` /
  `.burst-animation-canvas` / `.burst-animation-underglow` /
  `.burst-hit-pulse` / `.burst-element-hit` / `.burst-afterimages` /
  `.burst-chain-wash` / `.burst-vfx-*` / `.burst-chain-counter` /
  `.burst-step-N` / `.burst-finisher-beat`, then drops any `@keyframes` no
  longer referenced by name). Two things were deliberately preserved:
  - `.burst-finisher-mark` (the "FINAL / burst name" callout) - this is game
    UI communicating that the finisher hit landed, not particle VFX, so it's
    now rendered as a small standalone element instead of living inside the
    old wrapper.
  - `.fx-burst .battlefield` / `.fx-burst .stage-background` (camera shake and
    stage flash) - a different, still-active system that happened to share
    the same line as the deleted `.burst-signature` block in the source file.
- The raster `preset.charge` / `preset.impact` / `preset.finisher` sprite-strip
  renders inside `BurstVfxComposition` are gone. `preset` is still read for
  `chargeAnchor` / `finisherAnchor` (unaffected). **`AttackImpactComposition`
  (normal attacks) is untouched** - it has its own separate `preset` local and
  its own `RpgSpriteStrip` calls (`normal-hit glow` / `normal-hit element`),
  confirmed unaffected by grep before and after.

## Two new procedural layers replace the removed raster strips

**`BurstChargeLayer`** (`remotion/BattleVfx.tsx`) replaces `preset.charge`.
Per element, particles converge *inward* toward the caster rather than reusing
the outward hit motion at a smaller radius - the literal inverse of
`ElementalBurstLayer`, which is what makes a charge read as "gathering" instead
of "another explosion, but smaller." A soft core glow ties the many small
draws-in together into one visible point.

**`BurstFinisherFlourish`** replaces `preset.finisher` and restores the
per-unit large-scale identity the deleted `.burst-signature-*::before` shapes
used to carry, now procedural and resolution-independent:

| Unit | Finisher shape |
| --- | --- |
| Kael | expanding nova ring from the contact point |
| Lyra | a spiral vortex ring, tightening as it fades |
| Brannock | 8 ground-crack spikes radiating outward |
| Zephyra | 7 converging bolts in a star pattern |
| Solenne | a light pillar plus a widening halo ring |
| Nyx | a collapsing rift that resolves into a small black sun |

`ElementalBurstLayer` (previous pass) still owns the per-hit particle burst for
both regular hits and the finisher moment; `BurstFinisherFlourish` adds the
large silhouette on top of it, so the finisher reads as "more particles AND a
distinct shape," not just a bigger version of every other hit.

Service worker cache bumped to `gates-of-azura-v33`.

---

# v49 → v50: one burst VFX system instead of three, new charge/finisher art, Zephyra position fix

## Zephyra's bow lightning was at waist height

`.zephyra-bow-lightning`'s box had `top:2px`, and its internal elements
(`::before`/`::after`/`>i`) sit ~50-68px down inside a 124px-tall box - so the
visible charge landed 45-55% down her sprite, roughly waist height, well below
her raised bow hand. Changed to `top:-24px`, which moves the same internal
geometry up to chest/hand height without touching the arc shapes themselves.

## Three full VFX systems were rendering on every burst

Tracing the render tree turned up three **independent, fully overlapping**
systems all drawing the same moment:

1. CSS `.burst-signature` - a legacy per-unit flourish built from
   border/clip-path shapes (flame pillars, water vortex, root eruption,
   lightning volley, aurora bloom, rift slashes + black sun).
2. `BurstAnimationCanvas` - a from-scratch Canvas2D draw loop with its own
   88-particle system and its own copy of the six-unit colour palette,
   completely separate from Remotion.
3. The Remotion composition (`BurstRemotionOverlay` -> `BurstVfxComposition`) -
   raster sprite strips plus `ElementalBurstLayer`.

All three fired on every single Brave Burst. This is very likely the actual
reason bursts read as visual noise rather than one clear effect, more than any
one system being individually weak.

**Removed:** `BurstAnimationCanvas` (~370 lines) and every CSS rule scoped to
`.burst-signature`, `.burst-core`, `.burst-wave`, `.burst-emblem`,
`.burst-particles`, `.burst-canvas-grade`, `.burst-animation-canvas`,
`.burst-animation-underglow`, `.burst-hit-pulse`, `.burst-element-hit`,
`.burst-afterimages`, `.burst-chain-wash`, `.burst-vfx-*`, and the per-unit
`.burst-signature-{unit}` variants, plus their now-unused keyframes
(`burstCore`, `burstWave`, `burstEmblemSpin`, `burstParticle`,
`flamePillars`, `waterVortex`, `rootEruption`, `lightningVolley`,
`auroraBloom`, `riftSlashes`, `blackSun`, and the `*Sustain`/`burstVfxFinisher*`
variants). Removal was done with a CSS-aware brace-depth stripper rather than
line-number edits, so it survives regardless of where in the file a rule sits;
selectors were split and matched individually so mixed rules (e.g. a
reduced-motion rule combining one live and one dead selector) kept only the
live half. Verified brace-balanced afterward.

**Kept:** `.burst-finisher-mark` (the "FINAL" text callout - informational UI,
not particle VFX) and `.fx-burst .battlefield` / `.fx-burst .stage-background`
(the battlefield camera shake and stage flash - a different, still-active
system, easy to mistake for part of the sweep since it lived on the same
source line as `.burst-signature` before the cleanup).

`BurstAnimationCanvas`'s only call site was replaced with a direct
`<BurstRemotionOverlay>` call carrying the same props; the "FINAL" callout now
renders as a standalone `<span>` beside it rather than nested inside the
removed wrapper div.

## New procedural charge and finisher art

The raster `preset.charge` / `preset.impact` / `preset.finisher` sprite-strip
renders inside `BurstVfxComposition` are gone, replaced by two new components
in `remotion/BattleVfx.tsx`:

- **`BurstChargeLayer`** - element-specific energy converging *inward* toward
  the caster before release. This is deliberately the inverse motion of
  `ElementalBurstLayer`'s outward hit burst, so a charge reads as "gathering"
  rather than "a smaller explosion." Flame embers spiral inward and up; tide
  rings contract calmly with no spiral; earth shards rise from the ground and
  settle at the caster's feet; lightning arcs strobe and snap inward, faster as
  release nears; radiance rays draw down from above; void wisps swirl inward
  and are swallowed.
- **`BurstFinisherFlourish`** - restores the large-scale per-unit silhouette
  that `.burst-signature` used to provide (now procedural, so it's
  resolution-independent instead of an 80px raster): Kael gets a blooming nova
  ring, Lyra a tightening spiral vortex, Brannock radiating ground-crack
  spikes, Zephyra a converging star-burst of arced bolts, Solenne an expanding
  light pillar with a widening halo, Nyx a collapsing rift resolving into a
  small black sun.

`ElementalBurstLayer` (added in the prior pass) is unchanged and still owns
the per-hit particle motion; these two new layers fill in the charge and the
finisher's large-scale shape around it, so the full charge -> hits -> finisher
arc is now entirely procedural.

`AttackImpactComposition` (normal, non-Burst attack VFX) was not touched -
its own `RpgSpriteStrip` renders and `preset.impact` usage are a separate
composition and remain exactly as before.

Service worker cache bumped to `gates-of-azura-v34`.

## Verify

```bash
npm ci
npm run dev      # trigger a Brave Burst for each of the 6 units
npm test         # includes new regression tests for this pass
npm run remotion:studio   # BurstVfxComposition per unit, if registered there
```

Watch for on the phone/browser: bursts should now show one coherent buildup
(inward-converging particles) into hits (outward particles + per-hit sprite)
into one climax shape per unit, without a second particle system or a
border/clip-path flourish drawing over the same area at the same time.

As with prior passes, this was authored without running the project's install
or build - no network was available in the editing environment. Syntax and
brace-balance checks pass, and 21 targeted assertions confirm the intended
removals/additions are wired correctly, but run `npm test` and play a battle
before trusting it.

---

# v50 → v51: unit archive portrait crop fix, normal-attack VFX variety, VFX performance

## Unit archive portraits were cropping legs off every unit

Diagnosed directly against real screenshots (not guessed from CSS math alone).
Every unit's key art is 1024x1536 (2:3, full-body action pose). The hero box
that displays it in the Unit Archive had collapsed to roughly square
(~306x326px, set by an `!important` rule elsewhere in the cascade) with
`object-fit:cover`, which crops a 2:3 source to fit a ~1:1 box by cutting
vertical extent. Confirmed on Kael and Zephyra's actual archive screenshots:
both show legs and feet cropped off at the knee/thigh with dead space left
above the head - the crop was centered on the wrong axis for what these
images actually are.

Fix: `object-fit:contain` (the same treatment the small ascension-preview
thumbnails already use successfully elsewhere on the same screen), a taller
hero band (390px -> 472px, 430px under 400px-wide viewports) so less of the
frame is empty pillarbox, an element-tinted radial glow behind the figure
using the existing `--detail-accent` variable, and a soft ground shadow under
the feet now that they're actually visible.

This required a compound-class selector (`.detail-portrait.detail-key-art`)
appended at the end of the file rather than editing the existing rules in
place: the stylesheet has several stacked theme passes with equal-specificity
`!important` rules fighting over this exact box, and a compound-class selector
has higher specificity than any of the single-class rules currently winning,
so it wins regardless of source order without requiring a full cascade
rewrite.

## Normal attacks now use real per-element motion, not a recolored generic spray

Every unit's normal-attack hit previously used the same radial particle spray
(`Math.cos(angle) * distance`), just recolored per element - a fire sword and
a lightning bow read as the same effect with a different palette.

The per-element physics authored for `ElementalBurstLayer` (flame licks
accelerating upward, tide ribbons orbiting inward, ballistic earth shards with
a gravity term, strobing re-rolling lightning bolts, descending radiance rays,
inward-collapsing void shards) is now extracted into a shared function,
`elementalParticleShape()`, and `AttackImpactComposition` calls the same
function anchored to the weapon contact point instead of the burst caster.
Every unit's normal attacks now visibly match how their Brave Burst moves,
just scaled down and quicker.

## VFX performance

Two changes, both aimed at the actual bottleneck rather than a blanket quality
cut:

1. **Consolidated per-particle filters.** `filter: drop-shadow(...)` was
   applied to every individual particle - up to 26 simultaneously at a Kael/
   Nyx finisher, forcing a separate blur/raster pass per element per frame.
   Moved to a single `filter` on each layer's wrapping `<AbsoluteFill>`
   instead (`ElementalBurstLayer`, `BurstChargeLayer`,
   `BurstFinisherFlourish`, and the new normal-attack particle layer). Same
   glow, a fraction of the paint cost, since the compositor now rasterizes
   the blur once per layer instead of once per element.
2. **The existing "Reduced effects" setting now actually reaches the Remotion
   VFX.** It previously only toggled CSS classes and had no effect on burst or
   attack particle counts at all. `reducedEffects` is threaded from
   `gameSettings` through `BurstRemotionOverlay` and `AttackImpactOverlay`
   into both compositions, roughly halving particle counts rather than
   disabling any element's identity outright. `AttackImpactComposition` in
   particular mounts a Remotion Player once per normal-attack hit - far more
   often than a burst - so its particle count is the highest-frequency cost
   in the whole battle loop, and is scaled down first.

If lag persists after this on a real device, the next thing to check is
Remotion `<Player>` mount/unmount churn itself (a new Player instance per hit
is inherently heavier than reusing one), which is a larger architectural
change than this pass attempted.

## UI revamp - partially addressed, scoped deliberately

Only the Unit Archive hero portrait (above) was changed. A broader "brighter,
cleaner, more on-theme" pass across the whole game was **not** attempted this
round: an audit of the root design tokens (`--azura-stone-*`,
`--azura-brass-*`, `--azura-paper`) found they're referenced only ~12 times
total across the stylesheet - most colour is hardcoded hex scattered across
several stacked theme passes from earlier development. Changing the tokens
would have had almost no visible effect, and a blind pass touching hardcoded
values across ~2,600 lines of CSS with no way to render and check the result
risked making things worse in places with no way to catch it. The portrait fix
above was only safe to do confidently because it was diagnosed against real
screenshots first.

**Recommended next step:** point at 2-3 specific screens (with a screenshot,
the same way the portrait bug was fixed) rather than "the whole UI" - that
gives a verifiable target instead of a guess.

Service worker cache bumped to `gates-of-azura-v35`.

## Verify

```bash
npm ci
npm run dev
```
- Open the Unit Archive for all six units - full figure should be visible,
  feet included, no cropping.
- Watch a battle: each unit's normal attacks should show particle motion
  matching their element (fire licks for Kael, water ribbons for Lyra, earth
  shards for Brannock, lightning bolts for Zephyra, light rays for Solenne,
  void shards for Nyx), not a single generic recolored spray.
- Toggle Settings -> Reduced effects mid-battle and confirm burst/attack
  particle density visibly drops.
- If lag is still present on your device, note whether it's specifically
  during Burst finishers (particle-bound, likely needs a further pass) or
  constant throughout battle (likely Player mount/unmount, a different fix).

As with every pass this session: authored without running the project's
install or build - no network in the editing environment. 17 targeted
assertions confirm the wiring is correct, and `npm test` includes them, but
this has not been run in a browser. Play a battle and check the archive
screens before trusting it.

---

# v51 → v52: crash mitigation - black screen on first attack (Android WebView)

## Reported symptom

Black screen and crash on the very first normal attack, every time, tested via
an APK built from the unmodified v51 source. Deterministic and unconditional -
not chain-length or unit dependent.

## Diagnosis (circumstantial - not confirmed with a device console log)

`AttackImpactComposition` (the Remotion composition for normal-attack VFX)
already carried two `mixBlendMode:"screen"` layers ("Attack contact light",
"Attack motion streak") plus two blurred `RpgSpriteStrip` renders before this
session touched it. The v51 pass added a *third* `mixBlendMode:"screen"` layer
combined with `filter:drop-shadow(...)` on the same wrapper, to hold the new
per-element normal-attack particles.

`filter` and `mix-blend-mode` on the same element each force an isolated
offscreen compositing pass; combined, and stacked as a third instance of the
same pattern already present twice, this is the single most GPU-expensive
thing addable to a composition that mounts a brand new Remotion `<Player>`
**once per hit** - unconditionally, on literally every unit's first attack.
Android WebView's compositor is far more memory/GPU-constrained than desktop
Chrome, and a black screen with no JS stack trace is the textbook symptom of a
lost GPU context from over-compositing, not a JS exception.

This is the leading hypothesis based on the evidence available (first-attack,
every-attack, unit-independent, introduced in the same pass that added the
third layer) but has **not been confirmed** against an actual device console
log (`chrome://inspect`), which would show a JS stack trace if this is instead
a genuine runtime exception rather than a GPU/compositor crash.

## Fix applied

- `AttackImpactComposition`'s new particle layer: removed the wrapping
  `filter:drop-shadow` + `mixBlendMode:"screen"` combination, reverted to
  per-particle `box-shadow` (no isolated compositing buffer required). The
  per-element motion (flame/tide/earth/lightning/radiance/void) from the v51
  pass is unchanged - only the glow *technique* changed, not the visual
  identity.
- Two of six units' melee choreography (Kael's ember arc, Lyra's tide ribbon)
  also combined `filter` with an animated pseudo-element on their first
  attack. Lower risk (a single element, not a dynamic particle count) but
  cheap to harden the same way while this is under investigation - both
  switched from `filter:drop-shadow` to `box-shadow`.
- `ElementalBurstLayer` / `BurstChargeLayer` / `BurstFinisherFlourish` (the
  Burst-only layers) were left as consolidated single-filter-per-layer from
  the v51 pass - Bursts happen far less often than normal attacks, and there
  is no evidence yet implicating them specifically since the crash is
  reported on normal attacks, not Bursts.

## If this doesn't fix it

That would mean the crash is not GPU/compositing-related, and is more likely a
genuine JS exception. The most useful next step is a device console log via
`chrome://inspect` (connect the Android device over USB, open
`chrome://inspect` on a desktop Chrome, find the WebView, open its DevTools) -
a JS crash will show a stack trace pointing at the exact line; a GPU/render
crash typically shows nothing, which would itself be informative and point
back toward compositing rather than JS.

Service worker cache bumped to `gates-of-azura-v36`.

## Verify

```bash
npm ci
npm run dev      # trigger a normal attack immediately
npm test         # includes a regression test for this specific fix
```
Then rebuild the APK and test on the same device that crashed.

---

# v52 repository migration and first-attack runtime guard

The complete editable v52 project now lives at `Eidolon-Frontier/` in the APK
build repository. This checked-in tree is the authoritative development source;
release ZIPs are generated from it as backups rather than used as build inputs.

The APK workflow builds from a disposable copy of the checked-in project so its
Android `/assets/` path rewrite cannot modify the repository source. Android
identity remains `com.eidolon.frontier`, with `versionCode 52` and
`versionName 52.0`, signed through the existing repository secrets.

During migration, a deterministic runtime error in the normal-hit overlay was
also corrected. `AttackImpactOverlay` declared a `reducedEffects` prop but did
not destructure it before passing it into the Remotion composition. The first
normal attack therefore evaluated an undefined identifier. The prop now has the
same `false` default as the Burst overlay, and the regression suite checks the
normal-hit wrapper specifically.
