# Gates of Azura v54

Home-screen revision based on the supplied visual reference.

- Rebuilt the Home header with **Gates of Azura** centred at the top.
- Player name is shown at top-left with no character portrait.
- Restored the five-way current squad divider.
- Squad divider uses the same full key-art illustrations used by the Unit screen, not battle sprites.
- Replaced the old full-screen destination presentation and separate Main Story button with one compact swipe carousel.
- Carousel destinations are **Dragon Gate**, **Rift Gate**, and **Aether Tower**.
- Destination cards contain only their artwork and name; descriptive copy/action text was removed from Home.
- Cards are intentionally small/medium sized, with the active card centred and neighbouring cards peeking in from each side.
- Added a dedicated cropped Dragon Gate card asset so the old baked-in “Main Story” plaque is not shown.
- Added app-background pausing: soundtrack AudioContext is suspended on `visibilitychange`/`pagehide`, CSS animations are paused, and battle wait timing does not continue while the app/tab is hidden.

Existing battle systems, unit data, progression, saves, and other screens remain in place.
