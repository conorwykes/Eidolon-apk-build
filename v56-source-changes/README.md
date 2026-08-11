# v56 source changes

Drop-in replacement files for the `Gates-of-Azura-v56-Source-for-GitHub.zip`
asset attached to the [v56 release](https://github.com/conorwykes/Eidolon-apk-build/releases/tag/v56).

The GitHub MCP tools available in this session can't upload/replace release
assets directly, so the full rebuilt zip is included in this folder as
`Gates-of-Azura-v56-Source-for-GitHub.zip` (identical filename to the release
asset — download it from this branch and re-upload it to the release). The
individual files below are included for review/diff purposes and mirror
exactly what's inside that zip:

- `app/page.tsx`
- `app/globals.css`
- `public/backgrounds/home-portal.webp` (new file)
- `public/ui/icons/nav-home-house.png`, `nav-town-house.png`, `nav-units-swords.png`,
  `nav-shop-chest.png`, `nav-summon-gate.png`, `nav-arena-coliseum.png` (new files)

## What changed

1. **Home menu swipe** — the destination carousel drag was clamped to a fixed
   ±110px regardless of screen width, so it never tracked a finger past a
   fraction of a slide before snapping. It now tracks 1:1 up to the slide's
   actual on-screen width and releases based on drag distance/flick velocity.
2. **Home background** — added the supplied artwork as `public/backgrounds/home-portal.webp`
   and pointed the home screen background at it in `globals.css`.
3. **Unit details** — holding a unit box in the Squad Builder's "Unlocked
   Units" grid now opens a unit detail overlay (stats, leader skill, burst,
   equipped relic, motion preview, train/ascend actions). The CSS for this
   screen (`.unit-detail`, `.detail-hero`, `.stat-grid`, etc.) and the state/
   functions it needed (`selectedUnitId`, `trainUnit`, `ascendUnit`) already
   existed in the source but were orphaned — nothing rendered them. This
   wires them back up as a modal, reachable by a ~480ms hold.
4. **Title screen** — added a loading screen (preloads every hero's 5-star
   art) that hands off to a click-to-start splash built from a collage of
   all 6 heroes' 5-star art, shown once per app load before the home screen
   is reachable.
5. **Squad podium sizing** — the squad screen's 5 podium slots were
   `clamp(160px, 32%, 220px)` tall; reduced to `clamp(118px, 23%, 158px)`.
6. **Bottom nav icons** — replaced the lucide glyphs/placeholder art with 6
   supplied isometric illustrations (house, bigger house, crossed swords,
   chest, rift portal, coliseum) for Home/Town/Units/Shop/Summon/Arena.
   Each was background-removed (a per-row edge-sampled color distance mask,
   flood-filled from the image border so only the true background is
   stripped, not similarly-dark interior shading) and cropped to a padded
   256×256 transparent PNG. The per-button boxed background/border
   (`.nav-icon-frame`) was also stripped so the 6 icons sit directly on the
   nav bar's own shared background instead of each having its own dark box
   — reads as one continuous bar instead of 6 separate buttons. Active tab
   now shows a small glowing underline instead of a bordered box.

## To apply this to the release

Download the zip sent in chat and re-upload it to the v56 release
(same filename, "Overwrite existing file" prompt), or copy these 3 files
over the same paths inside the existing release zip and re-zip it.
