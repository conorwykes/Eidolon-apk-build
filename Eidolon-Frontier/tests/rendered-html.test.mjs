import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async (t) => {
  try {
    await stat(new URL("../dist/server/index.js", import.meta.url));
  } catch (error) {
    if (error?.code === "ENOENT") return t.skip("server build is not produced by the offline mobile build");
    throw error;
  }
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

test("keeps the named Burst cinematic while removing Kael's video playover", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const player = await readFile(new URL("../app/components/BattleRemotion.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /<BurstIntroOverlay/);
  assert.match(player, /component=\{KaelFireBurstIntro\}/);
  assert.doesNotMatch(source, /fullscreen-embers\.mp4/);
  assert.doesNotMatch(source, /kael-burst-fullscreen-source/);
  assert.doesNotMatch(styles, /\.kael-burst-fullscreen-source\{/);
});

test("uses exact per-hit combat modifiers and continuous Burst animation", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const CRITICAL_CHANCE = 1 \/ 32;/);
  assert.match(source, /const CRITICAL_DAMAGE_MULTIPLIER = 1\.5;/);
  assert.match(source, /const SPARK_DAMAGE_MULTIPLIER = 1\.25;/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{/);
  assert.doesNotMatch(source, /function BurstAnimationCanvas/);
  assert.match(source, /<FiveStarBurstVfx/);
  assert.match(source, /<FiveStarBurstImpactVfx/);
  assert.doesNotMatch(source, /<BurstRemotionOverlay/);
  assert.match(source, /lockedTargetIds\.includes\(enemy\.instanceId\)/);
});

test("plays Zephyra's charged bow volleys and Solenne's planted beam invocations in grouped packets", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const RANGED_NORMAL_UNITS = new Set<BattleUnitId>\(\["zephyra", "solenne"\]\)/);
  assert.match(source, /const hits = burst \? combatProfile\.burstHits : normalAttackChain\.length;/);
  assert.match(source, /const hitMultiplier = burst \? 1 \/ animationSteps : normalBeat\.multiplier;/);
  assert.match(source, /hit: burst \? step \+ 1 : attackFrame \+ 1/);
  assert.match(source, /getNormalCastSequence\(unit\.id, stars\)/);
  assert.match(source, /for \(const drawing of castSequence\)/);
  assert.match(source, /className="zephyra-arrow-flight"/);
  assert.match(source, /className=\{`zephyra-bow-lightning lightning-stage-\$\{attackFx\.stage\}`\}/);
  assert.match(source, /className=\{`solenne-judgement-beam solenne-beam-stage-\$\{solenneBeamFx\.stage\}`\}/);
  assert.match(source, /burstDoesDamage: false/);
  assert.match(source, /supportBurst = burst && !combatProfile\.burstDoesDamage/);
  assert.match(source, /const damage = burst && !combatProfile\.burstDoesDamage\s*\? 0/);
  assert.match(source, /healing burst/i);
  assert.match(styles, /@keyframes zephyraDetachedArrow/);
  assert.match(styles, /@keyframes zephyraBowRicochet/);
  assert.doesNotMatch(styles, /\.zephyra-bow-lightning>i:nth-child\(4\)/);
  assert.match(styles, /\.zephyra-bow-lightning>i:nth-child\(3\)/);
  assert.match(source, /Array\.from\(\{ length: 3 \}, \(_, arc\) => <i key=\{arc\} \/>\)/);
  assert.match(styles, /var\(--arrow-travel-x\)/);
  assert.match(source, /const arrowAngle = Math\.atan2\(arrowTravelY, arrowTravelX\) \* 180 \/ Math\.PI - 180;/);
  assert.match(styles, /@keyframes solenneBeamRain/);
  assert.match(styles, /@keyframes solenneFloorSeal/);
});

