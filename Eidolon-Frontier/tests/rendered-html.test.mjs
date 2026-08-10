import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("ships every cinematic Burst VFX phase", async () => {
  const units = ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"];
  for (const unit of units) {
    for (let phase = 1; phase <= 4; phase += 1) {
      const asset = new URL(`../public/effects/bursts/${unit}/phase-${phase}.webp`, import.meta.url);
      const metadata = await stat(asset);
      assert.ok(metadata.size > 30_000, `${unit} phase ${phase} should contain production VFX artwork`);
    }
  }

  const kaelFullscreenSource = await stat(new URL("../public/effects/bursts/kael/fullscreen-embers.mp4", import.meta.url));
  assert.ok(kaelFullscreenSource.size > 1_000_000, "Kael should ship the supplied full-screen ember source");
});

test("uses exact per-hit combat modifiers and continuous Burst animation", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const CRITICAL_CHANCE = 1 \/ 32;/);
  assert.match(source, /const CRITICAL_DAMAGE_MULTIPLIER = 1\.5;/);
  assert.match(source, /const SPARK_DAMAGE_MULTIPLIER = 1\.25;/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{/);
  assert.doesNotMatch(source, /function BurstAnimationCanvas/);
  assert.match(source, /<BurstRemotionOverlay/);
  assert.match(source, /lockedTargetIds\.includes\(enemy\.instanceId\)/);
});

