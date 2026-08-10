# Gates of Azura — Android and Google Play handoff

The game is already configured as a portrait-first Progressive Web App:

- standalone Android display mode and portrait orientation
- 192 px and 512 px app icons, including a maskable icon
- offline caching through a service worker
- touch-sized controls and swipe-up Burst input
- device-local save data with no account required

## Recommended release format

Package the production URL as a Trusted Web Activity (TWA). This creates a signed Android App Bundle while preserving the same game code and save behaviour used by the installable web app.

Before packaging, choose a permanent Android package identifier such as `game.gatesofazura.app`. Changing it after release creates a different Play app.

## Release sequence

1. Create the release app in the owner’s Google Play Console account.
2. Generate and securely retain the release signing key.
3. Use Bubblewrap or PWABuilder to import the production web manifest and create the Android project.
4. Add the signing certificate’s SHA-256 fingerprint to `/.well-known/assetlinks.json` on the production site.
5. Build a signed `.aab`, test it through Play’s internal-testing track, then promote the tested build.
6. Complete the store listing, content rating, target audience, privacy-policy, and Data safety forms using the game’s actual release behaviour.

## Current data behaviour

This prototype stores progress only in the player’s local browser/app storage. It does not currently include accounts, advertising, analytics, real-money purchases, or transmission of player data to a game backend. Reassess the privacy and Data safety answers before release if any of those systems are added.

## Items that require the owner

- Google Play developer account and legal/business details
- final package identifier and public developer name
- release signing-key custody
- store copy, screenshots, support email, and privacy-policy URL
- approval of the final public release
