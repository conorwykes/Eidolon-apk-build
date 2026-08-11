# Lyra evolution sprite sheets

These are the authored animation sources for Lyra's 2★–5★ progression.

- `sheets/lyra-2-master-sheet.png`: Brookblade Novice — physical footwork and silver moonlight.
- `sheets/lyra-3-master-sheet.png`: Tide Initiate — rill-dance attacks and compact droplets.
- `sheets/lyra-4-master-sheet.png`: Moonwater Adept — armoured aerial cuts and a focused cascade.
- `sheets/lyra-5-master-sheet.png`: Tide Dancer — water-wreathed idle motion, wave-dash attacks, and Sovereign Moonsea.

Every transparent master sheet is a 4×3 grid. The rows are idle, normal attack,
and burst; the four frames in each row advance from left to right. Frames have
large empty gutters so adjacent drawings never touch or bleed into one another.

Run `python scripts/split-lyra-evolution-sheets.py` from the project root after
editing a sheet. It detects the transparent gutters rather than assuming every
generated row has identical pixel height, then creates 512×512 lossless WebP
runtime frames under `frames/<stars>/` while preserving the source-cell padding.

The new sheets were generated with the built-in image-generation workflow using
the existing Lyra art as identity/style reference, then converted from a flat
magenta chroma background to alpha before slicing.
