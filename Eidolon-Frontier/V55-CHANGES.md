# Gates of Azura v55

Built directly from the supplied v54 Reference Home / Pause Fix source.

## Home
- Main destination carousel is now circular: swipe left or right forever through Main Story, Rift Gate and Aether Tower.
- Dragon Gate has been renamed **Main Story**.
- Added visible **Menu** and **Settings** text buttons under the first squad slot.
- Added a top-right Arena charge counter showing charges out of 5 plus the next recharge timer.
- Energy now regenerates exactly **1 point every 2 minutes**, with a live countdown.
- Arena charges now regenerate exactly **1 charge every 15 minutes**, up to 5, with a live countdown.
- Reworked the six bottom navigation buttons (Home, Units, Town, Shop, Summon, Arena) into distinct fantasy-framed illustrated icon tiles.

## Single-screen interface
- Non-battle tabs are constrained to one portrait viewport with no page scrolling.
- Main Story is now a compact 5 x 3 stage map instead of a long scrolling quest path.
- Summon, Town, Shop, Arena, Modes, Inventory and Missions received compact single-screen layouts.

## Units / Squad Builder
- Units now opens directly into the **Squad Builder**.
- The active five-person party occupies the top third of the screen using the existing battle idle sprites.
- Each party member stands on an individually lit podium.
- Tap a podium to choose a slot, then tap any unlocked unit below to assign/swap it.
- The unlocked roster reads directly from `save.owned`, so newly summoned units automatically appear in the roster.

## Menu / Settings
- Added a functional Menu overlay with Main Story, Rift & Tower, Inventory, Missions, Squad Builder and Install Game shortcuts.
- Existing Settings functionality remains intact and is compacted into a no-scroll overlay with audio sliders and gameplay-effect toggles.

## Background behaviour
- Preserves v54 background handling: soundtrack AudioContext suspends when hidden, CSS animations pause, and battle timing does not progress while the app/tab is backgrounded.
