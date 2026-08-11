# GitHub → APK quick guide

## Debug/testing APK

No signing secrets are required.

1. Push the repository to GitHub.
2. Open **Actions** → **Build Android APK**.
3. Choose **Run workflow**, or simply push to `main`.
4. Open the completed workflow run.
5. Download the **Gates-of-Azura-v57-debug-apk** artifact.
6. Extract the artifact ZIP and install `app-debug.apk` on Android.

The APK contains the web game locally and does not depend on a hosted game URL.

## Release APK / Play Store AAB

Create a release keystore on a trusted computer, then add the four Android signing values described in `README.md` as repository Actions secrets. Run **Build Signed Android Release** manually or push a `v*` tag.

Do not commit a `.jks`, `.keystore`, passwords, service-account JSON, or other signing credentials to this repository.
