# Gates of Azura — Android / Google Play handoff (v58)

The repository now contains an **offline native Android wrapper** under `android/`.

The wrapper does not load the game from a website. GitHub Actions first builds a standalone Vite version of the existing React game, copies that bundle into the Android app assets, and then packages the whole game as an APK/AAB.

## Android configuration

- package/application ID: `com.eidolon.frontier`
- debug application ID: `com.eidolon.frontier.debug`
- version code: `58`
- version name: `58.0`
- minimum SDK: API 24
- target/compile SDK: API 36
- portrait orientation
- Java 17 / Android Gradle Plugin 8.11.1 / Gradle 8.13

## Testing APK

Use the `Build Android APK` GitHub Actions workflow. It creates a debug APK and uploads it as a workflow artifact. No signing secrets are needed for this testing build.

## Play Store build

The `Build Signed Android Release` workflow creates:

- `app-release.apk`
- `app-release.aab`

It requires these GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The signing key is intentionally not included in the repository. Keep it outside source control and back it up securely.

## Current data behaviour

Progress is stored locally on the device. The current game source does not require a player account or remote game backend. Reassess privacy/Data safety declarations before a public release if analytics, advertising, purchases, accounts, cloud saves, or any player-data transmission are added later.

## Owner-controlled release items

A public Play Store launch still requires the owner's Google Play developer account, legal/developer details, release-key custody, store listing, screenshots, support/privacy URLs, content-rating answers, and final release approval.
