"""Build rarity-scaled, progressive Burst animation frames for every unit.

The original evolution sheets contain four Burst drawings at every rarity.
That is enough for a short normal attack, but a long Burst has to jump between
those poses for eight to eighteen damage beats.  This builder creates a longer
timeline for each form and always ends on the form's exact anchored idle frame.

2/3/4-star forms retain their authored costumes and elemental drawings while
gaining motion-blurred in-betweens.  The 5-star forms use the new eight-pose
signature sheets as their key animation before being expanded to their full
unit-specific cinematic length.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SPRITE_ROOT = PROJECT_ROOT / "public" / "sprites" / "units"
SOURCE_ROOT = SPRITE_ROOT / "progressive-burst-sources"
FRAME_SIZE = 512
UNITS = ("kael", "lyra", "brannock", "zephyra", "solenne", "nyx")
RARITY_COUNTS = {2: 6, 3: 8, 4: 12}
FIVE_STAR_COUNTS = {
    "kael": 16,
    "lyra": 16,
    "brannock": 14,
    "zephyra": 20,
    "solenne": 14,
    "nyx": 22,
}


def runtime_root(unit_id: str, stars: int) -> Path:
    return SPRITE_ROOT / f"{unit_id}-evolution" / "frames" / str(stars)


def clear_invisible_rgb(image: Image.Image) -> Image.Image:
    output = image.convert("RGBA")
    alpha = output.getchannel("A").point(lambda value: 0 if value <= 8 else value)
    output.putalpha(alpha)
    output.paste((0, 0, 0, 0), mask=alpha.point(lambda value: 255 if value == 0 else 0))
    return output


def load_runtime(path: Path) -> Image.Image:
    image = clear_invisible_rgb(Image.open(path))
    if image.size != (FRAME_SIZE, FRAME_SIZE):
        raise ValueError(f"{path}: expected a 512x512 runtime frame, got {image.size}")
    return image


def split_grid(path: Path, columns: int, rows: int) -> list[Image.Image]:
    sheet = clear_invisible_rgb(Image.open(path))
    frames: list[Image.Image] = []
    for index in range(columns * rows):
        column = index % columns
        row = index // columns
        left = round(column * sheet.width / columns)
        right = round((column + 1) * sheet.width / columns)
        top = round(row * sheet.height / rows)
        bottom = round((row + 1) * sheet.height / rows)
        cell = sheet.crop((left, top, right, bottom))
        # Preserve the cell's authored coordinate system.  In particular, an
        # airborne pose must remain above the planted ground line instead of
        # being independently bottom-aligned like a portrait crop.
        scale = min(FRAME_SIZE / cell.width, FRAME_SIZE / cell.height)
        width = max(1, round(cell.width * scale))
        height = max(1, round(cell.height * scale))
        resized = cell.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(resized, ((FRAME_SIZE - width) // 2, (FRAME_SIZE - height) // 2))
        frames.append(clear_invisible_rgb(canvas))
    return frames


def ease(value: float) -> float:
    return value * value * (3 - 2 * value)


def motion_blend(first: Image.Image, second: Image.Image, amount: float) -> Image.Image:
    """Create a readable in-between with a restrained directional afterimage."""
    amount = ease(amount)
    if amount <= 0:
        return first.copy()
    if amount >= 1:
        return second.copy()

    # The cross-pose afterimage is deliberately faint.  At the game's small
    # battle scale it reads as continuous weapon/hair travel, not two actors.
    primary = Image.blend(first, second, amount)
    ghost_source = first if amount >= 0.5 else second
    ghost_alpha = ghost_source.getchannel("A").point(
        lambda value: round(value * (0.10 + 0.08 * (1 - abs(amount - 0.5) * 2)))
    )
    ghost = ghost_source.copy()
    ghost.putalpha(ghost_alpha)
    direction = 3 if amount >= 0.5 else -3
    primary.alpha_composite(ghost, (direction, -1))
    return clear_invisible_rgb(primary)


def resample(keys: list[Image.Image], count: int) -> list[Image.Image]:
    if len(keys) < 2:
        raise ValueError("A Burst timeline needs at least two keyframes")
    frames: list[Image.Image] = []
    for index in range(count):
        position = index * (len(keys) - 1) / (count - 1)
        lower = min(len(keys) - 1, math.floor(position))
        upper = min(len(keys) - 1, lower + 1)
        frames.append(motion_blend(keys[lower], keys[upper], position - lower))
    # Never synthesize the last frame.  This is the exact idle source used by
    # the battle renderer, guaranteeing the original foot anchor on return.
    frames[-1] = keys[-1].copy()
    return frames


def save_editable_sheet(unit_id: str, stars: int, frames: list[Image.Image]) -> Path:
    columns = 4 if len(frames) > 6 else 3
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * FRAME_SIZE, (index // columns) * FRAME_SIZE))
    path = SOURCE_ROOT / f"{unit_id}-{stars}-burst-{len(frames)}frame-alpha.png"
    sheet.save(path, "PNG", optimize=True)
    return path


def build_form(unit_id: str, stars: int) -> dict[str, object]:
    output_root = runtime_root(unit_id, stars)
    anchored_idle = load_runtime(output_root / "idle-1.webp")
    if stars == 5:
        source_path = SOURCE_ROOT / f"{unit_id}-5-burst-8phase-alpha.png"
        keys = split_grid(source_path, 4, 2)
        count = FIVE_STAR_COUNTS[unit_id]
    else:
        keys = [load_runtime(output_root / f"burst-{index}.webp") for index in range(1, 5)]
        count = RARITY_COUNTS[stars]

    # Two recovery keys ease the signature effect down before the exact idle
    # anchor returns.  Higher rarities get more interpolated poses between all
    # keys, not just a slower hold on the same four drawings.
    recovery_blend = motion_blend(keys[-1], anchored_idle, 0.48)
    timeline = resample([*keys, recovery_blend, anchored_idle], count)
    for index, frame in enumerate(timeline, start=1):
        frame.save(output_root / f"burst-{index}.webp", "WEBP", lossless=True, method=6, exact=True)

    # Remove obsolete longer frames when rerunning with a changed count.
    for path in output_root.glob("burst-*.webp"):
        try:
            index = int(path.stem.split("-")[-1])
        except ValueError:
            continue
        if index > count:
            path.unlink()

    sheet_path = save_editable_sheet(unit_id, stars, timeline)
    final_matches_idle = (output_root / f"burst-{count}.webp").read_bytes() == (output_root / "idle-1.webp").read_bytes()
    # WEBP encoders can produce different container bytes for identical pixels;
    # compare decoded pixels for the actual anchor invariant.
    final_pixels_match = list(load_runtime(output_root / f"burst-{count}.webp").getdata()) == list(anchored_idle.getdata())
    if not final_pixels_match:
        raise ValueError(f"{unit_id} {stars}★ did not finish on its anchored idle frame")
    return {
        "unit": unit_id,
        "stars": stars,
        "frameCount": count,
        "editableSheet": sheet_path.relative_to(PROJECT_ROOT).as_posix(),
        "finalFrameMatchesIdlePixels": final_pixels_match,
        "finalFrameMatchesIdleBytes": final_matches_idle,
    }


def main() -> None:
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    forms = [build_form(unit_id, stars) for unit_id in UNITS for stars in (2, 3, 4, 5)]
    manifest = {
        "description": "Progressive rarity-scaled Burst timelines; final frame is the exact anchored idle pose.",
        "rarityFrameCounts": {"2": 6, "3": 8, "4": 12, "5": FIVE_STAR_COUNTS},
        "forms": forms,
    }
    manifest_path = SOURCE_ROOT / "progressive-burst-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {sum(form['frameCount'] for form in forms)} runtime frames across {len(forms)} forms.")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
