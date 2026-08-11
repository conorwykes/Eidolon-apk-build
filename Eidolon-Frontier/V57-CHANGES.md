# Gates of Azura v57

## Evolution sprite overhaul

- Added complete 2★, 3★, 4★, and 5★ sprite-sheet progressions for Kael, Lyra, Brannock, Zephyra, Solenne, and Nyx.
- Forms 2★–4★ have four separated idle frames; every 5★ form now has six combined idle frames. All forms retain four attack and four Burst frames.
- Added real 2★ form portraits, summoning odds, level caps, stat curves, and ascension costs.
- Added tier-specific attack names, Burst names, hit counts, scopes, healing, cleansing, buffs, and leader descriptions.
- Kept Zephyra's attacks ranged with bow projectiles at every tier.
- Kept Solenne's attacks ranged beams; her Burst deals no enemy damage and only heals/supports the squad.
- Lyra's visual progression culminates in a strongly water-driven 5★ form and Sovereign Moonsea Burst.

## Rarity-aware character UI

- Added 24 new full character illustrations: a matching 2★, 3★, 4★, and 5★ artwork for every playable unit.
- Added 24 matching face portraits for the battle HP/BB command panels.
- Unit archive cards, unit details, motion previews, and the five-way home squad divider now use the unit's current rarity artwork.
- Restored Lyra as the Android launcher/APK icon and PWA install icon.
- Added reproducible processing scripts and retained the editable source sheets under `public/units/rarity-art/sheets`.

## Idle animation stability fix

- Kept every 2★–4★ form on one planted pose with a subtle bottom-anchored fallback breath.
- Rebuilt all six 5★ idle animations as six-frame combined raster sheets: character and element are already flattened together, with no independently positioned runtime VFX layer.
- Locked every 5★ body to one horizontal centre and foot line. A maximum 1.2% bottom-anchored vertical compression supplies the very slight knee bend without lateral movement.
- Locked every elemental formation to its own fixed centre and ground line, then gave each unit different placement: Kael sword-side fire, Lyra lower-body water, Brannock boot/hammer roots and stone, Zephyra bow/armour lightning, Solenne staff/healing light, and Nyx scythe-side shadow.
- Expanded each loop to restrained → rising → near-peak → peak → receding → settling → restrained, removing the old peak-to-low jump.
- Gave every unit a different start phase and frame duration so the squad no longer pulses in sync.
- Kept 2★–4★ forms on one planted idle pose because their independently drawn source frames do not share exact anchors.
- Added editable six-phase VFX sources, locked character sources, combined 3×2 idle sheets, expanded 6×3 masters, an anchor/intensity manifest, and `scripts/rebuild-5star-idle-sheets.py` for reproducible generation.
- Kept the existing multi-frame attack and Burst animation sequences unchanged.
- Replaced painted-background battle face cards with tightly cropped transparent rarity sprites.
- Replaced painted pre-battle dialogue illustrations with transparent current-rarity character sprites.

## Android

- Version code: `57`
- Version name: `57.0`
- Application ID remains `game.gatesofazura.app`.
- Existing GitHub signing-secret references are unchanged.