test("plays Zephyra's charged bow volleys and Solenne's planted beam invocations in grouped packets", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

  assert.match(source, /zephyra: \[\s*\{ frame: 5, multiplier: 1, pose: 0, tick: 0 \},\s*\{ frame: 6, multiplier: 0\.6, pose: 0, tick: 1 \},\s*\{ frame: 7, multiplier: 0\.6, pose: 0, tick: 2 \},\s*\{ frame: 5, multiplier: 1, pose: 1, tick: 0 \},\s*\{ frame: 6, multiplier: 0\.6, pose: 1, tick: 1 \},\s*\{ frame: 7, multiplier: 0\.6, pose: 1, tick: 2 \},\s*\]/);
  assert.match(source, /solenne: \[\s*\{ frame: 5, multiplier: 0\.8, pose: 0, tick: 0 \},\s*\{ frame: 5, multiplier: 1\.2, pose: 0, tick: 1 \},\s*\{ frame: 5, multiplier: 0\.8, pose: 1, tick: 0 \},\s*\{ frame: 5, multiplier: 1\.2, pose: 1, tick: 1 \},\s*\]/);
  assert.match(source, /const hits = burst \? \(stars < 5 \? 6 : unit\.burstHits\) : normalAttackChain\.length;/);
  assert.match(source, /frame: burst \|\| unit\.id === "zephyra" \|\| unit\.id === "solenne" \? 0 : normalAttackChain\[0\]\?\.frame \?\? 0/);
  assert.match(source, /const hitMultiplier = burst \? 1 \/ animationSteps : normalBeat\.multiplier;/);
  assert.match(source, /hit: burst \? step \+ 1 : attackFrame \+ 1/);
  assert.match(source, /previousNormalBeat\.pose !== normalBeat\.pose/);
  assert.match(source, /const ZEPHYRA_VOLLEY_DRAW_SEQUENCE = \[\s*\{ frame: 0, stage: "windup", hold: 30 \},\s*\{ frame: 1, stage: "windup", hold: 36 \},\s*\{ frame: 2, stage: "windup", hold: 44 \},\s*\{ frame: 3, stage: "windup", hold: 72 \},\s*\{ frame: 4, stage: "release", hold: 26 \},\s*\{ frame: 5, stage: "flight", hold: 80 \},\s*\]/);
  assert.match(source, /zephyra: ZEPHYRA_VOLLEY_DRAW_SEQUENCE/);
  assert.match(source, /for \(const drawing of castSequence\)/);
  assert.match(source, /frame: drawing\.frame,[\s\S]*?stage: drawing\.stage/);
  assert.match(source, /className="zephyra-arrow-flight"/);
  assert.match(source, /className=\{`zephyra-bow-lightning lightning-stage-\$\{attackFx\.stage\}`\}/);
  assert.match(source, /const SOLENNE_BEAM_CAST_SEQUENCE = \[\s*\{ frame: 0, stage: "windup", hold: 34 \},\s*\{ frame: 1, stage: "windup", hold: 42 \},\s*\{ frame: 2, stage: "windup", hold: 50 \},\s*\{ frame: 3, stage: "release", hold: 58 \},\s*\{ frame: 4, stage: "flight", hold: 36 \},\s*\{ frame: 5, stage: "impact", hold: 72 \},\s*\]/);
  assert.match(source, /solenne: SOLENNE_BEAM_CAST_SEQUENCE/);
  assert.match(source, /const castSequence = !burst && startsNormalPose \? NORMAL_CAST_SEQUENCES\[unit\.id\] : undefined;/);
  assert.match(source, /className=\{`solenne-judgement-beam solenne-beam-stage-\$\{solenneBeamFx\.stage\}`\}/);
  assert.match(source, /rapidNormalChain \? startsNormalPose \? 42 : 10/);
  assert.match(source, /endsNormalPose && step < animationSteps - 1\s*\?\s*getNormalCadence\(unit\.id\)\.phrase\s*:\s*getNormalCadence\(unit\.id\)\.tick/);
  assert.match(source, /zephyra: \{ tick: 10, phrase: 140 \}/);
  assert.match(source, /solenne: \{ tick: 10, phrase: 140 \}/);
  assert.match(source, /getNormalAttackChain\(selectedUnit, 5\)\.length}-HIT NORMAL CHAIN/);
  assert.match(source, /beat\.pose !== chain\[index - 1\]\.pose/);
  assert.match(styles, /impact-unit-zephyra:not\(\.burst-impact\)>strong/);
  assert.match(styles, /impact-unit-solenne:not\(\.burst-impact\)>strong/);
  assert.match(styles, /@keyframes zephyraDetachedArrow/);
  assert.match(styles, /@keyframes zephyraBowRicochet/);
  // Regression: a six-arc ring drew a visible hexagon around her. The charge
  // must stay on the bow, so more than three arcs is a defect.
  assert.doesNotMatch(styles, /\.zephyra-bow-lightning>i:nth-child\(4\)/);
  assert.match(styles, /\.zephyra-bow-lightning>i:nth-child\(3\)/);
  assert.match(source, /Array\.from\(\{ length: 3 \}, \(_, arc\) => <i key=\{arc\} \/>\)/);
  assert.match(styles, /var\(--arrow-travel-x\)/);
  assert.match(source, /const arrowAngle = Math\.atan2\(arrowTravelY, arrowTravelX\) \* 180 \/ Math\.PI - 180;/);
  assert.match(styles, /\.zephyra-arrow-flight\{[\s\S]*?width:40px;[\s\S]*?height:12px;[\s\S]*?rotate:var\(--arrow-angle\)/);
  assert.match(styles, /translate:calc\(-50% \+ var\(--arrow-travel-x\)\) calc\(-50% \+ var\(--arrow-travel-y\)\)/);
  assert.match(styles, /\.field-unit\.unit-solenne\.active:not\(\.bursting\)\{[\s\S]*?transform:translate\(0,0\) scale\(1\.025\)!important/);
  assert.match(styles, /@keyframes solenneBeamRain/);
  assert.match(styles, /@keyframes solenneFloorSeal/);
  assert.match(serviceWorker, /const CACHE = "gates-of-azura-v36";/);
});

