# Gates of Azura v58

## Progressive Burst animation rebuild

- Rebuilt Burst timelines for Kael, Lyra, Brannock, Zephyra, Solenne and Nyx at every implemented rarity.
- 2-star forms use 6 gameplay frames, 3-star forms use 8, and 4-star forms use 12.
- 5-star forms use longer signature timelines: Kael 16, Lyra 16, Brannock 14, Zephyra 20, Solenne 14 and Nyx 22.
- Added progressive anticipation, action, impact and recovery poses rather than abrupt pose changes.
- Preserved each form's final idle pixels as the last Burst frame so leaps and large movements return to the exact battle anchor.
- Refined Kael's grounded takeoff, aerial sword descent and phoenix-free recovery.
- Refined Zephyra's escalating bow charge, full-strength released lightning arrow and natural recoil.
- Toned down Solenne's complete non-attacking healing sequence while retaining a clear build, controlled peak and regression.
- Removed incompatible background set pieces from recovery poses and kept all runtime sprites transparent.

## Five-star Burst VFX

- Restored and retained the named character cinematic that introduces every Burst.
- Removed the older generic Burst overlay and Kael's separate looping fullscreen ember playover.
- Added frame-synchronised, contact-anchored VFX for every 5-star unit using filled elemental artwork rather than thin guide strokes.
- Kael uses a broad fire crescent with flame bodies and embers; Lyra uses looping water swirls, thick tide ribbons and droplets.
- Brannock uses a hammer wake, ground rupture and thrown rock; Zephyra uses a charged arrow wrapped in branching lightning.
- Solenne uses restrained petal-like healing spirals at each party member's feet and remains completely non-attacking.
- Nyx uses a filled scythe crescent, orbiting void charge and a rift that visibly collapses during regression.
- Each effect grows, reaches contact and regresses with its sprite sheet instead of cutting directly from full intensity to zero.

## Runtime and Android

- Burst damage hits now advance through the longer action timeline and play non-damaging transition/recovery frames between hit packets.
- Android application ID remains `com.eidolon.frontier`.
- Android version is now versionCode 58 / versionName 58.0.
- GitHub Actions continues to use the existing permanent signing-secret names without storing signing credentials in source.
