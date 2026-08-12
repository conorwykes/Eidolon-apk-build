"""Replace one fixed 512px animation row in an existing master sheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_SIZE = 512


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path)
    parser.add_argument("row_source", type=Path)
    parser.add_argument("--row", type=int, required=True, choices=(0, 1, 2))
    parser.add_argument("--runtime-dir", type=Path)
    args = parser.parse_args()

    master = Image.open(args.master).convert("RGBA")
    row = Image.open(args.row_source).convert("RGBA")
    if row.height != FRAME_SIZE or row.width % FRAME_SIZE:
        raise ValueError(f"{args.row_source}: expected a fixed 512px-cell row")
    if row.width > master.width:
        raise ValueError(f"{args.row_source}: row is wider than {args.master}")

    blank = Image.new("RGBA", (master.width, FRAME_SIZE), (0, 0, 0, 0))
    blank.alpha_composite(row, (0, 0))
    master.paste(blank, (0, args.row * FRAME_SIZE))
    master.save(args.master, "PNG", optimize=True)
    if args.runtime_dir:
        animation = ("idle", "attack", "burst")[args.row]
        args.runtime_dir.mkdir(parents=True, exist_ok=True)
        for column in range(row.width // FRAME_SIZE):
            frame = row.crop((column * FRAME_SIZE, 0, (column + 1) * FRAME_SIZE, FRAME_SIZE))
            frame.save(
                args.runtime_dir / f"{animation}-{column + 1}.webp",
                "WEBP",
                lossless=True,
                method=6,
                exact=True,
            )
    print(f"Replaced row {args.row} in {args.master}")


if __name__ == "__main__":
    main()