test("ships every identity-matched hero frame with grounded action travel", async () => {
  const motionSets = {
    kael: { normal: 5, burst: 12 },
    lyra: { normal: 6, burst: 10 },
    brannock: { normal: 3, burst: 8 },
    zephyra: { normal: 8, burst: 16 },
    solenne: { normal: 6, burst: 8 },
    nyx: { normal: 9, burst: 18 },
  };

  for (const [unit, counts] of Object.entries(motionSets)) {
    const relativePaths = [
      `../public/sprites/units/${unit}-idle-a.webp`,
      `../public/sprites/units/${unit}-idle-b.webp`,
      ...Array.from({ length: counts.normal }, (_, index) => `../public/sprites/units/${unit}-attack-${index + 1}.webp`),
      ...Array.from({ length: counts.burst }, (_, index) => `../public/sprites/units/burst/${unit}-burst-${index + 1}.webp`),
    ];
    for (const relativePath of relativePaths) {
      const metadata = await stat(new URL(relativePath, import.meta.url));
      assert.ok(metadata.size > 8_000, `${relativePath} should contain a production sprite frame`);
    }
  }

  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /single-frame-renderer/);
  assert.match(source, /const activeSource =/);
  assert.match(source, /function StableBattleFrame/);
  assert.match(source, /nextFrame\.decode\(\)/);
  assert.match(source, /<StableBattleFrame/);
  assert.match(source, /const normalFrame = attackFrame % Math\.max\(1, unit\.sprites\.attack\.length\);/);
  assert.match(source, /const burstFrame = attackFrame % Math\.max\(1, unit\.sprites\.burst\.length\);/);
  assert.match(source, /unit\.sprites\.attack\[normalFrame\]/);
  assert.match(source, /unit\.sprites\.burst\[burstFrame\]/);
  assert.match(source, /className="kael-burst-fullscreen-source"/);
  assert.match(source, /fx\.unitId === "kael" && \(fx\.phase === "burst-intro" \|\| fx\.phase === "burst"\)/);
  assert.match(source, /await waitForBattle\(180\);\n    \} else \{\n      await waitForBattle\(180\);/);
  assert.doesNotMatch(source, /<img key=\{frameKey\}/);
  assert.doesNotMatch(source, /idle-element-fx/);
  assert.match(source, /endsNormalPose && step < animationSteps - 1[\s\S]{0,160}getNormalCadence\(unit\.id\)\.phrase[\s\S]{0,80}getNormalCadence\(unit\.id\)\.tick/);
  assert.match(styles, /single-frame-renderer \.sprite-frame\.active/);
  assert.match(styles, /@keyframes idleBreathRig/);
  assert.match(styles, /scaleY\(\.992\)/);
  assert.match(styles, /unit-zephyra \.sprite-idle-a\{transform:translateY\(4\.2%\)/);
  assert.match(styles, /unit-zephyra \.sprite-idle-b\{transform:translateX\(6\.54%\) translateY\(4\.2%\) scaleX\(1\.01\) scaleY\(\.985\)/);
  assert.match(styles, /attack-stage-approach\{[\s\S]*?groundApproach calc\(\.18s \* var\(--battle-time-scale\)\)/);
  assert.match(styles, /\.kael-burst-fullscreen-source\{[\s\S]*?opacity:\.8;[\s\S]*?mix-blend-mode:screen/);
  assert.match(styles, /@keyframes kaelFullscreenSourceSequence\{[\s\S]*?0%\{opacity:\.8\}[\s\S]*?55%\{opacity:\.5\}[\s\S]*?100%\{opacity:\.65\}/);
  assert.doesNotMatch(styles, /field-unit\.active:not\(\.fallen\)\{[\s\S]*?transform:none!important/);
  assert.doesNotMatch(styles, /translateY\(14\.84%\)/);
  assert.doesNotMatch(styles, /@keyframes kaelFlameBlade/);
  assert.doesNotMatch(styles, /idle-element-fx/);
});

test("embeds authored Remotion Burst timelines and moving battle stages", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const player = await readFile(new URL("../app/components/BattleRemotion.tsx", import.meta.url), "utf8");
  const timing = await readFile(new URL("../game/battle-timing.ts", import.meta.url), "utf8");
  const compositions = await readFile(new URL("../remotion/Root.tsx", import.meta.url), "utf8");
  const effects = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.dependencies["@remotion/player"], "4.0.506");
  assert.equal(packageJson.dependencies.remotion, "4.0.506");
  assert.match(player, /<Player/);
  assert.match(player, /playbackRate=\{getBattlePlaybackRate\(speed\)\}/);
  assert.match(timing, /1: 1\.5/);
  assert.match(timing, /2: 0\.75/);
  assert.match(source, /getBattleDuration\(milliseconds, battleSpeed\)/);
  assert.match(source, /"--battle-time-scale": getBattleTimeScale\(battleSpeed\)/);
  assert.match(source, /<AnimatedBattleStage/);
  assert.match(source, /<BurstRemotionOverlay/);
  assert.match(source, /enemy-status-rail/);
  assert.match(compositions, /id="BurstNyx"/);
  assert.match(compositions, /id="StageReliquary"/);
  assert.match(effects, /getBurstDurationInFrames/);
  assert.match(effects, /const RPG_EFFECT_CELL = 80/);
  assert.match(effects, /AttackImpactComposition/);
  assert.match(player, /AttackImpactOverlay/);
});

test("anchors every elemental impact to the weapon and remounts grounded enemy stagger", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const effects = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const choreography = await readFile(new URL("../game/battle-choreography.ts", import.meta.url), "utf8");

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"]) {
    assert.match(choreography, new RegExp(`\\b${unit}: \\[`));
  }
  assert.match(choreography, /getWeaponContactPoint/);
  assert.match(choreography, /BATTLE_CONTACT_GAP_X = 22/);
  assert.match(choreography, /BATTLE_CONTACT_DROP_Y = 14/);
  assert.match(choreography, /getEnemyStaggerProfile/);
  assert.match(effects, /weaponContact\.angle/);
  assert.match(source, /className="enemy-stagger-rig"/);
  assert.match(source, /className="enemy-contact-pin"/);
  assert.match(source, /weaponContact\.x - 50/);
  assert.doesNotMatch(source, /className="burst-chain-counter"/);
  assert.doesNotMatch(source, /length: fx\.spark \? 7 : 4/);
  assert.match(styles, /\.impact-stack::before\{content:none!important;display:none!important\}/);
  assert.match(styles, /@keyframes enemyWeaponStagger/);
  assert.match(styles, /transform-origin:50% 100%/);
  assert.match(styles, /var\(--enemy-stagger-duration/);
});

test("keeps menu music continuous and ships swipeable persisted settings", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /if \(screen === "shop"\) return "shop";/);
  assert.match(source, /return "title-theme";/);
  assert.match(source, /engine\.active\?\.key === musicTrackKey/);
  assert.match(source, /gates-of-azura-settings-v1/);
  assert.match(source, /onPointerMove=\{moveHomeSwipe\}/);
  assert.match(source, /className="home-destination-track"/);
  assert.match(source, /musicVolume/);
  assert.match(source, /sfxVolume/);
  assert.match(styles, /\.settings-panel/);
  assert.match(styles, /\.home-destination-track/);
});

