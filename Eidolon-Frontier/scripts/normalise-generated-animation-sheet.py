"""Normalise a generated alpha animation grid into fixed 512px runtime cells.

The image-generation source keeps one actor in every equal cell.  This importer
uses one shared scale for the complete sheet, centres every figure on the same
horizontal body anchor, and places every foot line on the same ground anchor.
The result remains an editable master sheet while also being safe for the
runtime slicer: no frame is independently resized or allowed to drift.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_SIZE = 512
SAFE_WIDTH = 414
SAFE_HEIGHT = 404
BODY_CENTER_X = 256
FOOT_LINE_Y = 454


def clear_invisible_rgb(image: Image.Image) -> Image.Image:
    output = image.convert("RGBA")
    alpha = output.getchannel("A").point(lambda value: 0 if value <= 8 else value)
    output.putalpha(alpha)
    output.paste((0, 0, 0, 0), mask=alpha.point(lambda value: 255 if value == 0 else 0))
    return output


def split_equal_grid(sheet: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(columns * rows):
        column = index % columns
        row = index // columns
        left = round(column * sheet.width / columns)
        right = round((column + 1) * sheet.width / columns)
        top = round(row * sheet.height / rows)
        bottom = round((row + 1) * sheet.height / rows)
        frame = clear_invisible_rgb(sheet.crop((left, top, right, bottom)))
        if not frame.getchannel("A").getbbox():
            raise ValueError(f"Generated cell {column + 1},{row + 1} is empty")
        frames.append(frame)
    return frames


def normalise(input_path: Path, output_path: Path, columns: int, rows: int) -> None:
    sheet = clear_invisible_rgb(Image.open(input_path))
    frames = split_equal_grid(sheet, columns, rows)
    bounds = [frame.getchannel("A").getbbox() for frame in frames]
    assert all(bounds)
    max_width = max(right - left for left, _top, right, _bottom in bounds if bounds)
    max_height = max(bottom - top for _left, top, _right, bottom in bounds if bounds)
    scale = min(SAFE_WIDTH / max_width, SAFE_HEIGHT / max_height)

    master = Image.new(
        "RGBA",
        (columns * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    for index, (frame, bounds) in enumerate(zip(frames, bounds, strict=True)):
        assert bounds
        crop = frame.crop(bounds)
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        actor = crop.resize((width, height), Image.Resampling.LANCZOS)
        cell = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        cell.alpha_composite(actor, (BODY_CENTER_X - width // 2, FOOT_LINE_Y - height))
        master.alpha_composite(
            cell,
            ((index % columns) * FRAME_SIZE, (index // columns) * FRAME_SIZE),
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    master.save(output_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, default=3)
    args = parser.parse_args()
    normalise(args.input, args.output, args.columns, args.rows)
    print(f"Normalised {args.columns}x{args.rows} sheet: {args.output}")


if __name__ == "__main__":
    main()
