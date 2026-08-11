# Evolution sprite sources

Each `<unit>-evolution/sheets` directory contains the editable 4×3 PNG master sheets for that hero's 2★, 3★, 4★, and 5★ forms.

- Row 1: idle frames 1–4
- Row 2: attack frames 1–4
- Row 3: Burst frames 1–4
- Every cell includes a large safety gutter so weapons and VFX do not overlap adjacent frames.

Runtime assets are lossless 512×512 WebP files under `<unit>-evolution/frames/<stars>`. Rebuild every runtime frame and 2★ form portrait with:

```powershell
python scripts/split-evolution-sheets.py
```

The script removes the generation chroma background, cleans edge spill, preserves padding, and writes all 288 frames.

## Combat direction

- Kael: melee Fire greatsword progression.
- Lyra: melee Tide blades; water becomes dominant at 5★.
- Brannock: melee Grove hammer and defensive earth/root Bursts.
- Zephyra: ranged bow attacks only.
- Solenne: ranged light-beam attacks; Burst row is healing/support only.
- Nyx: melee Veil scythe and void/eclipsed-moon Bursts.