test("gives every melee unit its own authored normal chain, cadence and contact effect", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // All six units are authored now, not just the two ranged ones.
  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"]) {
    assert.match(source, new RegExp(`${unit}: \\[`), `${unit} needs an authored normal chain`);
    assert.match(source, new RegExp(`${unit}: \\{ tick: \\d+, phrase: \\d+ \\}`), `${unit} needs an authored cadence`);
  }

  // Cadence must actually differentiate the units. Brannock is the heaviest
  // phrase in the game and Nyx the fastest; if these ever collapse to the same
  // number every unit reads as the same character again.
  assert.match(source, /brannock: \{ tick: 96, phrase: 190 \}/);
  assert.match(source, /nyx: \{ tick: 14, phrase: 76 \}/);

  // Each melee unit owns a wind-up rather than snapping onto the contact frame.
  assert.match(source, /const KAEL_LUNGE_SEQUENCE = \[/);
  assert.match(source, /const LYRA_STEP_SEQUENCE = \[/);
  assert.match(source, /const BRANNOCK_HEAVE_SEQUENCE = \[/);
  assert.match(source, /const NYX_BLINK_SEQUENCE = \[/);
  assert.match(source, /kael: KAEL_LUNGE_SEQUENCE/);
  assert.match(source, /brannock: BRANNOCK_HEAVE_SEQUENCE/);

  // The wind-up must resolve onto the beat's real contact frame, or damage
  // lands on a drawing the player never sees.
  assert.match(source, /castSequence\[castSequence\.length - 1\]\?\.frame !== attackFrame/);

  // Ranged units stay at range; melee units are tagged for the travel CSS.
  assert.match(source, /const RANGED_NORMAL_UNITS = new Set<BattleUnitId>\(\["zephyra", "solenne"\]\)/);
  assert.match(source, /RANGED_NORMAL_UNITS\.has\(unit\.id\) \? "ranged-normal" : "melee-normal"/);

  assert.match(styles, /\.field-unit\.melee-normal\.active:not\(\.bursting\)\.attack-stage-windup \.battle-unit-sprite/);
  assert.match(styles, /@keyframes kaelEmberArc/);
  assert.match(styles, /@keyframes lyraTideRibbon/);
  assert.match(styles, /@keyframes brannockDustRing/);
  assert.match(styles, /@keyframes nyxBlinkTrail/);
});

test("normalises authored chain totals so choreography does not grant free damage", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const NORMALISE_AUTHORED_CHAINS = true;/);
  assert.match(source, /if \(authoredChain\) return normaliseChain\(unit\.id, authoredChain\);/);

  // Every authored chain must normalise to the same total as the generic even
  // split, otherwise a unit gains raw damage purely by being authored. This
  // parses the real chains out of the source rather than trusting a comment.
  const block = source.slice(
    source.indexOf("const NORMAL_ATTACK_CHAINS"),
    source.indexOf("const NORMALISE_AUTHORED_CHAINS"),
  );
  const chains = [...block.matchAll(/(\w+): \[([\s\S]*?)\],\n/g)];
  assert.equal(chains.length, 6, "expected all six units to be authored");

  for (const [, unit, body] of chains) {
    const multipliers = [...body.matchAll(/multiplier: ([\d.]+)/g)].map((m) => Number(m[1]));
    assert.ok(multipliers.length > 0, `${unit} has no beats`);
    const total = multipliers.reduce((sum, value) => sum + value, 0);
    const normalised = multipliers.map((value) => value / total).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(normalised - 1) < 1e-9, `${unit} must normalise to 1, got ${normalised}`);
  }
});