test("ships every tiered evolution frame with generous transparent gutters", async () => {
  const units = ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"];
  for (const unit of units) {
    for (const stars of [2, 3, 4, 5]) {
      for (const animation of ["idle", "attack", "burst"]) {
        const frameCount = stars === 5 && animation === "idle" ? 6 : 4;
        for (let frame = 1; frame <= frameCount; frame += 1) {
          const relativePath = `../public/sprites/units/${unit}-evolution/frames/${stars}/${animation}-${frame}.webp`;
          const metadata = await stat(new URL(relativePath, import.meta.url));
          assert.ok(metadata.size > 10_000, `${relativePath} should contain a production sprite frame`);
        }
      }
    }
    const portrait = await stat(new URL(`../public/units/forms/${unit}-2.webp`, import.meta.url));
    assert.ok(portrait.size > 10_000, `${unit} needs its 2-star portrait`);
    for (const stars of [2, 3, 4, 5]) {
      const rarityArt = await stat(new URL(`../public/units/rarity-art/${unit}-${stars}.webp`, import.meta.url));
      const battleFace = await stat(new URL(`../public/units/battle-faces/${unit}-${stars}.webp`, import.meta.url));
      assert.ok(rarityArt.size > 50_000, `${unit} ${stars}-star needs production UI key art`);
      assert.ok(battleFace.size > 20_000, `${unit} ${stars}-star needs a battle face portrait`);
    }
  }

  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /const evolutionFrames =/);
  assert.match(source, /const EVOLUTION_SPRITES =/);
  assert.match(source, /return EVOLUTION_SPRITES\[unit\.id\]\[stars\]/);
  assert.match(source, /`\/units\/rarity-art\/\$\{unit\.id\}-\$\{stars\}\.webp`/);
  assert.match(source, /return getBattleSpriteSet\(unit, stars\)\.idle\[0\];/);
  assert.match(source, /<BattleFacePortrait unit=\{unit\} stars=\{stars\} \/>/);
  assert.match(source, /<UnitKeyArt unit=\{unit\} stars=\{stars\} \/>/);
  assert.match(source, /single-frame-renderer/);
  assert.match(source, /const activeSource =/);
  assert.match(source, /function StableBattleFrame/);
  assert.match(source, /nextFrame\.decode\(\)/);
  assert.match(source, /<StableBattleFrame/);
  assert.match(source, /const normalFrame = attackFrame % Math\.max\(1, spriteSet\.attack\.length\);/);
  assert.match(source, /const burstFrame = attackFrame % Math\.max\(1, spriteSet\.burst\.length\);/);
  assert.match(source, /spriteSet\.attack\[normalFrame\]/);
  assert.match(source, /spriteSet\.burst\[burstFrame\]/);
  assert.doesNotMatch(source, /<img key=\{frameKey\}/);
  assert.doesNotMatch(source, /idle-element-motion/);
  assert.match(source, /getBattleSpriteSet\(speakerUnit, speakerStars\)\.idle\[0\]/);
  assert.match(source, /getNormalCadence\(unit\.id, stars\)\.phrase/);
  assert.match(source, /getNormalCadence\(unit\.id, stars\)\.tick/);
  assert.match(styles, /single-frame-renderer \.sprite-frame\.active/);
  assert.match(styles, /\.field-unit\.form-2/);
  assert.match(styles, /\.field-unit\.form-5/);
  assert.match(styles, /unit-lyra\.form-5/);
  assert.match(styles, /\.battle-face-portrait/);
  assert.match(styles, /\.battle-face-portrait\{background:transparent!important/);
  assert.match(styles, /\.story-unit\.story-speaker-sprite/);
  assert.doesNotMatch(styles, /idle-element-motion/);
});

test("restores Lyra as both Android and installable app artwork", async () => {
  const androidIcon = await readFile(new URL("../android/app/src/main/res/drawable-nodpi/app_icon.png", import.meta.url));
  const pwaIcon = await readFile(new URL("../public/icons/icon-512.png", import.meta.url));
  const manifest = await readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  assert.deepEqual(androidIcon, pwaIcon);
  assert.match(manifest, /android:icon="@drawable\/app_icon"/);
});

