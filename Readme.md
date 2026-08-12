# Eidolon Frontier APK build

This repository contains the complete editable Eidolon Frontier game source and
the GitHub Actions workflow that packages it as a signed Android APK.

## Current version

- Game source: `Eidolon-Frontier/` (v59, "Gates of Azura")
- Android application ID: `com.eidolon.frontier`
- Android `versionCode`: `59`
- Android `versionName`: `59.0`
- APK workflow: `.github/workflows/Build-apk.yml`

The source in `Eidolon-Frontier/` is authoritative. Future game changes should
be made there directly; release ZIPs are backup artifacts, not the development
source of record.

## Local game development

The project requires Node.js 22.13 or newer. From `Eidolon-Frontier/`:

```bash
npm ci
npm run dev
```

The regular web deployment uses the project's Vinext/Vite/Cloudflare build.
The APK workflow creates a separate mobile Vite bundle from the same checked-in
source, rewrites packaged media paths for Android's secure WebView asset origin,
and embeds the result in a small native Android wrapper.

## Android releases

Run the **Build Eidolon Frontier v59 APK** workflow from GitHub Actions. It:

1. packages a clean editable-source ZIP for backup;
2. builds the offline mobile Vite bundle;
3. wraps it as `com.eidolon.frontier`;
4. signs it with the repository's existing Android signing secrets;
5. verifies the APK signature; and
6. uploads the APK, checksum, and source backup to the `v59` GitHub Release.

The signing secret values must never be printed, replaced, removed, or
committed. Keeping the existing secrets and application ID is required for the
APK to install as an update over earlier releases.


## v59 changes

- Rebuilt Burst timelines for all six units at every rarity (2★: 6 frames, 3★: 8, 4★: 12, 5★: 14-22 depending on unit), with progressive anticipation/action/impact/recovery poses and frame-synchronised elemental VFX.
- Completely redrew Brannock at every rarity with a compact shield/gauntlet kit in place of his old hammer; reauthored Solenne's normal-attack poses as a planted invocation.
- Fixed normal attacks cycling through only 2 of their 4 authored frames (every hit but the last was hard-coded to the same frame) — now rotates through all 4.
- Aligned every unit's `burstHits` gameplay value to its actual Burst frame count, so the animation no longer skips authored frames via a stale hit-to-frame ratio.
- Reworked Zephyra's arrows: normal-attack shots now travel to and visibly connect with the target instead of fading out mid-flight, and her Burst fires as one large piercing arrow through the whole formation instead of one arrow per target.
- Restored the pre-v58 battle pacing (a prior pass had shortened both speed settings by 25%, making normal speed read as what 2x should feel like).
- Locked the idle shadow for 5-star units to match the sprite's own motion-locked idle state, fixing a desync introduced when only the sprite (not the shadow) was locked.

## v57 changes

- Complete 2★-5★ evolution sprite-sheet progressions for all six units, each with rarity-specific stats, attack/Burst names, hit counts, and scopes.
- Rarity-aware UI: matching 2★-5★ character illustrations and face portraits used across unit cards, unit details, Burst cut-ins, and the home squad divider.
- Normal attacks are single-target at every star tier (a data bug had 5★, and Solenne's 4★, normal attacks hitting all enemies).
- Battlefield sizing, grounding, and facing direction tuned per unit per star tier so the squad reads as a consistent scale and stands on its shadow instead of floating.
- Idle animation stability fix: removed a redundant whole-body bob that fought the per-unit breathing animation, plus rebuilt 5★ idle loops as six-frame combined sheets with locked anchors.
- Restored Lyra as the Android launcher/APK icon.

## v53 changes

- Added the dragon-gate **Main Story** button to the home screen.
- Added the Lyra close-up artwork as the Android launcher/APK icon.
- Restored readable per-frame battle animation for all units.
- Solenne now visibly plays her full six-frame staff-cast sequence while remaining planted.
- Zephyra remains stationary during normal attacks; only her bow/projectile frames animate.
- Lowered and tightened normal/Burst attack VFX so impacts sit closer to the enemy body.
- Burst intro cut-ins now use each unit's key art with a face-focused crop.