test("restores a working impact camera and escalating hit feedback", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // Regression: the contact-lock pass previously killed transform on the
  // battlefield outright, which silently disabled the Screen shake setting.
  assert.doesNotMatch(
    styles,
    /\.battlefield\.impact-beat-0,\n\.battlefield\.impact-beat-1,\n\.fx-burst \.battlefield,\n\.battle-screen\[class\*="burst-unit-"\] \.battlefield\{\n  animation:none!important;\n  transform:none!important;\n\}/,
    "battlefield camera must not be blanket-disabled",
  );
  assert.match(styles, /@keyframes cameraKickA/);
  assert.match(styles, /@keyframes cameraKickB/);
  assert.match(styles, /\.battlefield\.no-screen-shake\.impact-beat-0/);

  // The camera must be driven by real hit weight, not a constant.
  assert.match(source, /setImpactPower\(Number\(hitPower\.toFixed\(2\)\)\)/);
  assert.match(source, /"--impact-power": impactPower/);
  assert.match(styles, /--shake-x:calc\(var\(--impact-power,1\) \* [\d.]+px\)/);

  // Crits, Sparks and Burst finishers must be visually distinguishable.
  assert.match(styles, /@keyframes damageSparkPop/);
  assert.match(styles, /@keyframes damageCritSlam/);
  assert.match(styles, /@keyframes damageFinisherStrike/);
  assert.match(source, /--numeral-drift-x/);

  // Accessibility: motion additions must respect the existing settings.
  assert.match(styles, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?cameraKick|\.battlefield\.impact-beat-0,\s*\.battlefield\.impact-beat-1\{animation:none!important/);
});