test("cycles only locked 5-star idle sheets with a natural baked VFX loop", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rebuildScript = await readFile(new URL("../scripts/rebuild-5star-idle-sheets.py", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../public/sprites/units/idle-vfx-sources/5star-idle-manifest.json", import.meta.url), "utf8"));
  const component = source.slice(
    source.indexOf("function BattleUnitSprite"),
    source.indexOf("function ResourceBar"),
  );
  const fixedIdleStyles = styles.slice(styles.indexOf("/* v57 idle stability fix:"));
  assert.match(component, /stars === 5 \? spriteSet\.idle\[idleFrame\] \?\? spriteSet\.idle\[0\] : spriteSet\.idle\[0\]/);
  assert.match(component, /\? "sprite-idle-anchor"/);
  assert.match(component, /setInterval\(\(\) => \{/);
  assert.match(component, /idleTiming\.milliseconds/);
  assert.match(component, /idleTiming\.startFrame/);
  assert.match(component, /stars !== 5/);
  assert.match(component, /"locked-5star"/);
  assert.match(component, /data-idle-phase-count/);
  assert.match(component, /data-idle-frame-ms/);
  assert.doesNotMatch(component, /setTimeout/);
  assert.match(source, /kael: \{ milliseconds: 360, startFrame: 0 \}/);
  assert.match(source, /brannock: \{ milliseconds: 540, startFrame: 4 \}/);
  assert.match(fixedIdleStyles, /sprite-idle\[data-idle-anchor="locked-5star"\]\{/);
  assert.match(fixedIdleStyles, /animation:none!important/);
  assert.match(rebuildScript, /assert_body_anchors/);
  assert.match(rebuildScript, /BODY_SCALE_Y = \(1\.0, 0\.997, 0\.993, 0\.988, 0\.993, 0\.997\)/);
  assert.match(rebuildScript, /restrained -> rising -> near-peak -> peak -> receding -> settling/);
  assert.equal(manifest.idleFrameCount, 6);
  assert.equal(manifest.bodyAnchorPolicy, "fixed horizontal body centre and foot line across all six combined frames");
  assert.equal(manifest.elementAnchorPolicy, "fixed per-unit VFX centre and ground line; no independent runtime layer");
  assert.equal(manifest.loop, "restrained -> rising -> near-peak -> peak -> receding -> settling -> restrained");

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"]) {
    for (const stars of [2, 3, 4, 5]) {
      await stat(new URL(`../public/sprites/units/${unit}-evolution/frames/${stars}/idle-1.webp`, import.meta.url));
    }
    const record = manifest.units.find((entry) => entry.unit === unit);
    await stat(new URL(`../public/sprites/units/${unit}-evolution/frames/5/idle-5.webp`, import.meta.url));
    await stat(new URL(`../public/sprites/units/${unit}-evolution/frames/5/idle-6.webp`, import.meta.url));
    assert.deepEqual(record.phaseOrder, ["restrained", "rising", "near-peak", "peak", "receding", "settling"]);
    assert.ok(record.vfxAlphaWeights[0] < record.vfxAlphaWeights[1]);
    assert.ok(record.vfxAlphaWeights[1] < record.vfxAlphaWeights[2]);
    assert.ok(record.vfxAlphaWeights[2] < record.vfxAlphaWeights[3]);
    assert.ok(record.vfxAlphaWeights[3] > record.vfxAlphaWeights[4]);
    assert.ok(record.vfxAlphaWeights[4] > record.vfxAlphaWeights[5]);
    assert.ok(record.vfxAlphaWeights[5] > record.vfxAlphaWeights[0]);
    assert.equal(new Set(record.bodyFrameBounds.map((bounds) => bounds[3])).size, 1, `${unit} foot line must stay locked`);
    assert.equal(new Set(record.bodyFrameBounds.map((bounds) => bounds[0] + bounds[2])).size, 1, `${unit} body centre must stay locked`);
    await stat(new URL(`../public/sprites/units/${unit}-evolution/sheets/${unit}-5-idle-sheet.png`, import.meta.url));
    await stat(new URL(`../public/sprites/units/${unit}-evolution/sheets/${unit}-5-master-sheet.png`, import.meta.url));
    await stat(new URL(`../public/sprites/units/idle-vfx-sources/${unit}-5-idle-body.png`, import.meta.url));
    await stat(new URL(`../public/sprites/units/idle-vfx-sources/${unit}-5-idle-vfx-6phase-alpha.png`, import.meta.url));
  }
});

test("uses rarity-scaled progressive Burst timelines and an anchored recovery", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../public/sprites/units/progressive-burst-sources/progressive-burst-manifest.json", import.meta.url), "utf8"));
  const expectedFiveStar = { kael: 16, lyra: 16, brannock: 14, zephyra: 20, solenne: 14, nyx: 22 };

  assert.deepEqual(manifest.rarityFrameCounts["5"], expectedFiveStar);
  for (const form of manifest.forms) {
    assert.equal(form.finalFrameMatchesIdlePixels, true, `${form.unit} ${form.stars}★ must return to its foot anchor`);
    assert.ok(form.frameCount > 4, `${form.unit} ${form.stars}★ Burst must exceed the four-frame normal attack`);
    for (let frame = 1; frame <= form.frameCount; frame += 1) {
      const asset = new URL(`../public/sprites/units/${form.unit}-evolution/frames/${form.stars}/burst-${frame}.webp`, import.meta.url);
      assert.ok((await stat(asset)).size > 1000, `${form.unit} ${form.stars}★ Burst frame ${frame} is missing`);
    }
  }

  assert.match(source, /PROGRESSIVE_BURST_FRAME_COUNTS/);
  assert.match(source, /const burstOpeningFrames =/);
  assert.match(source, /const burstRecoveryFrames =/);
  assert.match(source, /stage: frame === battleSprites\.burst\.length - 1 \? "anchored" : "recover"/);
  assert.match(styles, /attack-stage-anchored/);
});

test("keeps Remotion intros, moving stages and normal impacts while replacing Burst VFX", async () => {
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
  assert.match(source, /<BurstIntroOverlay/);
  assert.match(source, /<FiveStarBurstVfx/);
  assert.doesNotMatch(source, /<BurstRemotionOverlay/);
  assert.match(source, /enemy-status-rail/);
  assert.match(compositions, /id="StageReliquary"/);
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
  assert.match(choreography, /BATTLE_CONTACT_DROP_Y = 20/);
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
  assert.match(source, /className="home-destination-track[^"\n]*"/);
  assert.match(source, /musicVolume/);
  assert.match(source, /sfxVolume/);
  assert.match(styles, /\.settings-panel/);
  assert.match(styles, /\.home-destination-track/);
});

test("gives every unit tiered chains, cadence, sprites and type-correct combat", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "solenne", "nyx"]) {
    assert.match(source, new RegExp(`${unit}: \\{`), `${unit} needs tier profiles`);
  }
  assert.match(source, /const tierHits: Record<BattleUnitId, Record<StarTier, number>>/);
  assert.match(source, /const hitCount = tierHits\[unit\.id\]\[stars\]/);
  assert.match(source, /function getNormalCadence\(unitId: BattleUnitId, stars: StarTier\)/);
  assert.match(source, /brannock: \{ tick: 96, phrase: 190 \}/);
  assert.match(source, /nyx: \{ tick: 14, phrase: 76 \}/);
  assert.match(source, /const RANGED_NORMAL_UNITS = new Set<BattleUnitId>\(\["zephyra", "solenne"\]\)/);
  assert.match(source, /RANGED_NORMAL_UNITS\.has\(unit\.id\) \? "ranged-normal" : "melee-normal"/);
  assert.match(source, /supportBurst = burst && !combatProfile\.burstDoesDamage/);
  assert.match(source, /const damage = burst && !combatProfile\.burstDoesDamage\s*\? 0/);
  assert.match(styles, /\.field-unit\.melee-normal\.active:not\(\.bursting\)\.attack-stage-windup \.battle-unit-sprite/);
  assert.match(styles, /@keyframes zephyraDetachedArrow/);
  assert.match(styles, /@keyframes solenneBeamRain/);
});

