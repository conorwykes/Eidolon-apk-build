# Evolution sprite sources

Each `<unit>-evolution/sheets` directory contains editable PNG master sheets for that hero's 2★, 3★, 4★, and 5★ forms.

- Row 1: idle frames 1–4 for 2★–4★; idle frames 1–6 for 5★
- Row 2: attack frames 1–4
- Row 3: Burst frames 1–4
- Every cell includes a large safety gutter so weapons and VFX do not overlap adjacent frames.
- Each 5★ directory also contains `<unit>-5-idle-sheet.png`, a 3×2 sheet whose six cells already combine the character and elemental art.

Runtime assets are lossless 512×512 WebP files under `<unit>-evolution/frames/<stars>`. Rebuild every runtime frame and 2★ form portrait with:

```powershell
python scripts/split-evolution-sheets.py
```

The 5★ idle rows are generated from one anchored body source and a six-phase
element source, then flattened into complete combined frames. Rebuild those six
master sheets and their 36 idle runtime frames with:

```powershell
python scripts/rebuild-5star-idle-sheets.py
```

Editable character/VFX sources and the verified phase/anchor manifest live in
`public/sprites/units/idle-vfx-sources`. The loop order is restrained, rising,
near-peak, peak, receding, settling, then back to restrained. Each body keeps
one horizontal centre and foot line while a maximum 1.2% compression supplies
the knee bend. Each effect keeps a fixed centre and ground line. Attack and
Burst rows are not changed by the 5★ idle rebuild.

The scripts remove generation chroma, clean edge spill, preserve padding, and write the runtime frames.

## Combat direction

- Kael: melee Fire greatsword progression.
- Lyra: melee Tide blades; water becomes dominant at 5★.
- Brannock: melee Grove hammer and defensive earth/root Bursts.
- Zephyra: ranged bow attacks only.
- Solenne: ranged light-beam attacks; Burst row is healing/support only.
- Nyx: melee Veil scythe and void/eclipsed-moon Bursts.