test("drives the full-screen burst cut-in for every unit, not only Kael", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const root = await readFile(new URL("../remotion/Root.tsx", import.meta.url), "utf8");

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"]) {
    assert.match(vfx, new RegExp(`${unit}: \\{ dim:`), `${unit} needs a cut-in palette`);
  }

  // The flat CSS banner fallback is gone; all units go through Remotion.
  assert.doesNotMatch(source, /burstIntroUnit\.id === "kael" \?/);
  assert.match(source, /<BurstIntroOverlay/);
  assert.match(source, /unitId=\{burstIntroUnit\.id\}/);
  assert.match(vfx, /const p = BURST_INTRO_STYLE\[unitId\] \?\? BURST_INTRO_STYLE\.kael;/);
  assert.match(root, /IntroNyx/);
});

test("removes the washed-out contact overlays and builds bursts progressively", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");

  // A 190px near-white bar in screen blend mode sat over the contact point on
  // every hit and washed out the artwork it was meant to punctuate.
  assert.doesNotMatch(source, /className=\{`attack-frame-transition/);
  assert.doesNotMatch(styles, /^\.attack-frame-transition\{/m);
  assert.doesNotMatch(styles, /@keyframes attackFrameVeil/);

  // Bursts must build across the chain rather than repeating one flash.
  assert.match(vfx, /const hitRamp = interpolate\(chainPosition/);
  assert.match(vfx, /const accentHit = hitIndex > 0 && hitIndex % 4 === 3;/);
  assert.match(vfx, /0\.35 \* hitRamp, 1\.46 \* hitRamp \* hitAccent/);

  // The burst must visibly travel from caster to target before first contact.
  assert.match(vfx, /name="Burst launch streak"/);
  assert.match(vfx, /const launchAngle = Math\.atan2\(targetY - casterY, targetX - casterX\)/);
  assert.equal(vfx.split('name="Burst launch streak"').length - 1, 1, "launch streak must not be duplicated");
});

test("gives each element its own procedural burst behaviour", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");

  assert.match(vfx, /function ElementalBurstLayer\(/);
  assert.match(vfx, /<ElementalBurstLayer/);

  // All six elements must have a distinct motion branch. Sharing one particle
  // behaviour is what made a Grove burst move like a Void one.
  for (const kind of ["flame", "tide", "earth", "lightning", "radiance"]) {
    assert.match(vfx, new RegExp(`kind === "${kind}"`), `${kind} needs its own motion`);
  }

  // The behaviours must actually differ, not just recolour: earth is ballistic
  // (gravity term), tide orbits, void collapses inward.
  assert.match(vfx, /0\.14 \* t \* t/, "earth shards need a gravity term");
  assert.match(vfx, /const orbit = \(1 - life\) \* spread/, "tide must spiral inward");
  assert.match(vfx, /const fall = \(1 - life\) \* spread/, "void must collapse inward");

  // Each hit must re-roll its pattern rather than replaying one canned spray.
  assert.match(vfx, /const seed = `\$\{unitId\}-\$\{isFinisher \? "fin" : hitIndex\}`/);
  assert.match(vfx, /random\(`\$\{seed\}-a-\$\{index\}`\)/);
});

test("shifts burst weight onto the resolution-independent procedural layer", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");

  // Burst weight is carried by stage-resolution procedural layers rather than
  // the removed, heavily upscaled 80x80 raster charge/finisher strips.
  assert.match(vfx, /const intensity = isFinisher \? 1\.85 : hitRamp \* 1\.2;/);
  assert.match(vfx, /const count = reducedEffects \? \(isFinisher \? 13 : 8\) : isFinisher \? 26 : 15;/);
  assert.match(vfx, /<BurstChargeLayer/);
  assert.match(vfx, /<BurstFinisherFlourish/);
  assert.match(vfx, /<ElementalBurstLayer/);
  assert.doesNotMatch(vfx, /name=\{`\$\{unitId\} one-shot finisher`\}/);
});

test("moves Zephyra's bow lightning up to hand height instead of her waist", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const block = styles.slice(styles.indexOf(".zephyra-bow-lightning{"), styles.indexOf(".zephyra-bow-lightning{") + 700);
  assert.match(block, /top:-24px;/);
  assert.doesNotMatch(block, /top:2px;/);
});

test("collapses three overlapping burst VFX systems down to one", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // Previously every burst rendered THREE full independent VFX systems at
  // once: a CSS .burst-signature flourish, a from-scratch Canvas2D 88-particle
  // draw loop (BurstAnimationCanvas), and the Remotion composition. Only the
  // Remotion layer should remain.
  assert.doesNotMatch(page, /function BurstAnimationCanvas/);
  assert.doesNotMatch(page, /className=\{`burst-signature/);
  assert.match(page, /<BurstRemotionOverlay/);
  assert.doesNotMatch(styles, /\.burst-signature\{/);
  assert.doesNotMatch(styles, /\.burst-animation-canvas\{/);

  // The informational "FINAL" callout is UI, not particle VFX, and must survive.
  assert.match(page, /className="burst-finisher-mark"/);
  assert.match(styles, /\.burst-finisher-mark\{/);

  // The battlefield camera shake and stage flash used by .fx-burst are a
  // different, still-active system and must not have been caught by the sweep.
  assert.match(styles, /\.fx-burst \.battlefield\{animation:burstCameraShake/);
  assert.match(styles, /\.fx-burst \.stage-background\{animation:burstStageFlash/);

  // The raster charge/hit/finisher sprite strips inside the burst composition
  // are gone, replaced by new procedural layers.
  assert.doesNotMatch(vfx, /name=\{`\$\{unitId\} charge glow`\}/);
  assert.doesNotMatch(vfx, /name=\{`\$\{unitId\} hit glow`\}/);
  assert.doesNotMatch(vfx, /name=\{`\$\{unitId\} finisher glow`\}/);
  assert.match(vfx, /function BurstChargeLayer\(/);
  assert.match(vfx, /<BurstChargeLayer/);
  assert.match(vfx, /function BurstFinisherFlourish\(/);
  assert.match(vfx, /<BurstFinisherFlourish/);
  assert.match(vfx, /<ElementalBurstLayer/);

  // Normal-attack VFX (a separate composition, AttackImpactComposition) must
  // be completely untouched by the burst-specific cleanup.
  assert.match(vfx, /normal-hit glow/);
  assert.match(vfx, /normal-hit element/);
});

test("gives each unit's burst finisher its own large-scale signature shape", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const flourish = vfx.slice(vfx.indexOf("function BurstFinisherFlourish("));

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne"]) {
    assert.match(flourish, new RegExp(`case "${unit}":`), `${unit} needs its own finisher shape`);
  }
  // nyx is the switch's default case (a collapsing rift resolving into a
  // black sun), so it is checked by content rather than by a case label.
  assert.match(flourish, /a collapsing rift that resolves into a small black sun/);
});

test("shows the full unit figure in the archive hero instead of cropping legs off", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // Real screenshots of Kael and Zephyra's archive pages showed legs/feet
  // cropped off with dead headroom above, caused by object-fit:cover in a
  // near-square box against 2:3 source art. Fixed with a compound-class
  // selector (higher specificity than the single-class rules earlier in the
  // file that set the box to ~306x326px) switching to contain-fit.
  const block = styles.slice(styles.indexOf("Unit Archive hero portrait"));
  assert.match(block, /\.detail-hero:has\(\.detail-portrait\.detail-key-art\)\{/);
  assert.match(block, /height:472px!important/);
  assert.match(block, /\.detail-portrait\.detail-key-art>img\{/);
  assert.match(block, /object-fit:contain!important/);
  assert.match(block, /object-position:center bottom!important/);
  // The accent-tinted background must resolve per unit's element, matching
  // the same --detail-accent variable the rest of the archive screen uses.
  assert.match(block, /var\(--detail-accent,#6bdbeb\)/);
});

test("gives normal attacks the same per-element motion as bursts, not a generic recolored spray", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");

  // The per-element physics (flame licks, tide ribbons, ballistic earth,
  // strobing lightning, descending radiance, collapsing void) was previously
  // authored only inside ElementalBurstLayer. It is now a shared function so
  // normal attacks - which mount a Remotion Player once per hit, far more
  // often than a burst - use their unit's real attack motion too.
  assert.match(vfx, /function elementalParticleShape\(/);
  assert.match(vfx, /const shape = elementalParticleShape\(kind, style, index, count,/); // ElementalBurstLayer
  assert.match(vfx, /const kind = style\.impact;/); // AttackImpactComposition
  assert.match(vfx, /const normalSparkCount = reducedEffects/);
  // The old generic radial spray (same shape for all six units) must be gone.
  assert.doesNotMatch(vfx, /Math\.cos\(angle\) \* distance \* local/);
});

test("consolidates per-particle filters and respects the Reduced effects setting in burst/attack VFX", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const overlay = await readFile(new URL("../app/components/BattleRemotion.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // A separate drop-shadow filter per particle (up to 26 at a finisher) forced
  // a per-element blur pass every frame. One filter per layer replaces N.
  assert.doesNotMatch(vfx, /left: Math\.max\(-40, Math\.min\(width \+ 40, x\)\),\s*\n\s*top: Math\.max\(-40, Math\.min\(height \+ 40, y\)\),[\s\S]{0,400}filter: `drop-shadow/);

  // The existing "Reduced effects" setting previously had no effect on the
  // Remotion burst/attack VFX at all; it now scales particle counts on both
  // the burst composition and the far-more-frequent normal-attack composition.
  assert.match(vfx, /reducedEffects\?: boolean;/);
  assert.match(vfx, /reducedEffects \? \(isFinisher \? 13 : 8\) : isFinisher \? 26 : 15/);
  assert.match(vfx, /const count = reducedEffects \? 6 : 11;/); // BurstChargeLayer
  const attackOverlay = overlay.slice(
    overlay.indexOf("export function AttackImpactOverlay("),
    overlay.indexOf("export function BurstIntroOverlay("),
  );
  assert.match(attackOverlay, /spark,\s*reducedEffects = false,/);
  assert.match(attackOverlay, /reducedEffects,\s*\}\}/);
  assert.match(page, /reducedEffects=\{gameSettings\.reducedEffects\}/);
});

test("avoids stacking a third mixBlendMode+filter compositing layer on every normal attack", async () => {
  const vfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // Reported: black-screen crash on a real Android device, on the very first
  // normal attack, every time. AttackImpactComposition already had two
  // mixBlendMode:"screen" layers ("Attack contact light", "Attack motion
  // streak") plus two blurred RpgSpriteStrips; stacking a third mixBlendMode
  // layer combined with filter:drop-shadow forces an extra offscreen
  // compositing pass, and this composition mounts a new Remotion Player once
  // per hit - the highest-frequency VFX mount in the game, unconditional on
  // every unit's first attack. Reverted to per-particle box-shadow, which
  // does not require an isolated compositing buffer.
  const attackComp = vfx.slice(vfx.indexOf("export function AttackImpactComposition("));
  assert.doesNotMatch(
    attackComp,
    /mixBlendMode: "screen", pointerEvents: "none", filter: `drop-shadow/,
  );
  assert.match(attackComp, /boxShadow: `0 0 5px \$\{style\.primary\}`,/);

  // Two of six units' melee choreography also combined filter with an
  // animated pseudo-element on their first attack (Kael's ember arc, Lyra's
  // tide ribbon) - lower risk (single element, not per-particle) but cheap to
  // harden the same way while investigating.
  assert.doesNotMatch(styles, /filter:blur\(\.4px\) drop-shadow\(0 0 6px #ff5b23\)/);
  assert.doesNotMatch(styles, /filter:drop-shadow\(0 0 5px #35c7ff\)/);
});
