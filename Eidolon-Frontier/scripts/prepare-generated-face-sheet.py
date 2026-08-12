"""Convert a four-panel chroma-key portrait sheet into transparent battle faces."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps


FRAME_SIZE = 512


def remove_magenta_chroma(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255
    rgb = rgba[:, :, :3]
    distance = np.maximum.reduce((1 - rgb[:, :, 0], rgb[:, :, 1], 1 - rgb[:, :, 2]))
    matte = np.clip((distance - 42 / 255) / ((110 - 42) / 255), 0, 1)
    safe_matte = np.maximum(matte, 1 / 255)
    magenta = np.array([1, 0, 1], dtype=np.float32)
    unmatted = np.clip((rgb - (1 - matte[:, :, None]) * magenta) / safe_matte[:, :, None], 0, 1)
    alpha = rgba[:, :, 3] * matte
    output = np.dstack((unmatted, alpha))
    output[alpha <= 0.02] = 0
    return Image.fromarray(np.round(output * 255).astype(np.uint8), "RGBA")


def prepare(input_path: Path, output_dir: Path, unit_id: str) -> None:
    sheet = Image.open(input_path).convert("RGBA")
    transparent = remove_magenta_chroma(sheet)
    output_dir.mkdir(parents=True, exist_ok=True)
    for index, stars in enumerate((2, 3, 4, 5)):
        left = round(index * transparent.width / 4)
        right = round((index + 1) * transparent.width / 4)
        panel = transparent.crop((left, 0, right, transparent.height))
        if not panel.getchannel("A").getbbox():
            raise ValueError(f"{stars}-star portrait is empty")
        # The generated faces share one eye line and scale. A constant square
        # crop preserves that consistency; fitting individual alpha bounds
        # would make heavier 5-star shoulder armour shrink the actual face.
        crop_size = min(panel.width - 28, round(panel.height * 0.61))
        center_x = panel.width // 2
        top = round(panel.height * 0.15)
        frame = panel.crop((
            center_x - crop_size // 2,
            top,
            center_x - crop_size // 2 + crop_size,
            top + crop_size,
        )).resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
        frame.save(output_dir / f"{unit_id}-{stars}.webp", "WEBP", lossless=True, method=6, exact=True)

    units = ("kael", "lyra", "brannock", "zephyra", "solenne", "nyx")
    contact = Image.new("RGB", (160 * 8, 160 * 3), "#05080d")
    draw = ImageDraw.Draw(contact)
    for index, path in enumerate(output_dir / f"{unit}-{stars}.webp" for unit in units for stars in (2, 3, 4, 5)):
        with Image.open(path) as portrait:
            preview = ImageOps.fit(portrait.convert("RGBA"), (160, 160), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", (160, 160), "#05080d")
        tile.alpha_composite(preview)
        x = (index % 8) * 160
        y = (index // 8) * 160
        contact.paste(tile.convert("RGB"), (x, y))
        draw.rectangle((x, y, x + 159, y + 159), outline="#d7b967", width=2)
    contact.save(output_dir / "battle-faces-contact.webp", "WEBP", quality=90, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    root = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=root / "public" / "units" / "battle-faces" / "sheets" / "brannock-battle-faces-source.png",
    )
    parser.add_argument(
        "output_dir",
        nargs="?",
        type=Path,
        default=root / "public" / "units" / "battle-faces",
    )
    parser.add_argument("unit_id", nargs="?", default="brannock")
    args = parser.parse_args()
    prepare(args.input, args.output_dir, args.unit_id)
    print(f"Prepared transparent 2-5 star battle faces for {args.unit_id}")


if __name__ == "__main__":
    main()
