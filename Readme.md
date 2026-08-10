# Eidolon Frontier APK build

This repository contains the complete editable Eidolon Frontier game source and
the GitHub Actions workflow that packages it as a signed Android APK.

## Current version

- Game source: `Eidolon-Frontier/` (v53)
- Android application ID: `com.eidolon.frontier`
- Android `versionCode`: `53`
- Android `versionName`: `53.0`
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

Run the **Build Eidolon Frontier v53 APK** workflow from GitHub Actions. It:

1. packages a clean editable-source ZIP for backup;
2. builds the offline mobile Vite bundle;
3. wraps it as `com.eidolon.frontier`;
4. signs it with the repository's existing Android signing secrets;
5. verifies the APK signature; and
6. uploads the APK, checksum, and source backup to the `v53` GitHub Release.

The signing secret values must never be printed, replaced, removed, or
committed. Keeping the existing secrets and application ID is required for the
APK to install as an update over earlier releases.


## v53 changes

- Added the dragon-gate **Main Story** button to the home screen.
- Added the Lyra close-up artwork as the Android launcher/APK icon.
- Restored readable per-frame battle animation for all units.
- Solenne now visibly plays her full six-frame staff-cast sequence while remaining planted.
- Zephyra remains stationary during normal attacks; only her bow/projectile frames animate.
- Lowered and tightened normal/Burst attack VFX so impacts sit closer to the enemy body.
- Burst intro cut-ins now use each unit's key art with a face-focused crop.
