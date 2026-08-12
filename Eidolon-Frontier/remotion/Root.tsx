import { Composition } from "remotion";
import { KaelFireBurstIntro, StageMotionComposition } from "./BattleVfx";

// The full-screen cut-in is palette-driven, so every unit is editable in
// Studio rather than Kael alone.
const BURST_INTROS = [
  { id: "IntroKael", unitId: "kael", burstName: "Cinderfall" },
  { id: "IntroLyra", unitId: "lyra", burstName: "Moonlit Current" },
  { id: "IntroBrannock", unitId: "brannock", burstName: "Worldroot Aegis" },
  { id: "IntroZephyra", unitId: "zephyra", burstName: "Stormfall Volley" },
  { id: "IntroSolenne", unitId: "solenne", burstName: "Dawn Judgement" },
  { id: "IntroNyx", unitId: "nyx", burstName: "Veilbreak" },
] as const;

export function RemotionRoot() {
  return (
    <>
      <Composition id="KaelFireBurstIntro" component={KaelFireBurstIntro} durationInFrames={46} fps={30} width={430} height={760} defaultProps={{ burstName: "Cinderfall", keyArtSrc: "/units/kael.png" }} />
      {BURST_INTROS.map((intro) => (
        <Composition
          key={intro.id}
          id={intro.id}
          component={KaelFireBurstIntro}
          durationInFrames={46}
          fps={30}
          width={430}
          height={760}
          defaultProps={{ burstName: intro.burstName, keyArtSrc: `/units/${intro.unitId}.png`, unitId: intro.unitId }}
        />
      ))}
      <Composition id="StageField" component={StageMotionComposition} durationInFrames={240} fps={30} width={430} height={355} defaultProps={{ stageId: "field", stageSrc: "/stages/chapter-1-field.webp" }} />
      <Composition id="StageEmberwood" component={StageMotionComposition} durationInFrames={240} fps={30} width={430} height={355} defaultProps={{ stageId: "emberwood", stageSrc: "/stages/emberwood.webp" }} />
      <Composition id="StageCauseway" component={StageMotionComposition} durationInFrames={240} fps={30} width={430} height={355} defaultProps={{ stageId: "causeway", stageSrc: "/stages/causeway.webp" }} />
      <Composition id="StageCitadel" component={StageMotionComposition} durationInFrames={240} fps={30} width={430} height={355} defaultProps={{ stageId: "citadel", stageSrc: "/stages/citadel.webp" }} />
      <Composition id="StageReliquary" component={StageMotionComposition} durationInFrames={240} fps={30} width={430} height={355} defaultProps={{ stageId: "reliquary", stageSrc: "/stages/reliquary.webp" }} />
    </>
  );
}
