"""Rebuild one evolution master sheet from its existing fixed runtime frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_SIZE = 512


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("unit")
    parser.add_argument("stars", type=int, choices=(2, 3, 4, 5))
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    unit_root = project_root / "public" / "sprites" / "units" / f"{args.unit}-evolution"
    frame_root = unit_root / "frames" / str(args.stars)
    columns = 6 if args.stars == 5 else 4
    master = Image.new("RGBA", (columns * FRAME_SIZE, 3 * FRAME_SIZE), (0, 0, 0, 0))
    for row, animation in enumerate(("idle", "attack", "burst")):
        frame_count = 6 if args.stars == 5 and animation == "idle" else 4
        for column in range(frame_count):
            frame = Image.open(frame_root / f"{animation}-{column + 1}.webp").convert("RGBA")
            if frame.size != (FRAME_SIZE, FRAME_SIZE):
                raise ValueError(f"{animation}-{column + 1}: expected a 512px runtime frame")
            master.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))

    output = unit_root / "sheets" / f"{args.unit}-{args.stars}-master-sheet.png"
    master.save(output, "PNG", optimize=True)
    print(f"Rebuilt fixed master: {output}")


if __name__ == "__main__":
    main()