test("normalises authored chain totals so choreography does not grant free damage", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const NORMALISE_AUTHORED_CHAINS = true;/);
  assert.match(source, /const total = chain\.reduce\(\(sum, beat\) => sum \+ beat\.multiplier, 0\);/);
  assert.match(source, /multiplier: beat\.multiplier \/ total/);
  assert.match(source, /return normaliseChain\(`\$\{unit\.id\}-\$\{stars\}`, chain\);/);
  assert.match(source, /return normaliseChain\(`lyra-\$\{stars\}`, LYRA_NORMAL_ATTACK_CHAINS\[stars\]\);/);
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
  assert.match(source, /setImpactPower\(Number\(\(supportBurst \? 0\.35 : hitPower\)\.toFixed\(2\)\)\)/);
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
  const vfx = await readFile(new URL("../app/components/FiveStarBurstVfx.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  // Previously every burst rendered THREE full independent VFX systems at
  // once: a CSS .burst-signature flourish, a from-scratch Canvas2D 88-particle
  // draw loop (BurstAnimationCanvas), and the Remotion composition. Only the
  // Only the frame/contact-synchronised five-star layer should mount.
  assert.doesNotMatch(page, /function BurstAnimationCanvas/);
  assert.doesNotMatch(page, /className=\{`burst-signature/);
  assert.doesNotMatch(page, /<BurstRemotionOverlay/);
  assert.match(page, /<FiveStarBurstVfx/);
  assert.match(page, /<FiveStarBurstImpactVfx/);
  assert.doesNotMatch(styles, /\.burst-signature\{/);
  assert.doesNotMatch(styles, /\.burst-animation-canvas\{/);
  assert.doesNotMatch(page, /fullscreen-embers\.mp4/);

  // The battlefield camera shake and stage flash used by .fx-burst are a
  // different, still-active system and must not have been caught by the sweep.
  assert.match(styles, /\.fx-burst \.battlefield\{animation:burstCameraShake/);
  assert.match(styles, /\.fx-burst \.stage-background\{animation:burstStageFlash/);

  // Each unit owns a distinct persistent motion drawing and a real per-hit
  // contact drawing rather than a detached, time-only overlay.
  for (const component of ["KaelMotion", "LyraMotion", "BrannockMotion", "ZephyraMotion", "SolenneMotion", "NyxMotion"]) {
    assert.match(vfx, new RegExp(`function ${component}\\(`));
  }
  for (const filledEffect of [
    "five-star-vfx-flame-cluster",
    "five-star-vfx-water-swirl",
    "five-star-vfx-rock-burst",
    "five-star-vfx-lightning-charge",
    "five-star-vfx-sanctuary",
    "five-star-vfx-void-sweep",
  ]) {
    assert.match(vfx, new RegExp(filledEffect));
  }
  assert.doesNotMatch(vfx, /five-star-vfx-core-line|five-star-vfx-echo-line/);
  assert.match(vfx, /five-star-impact-shape/);
  assert.match(vfx, /data-burst-vfx-frame=\{frame \+ 1\}/);
  assert.match(vfx, /data-burst-vfx-progress=\{progress\.toFixed\("\.3f"\)|data-burst-vfx-progress=\{progress\.toFixed\(3\)\}/);
  assert.match(vfx, /data-burst-impact-hit=\{hitIndex\}/);
  assert.match(styles, /\.five-star-burst-vfx\{/);
  assert.match(styles, /\.five-star-burst-impact\{/);
  assert.match(styles, /\.five-star-burst-vfx\{[^}]*z-index:34/);
  assert.match(styles, /\.five-star-burst-vfx\{[^}]*mix-blend-mode:normal/);
  assert.match(vfx, /function ImpactArtwork\(/);
  assert.match(vfx, /five-star-impact-finisher/);
  assert.doesNotMatch(vfx, /fullscreen-embers\.mp4/);

  // Normal-attack VFX (a separate composition, AttackImpactComposition) must
  // be completely untouched by the burst-specific cleanup.
  const normalVfx = await readFile(new URL("../remotion/BattleVfx.tsx", import.meta.url), "utf8");
  assert.match(normalVfx, /normal-hit glow/);
  assert.match(normalVfx, /normal-hit element/);
});

test("gives each unit's burst finisher its own large-scale signature shape", async () => {
  const vfx = await readFile(new URL("../app/components/FiveStarBurstVfx.tsx", import.meta.url), "utf8");
  const artwork = vfx.slice(vfx.indexOf("function ImpactArtwork("));

  for (const unit of ["kael", "lyra", "brannock", "zephyra", "nyx"]) {
    assert.match(artwork, new RegExp(`unitId === "${unit}"`), `${unit} needs its own contact shape`);
  }
  assert.match(artwork, /if \(unitId === "solenne"\) return null/);
  assert.match(artwork, /finisher \? "five-star-impact-finisher"/);
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
