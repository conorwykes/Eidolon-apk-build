"""Split generated rarity art sheets and prepare Android/PWA launcher icons.

The sheet order is always 2-star, 3-star, 4-star, then 5-star.  Outputs are
kept large enough for the unit dossier and narrow five-panel home showcase;
the battle portraits are deliberate head-and-shoulders crops of the same art.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
UNITS = ("kael", "lyra", "brannock", "zephyra", "solenne", "nyx")
STARS = (2, 3, 4, 5)
SHEET_DIR = ROOT / "public" / "units" / "rarity-art" / "sheets"
ART_DIR = ROOT / "public" / "units" / "rarity-art"
FACE_DIR = ROOT / "public" / "units" / "battle-faces"


def runs(values: np.ndarray) -> list[tuple[int, int]]:
    found: list[tuple[int, int]] = []
    start: int | None = None
    for index, value in enumerate(values.tolist() + [False]):
        if value and start is None:
            start = index
        elif not value and start is not None:
            found.append((start, index))
            start = None
    return found


def panel_bounds(image: Image.Image) -> list[tuple[int, int]]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    # Generated sheets use full-height pure-black gutters. Requiring almost
    # every pixel in a column to be dark avoids confusing Nyx's night sky or
    # Kael's volcanic scenery with a divider.
    dark_fraction = (rgb.max(axis=2) <= 8).mean(axis=0)
    candidates = [
        (start, end)
        for start, end in runs(dark_fraction >= 0.985)
        if end - start >= 10 and start > image.width * 0.08 and end < image.width * 0.92
    ]
    if len(candidates) < 3:
        quarter = image.width / 4
        return [(round(index * quarter), round((index + 1) * quarter)) for index in range(4)]

    # There should be exactly three separators. If a dark illustration adds a
    # fourth candidate, favour the broadest three and restore left-to-right order.
    gutters = sorted(sorted(candidates, key=lambda item: item[1] - item[0], reverse=True)[:3])
    return [
        (0, gutters[0][0]),
        (gutters[0][1], gutters[1][0]),
        (gutters[1][1], gutters[2][0]),
        (gutters[2][1], image.width),
    ]


def make_face_crop(art: Image.Image, unit: str) -> Image.Image:
    # Faces were intentionally composed at the upper quarter in every sheet.
    # This crop keeps hair, face and a little shoulder silhouette while making
    # the character readable in the battle deck's 46-52px portrait slot.
    crop_size = 390
    center_x = art.width // 2
    # Nyx is composed beneath a large eclipse/scythe arc, so his face sits
    # lower than the other five heroes in every rarity panel.
    center_y = round(art.height * (0.32 if unit == "nyx" else 0.245))
    face = art.crop((
        center_x - crop_size // 2,
        center_y - crop_size // 2,
        center_x + crop_size // 2,
        center_y + crop_size // 2,
    ))
    return face.resize((512, 512), Image.Resampling.LANCZOS)


def build_contact(images: list[Image.Image], width: int, height: int, columns: int) -> Image.Image:
    rows = (len(images) + columns - 1) // columns
    contact = Image.new("RGB", (width * columns, height * rows), "#05080d")
    draw = ImageDraw.Draw(contact)
    for index, image in enumerate(images):
        x = (index % columns) * width
        y = (index // columns) * height
        contact.paste(ImageOps.fit(image.convert("RGB"), (width, height), Image.Resampling.LANCZOS), (x, y))
        draw.rectangle((x, y, x + width - 1, y + height - 1), outline="#d7b967", width=2)
    return contact


def prepare_rarity_art() -> None:
    ART_DIR.mkdir(parents=True, exist_ok=True)
    FACE_DIR.mkdir(parents=True, exist_ok=True)
    art_preview: list[Image.Image] = []
    face_preview: list[Image.Image] = []

    for unit in UNITS:
        with Image.open(SHEET_DIR / f"{unit}-rarity-ui-sheet.png") as sheet_source:
            sheet = sheet_source.convert("RGB")
        bounds = panel_bounds(sheet)
        if len(bounds) != 4:
            raise RuntimeError(f"Expected four panels for {unit}, got {bounds}")

        for stars, (left, right) in zip(STARS, bounds, strict=True):
            # Remove the final few pixels of divider while retaining the
            # painted background at both edges.
            inset = max(2, round((right - left) * 0.008))
            panel = sheet.crop((left + inset, 0, right - inset, sheet.height))
            art = ImageOps.fit(
                panel,
                (720, 1280),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            face = make_face_crop(art, unit)
            art.save(ART_DIR / f"{unit}-{stars}.webp", "WEBP", quality=92, method=6)
            face.save(FACE_DIR / f"{unit}-{stars}.webp", "WEBP", quality=94, method=6)
            art_preview.append(art.copy())
            face_preview.append(face.copy())

    build_contact(art_preview, 180, 320, 8).save(
        ART_DIR / "rarity-art-contact.webp", "WEBP", quality=88, method=6
    )
    build_contact(face_preview, 160, 160, 8).save(
        FACE_DIR / "battle-faces-contact.webp", "WEBP", quality=90, method=6
    )


def prepare_launcher_icons() -> None:
    lyra_icon = ROOT / "public" / "icons" / "lyra-app-icon-v53.png"
    with Image.open(lyra_icon) as source:
        source = source.convert("RGB")
        icon_512 = ImageOps.fit(source, (512, 512), method=Image.Resampling.LANCZOS)
        icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
    icon_512.save(ROOT / "public" / "icons" / "icon-512.png", "PNG", optimize=True)
    icon_192.save(ROOT / "public" / "icons" / "icon-192.png", "PNG", optimize=True)
    icon_512.save(
        ROOT / "android" / "app" / "src" / "main" / "res" / "drawable-nodpi" / "app_icon.png",
        "PNG",
        optimize=True,
    )


if __name__ == "__main__":
    prepare_rarity_art()
    prepare_launcher_icons()
    print("Prepared 24 rarity artworks, 24 battle face portraits, and Lyra launcher icons.")
