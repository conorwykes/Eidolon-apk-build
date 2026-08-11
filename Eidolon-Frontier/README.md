# Gates of Azura v57

Gates of Azura is a portrait-first squad RPG built with React, Vite/Vinext and Remotion-powered battle effects.

This repository contains the complete editable v57 game source plus an **offline Android wrapper** and GitHub Actions workflows that can build an installable APK automatically.

## Run the web game locally

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

## Build the normal web deployment

```bash
npm run build
```

## Build the standalone mobile web bundle

The mobile bundle reuses the same `app/page.tsx`, game logic, CSS and `public/` assets. It does not maintain a second copy of the game.

```bash
npm ci
npm run build:mobile
```

Output: `dist-mobile/`

## Prepare assets for Android

```bash
npm run android:prepare
```

This builds the standalone web bundle and copies it into `android/app/src/main/assets/www/` for the native Android WebView shell.

## GitHub APK build

The repository includes `.github/workflows/build-apk.yml`.

On every push to `main` (or a manual workflow run), GitHub Actions will:

1. install the locked Node dependencies;
2. build the offline mobile bundle;
3. copy the complete game into the Android app;
4. install the Android 36 SDK;
5. build an Android debug APK; and
6. upload `Gates-of-Azura-v57-debug-apk` as a downloadable workflow artifact.

The debug APK does **not** need a hosted website: the game and its assets are bundled inside the APK.

## Android identity

- Application ID: `game.gatesofazura.app`
- Debug ID: `game.gatesofazura.app.debug`
- Version code: `57`
- Version name: `57.0`
- Orientation: portrait
- Minimum Android: API 24 (Android 7.0)
- Target/compile SDK: API 36

## Signed releases

`.github/workflows/build-release.yml` can produce a signed release APK and Play Store AAB after these GitHub Actions secrets are configured:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

A tag such as `v57.0` will also attach the signed APK/AAB to a GitHub Release.

**Keep the release keystore and passwords private.** Losing the release key can prevent future updates to the same Play Store app identity.

## Important source locations

- `app/page.tsx` — main game/UI
- `app/globals.css` — game styling
- `game/` — battle timing/choreography
- `public/` — unit art, stages, destinations, audio and icons
- `remotion/` — animated battle VFX
- `mobile/` — standalone Vite entry point used by the APK
- `android/` — native offline Android shell
- `.github/workflows/` — automatic APK/release builds

## Save behaviour

Progress remains device-local using the game's browser storage. The Android wrapper uses a stable local HTTPS origin (`appassets.androidplatform.net`) so WebView storage persists between launches and updates under the same app ID.
