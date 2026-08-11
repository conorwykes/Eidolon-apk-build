"""Prepare and slice every hero's 4x3 evolution sheets into runtime frames.

The generated master sheets remain in public/sprites/units/<unit>-evolution as
editable source assets. Forms 2-4 contain four idle, four attack, and four
burst drawings. Rebuilt 5-star sheets contain six combined idle frames plus
the preserved four attack and four Burst frames. This script removes magenta
chroma where needed and writes fixed 512x512 lossless WebP runtime frames.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FORM_ROOT = PROJECT_ROOT / "public" / "units" / "forms"
FRAME_SIZE = 512
DEFAULT_COLUMNS = 4
FIVE_STAR_COLUMNS = 6
ROWS = ("idle", "attack", "burst")
UNITS = ("kael", "lyra", "brannock", "zephyra", "solenne", "nyx")


def evolution_root(unit_id: str) -> Path:
    return PROJECT_ROOT / "public" / "sprites" / "units" / f"{unit_id}-evolution"


def remove_magenta_chroma(sheet: Image.Image) -> Image.Image:
    """Convert the magenta generation background into clean antialiased alpha.

    The RGB channels are unmatted as well as the alpha channel; leaving the
    original blended RGB under translucent edge pixels creates a magenta halo
    after WebView scaling, especially around Brannock's leaves and stonework.
    """
    rgba = np.asarray(sheet.convert("RGBA"), dtype=np.float32) / 255
    distance = np.maximum.reduce((1 - rgba[:, :, 0], rgba[:, :, 1], 1 - rgba[:, :, 2]))
    matte = np.clip((distance - (42 / 255)) / ((110 - 42) / 255), 0, 1)
    safe_matte = np.maximum(matte, 1 / 255)
    rgb = rgba[:, :, :3]
    background = np.array([1, 0, 1], dtype=np.float32)
    unmatted = np.clip((rgb - (1 - matte[:, :, None]) * background) / safe_matte[:, :, None], 0, 1)
    output_alpha = rgba[:, :, 3] * matte
    # Image generation can bake a one-to-three-pixel magenta key-colour rim
    # into otherwise opaque antialiased edges. Suppress only magenta-dominant
    # pixels immediately beside transparency; interior purple art (Nyx,
    # Zephyra, Lyra) is left untouched.
    transparent = Image.fromarray(np.where(output_alpha < 0.04, 255, 0).astype(np.uint8), "L")
    near_transparency = np.asarray(transparent.filter(ImageFilter.MaxFilter(9)), dtype=np.float32) / 255
    magenta_strength = np.clip((np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1] - 0.12) / 0.25, 0, 1)
    balanced_magenta = np.clip(1 - np.abs(rgb[:, :, 0] - rgb[:, :, 2]) / 0.36, 0, 1)
    output_alpha *= 1 - 0.96 * near_transparency * magenta_strength * balanced_magenta
    output = np.dstack((unmatted, output_alpha))
    output[output_alpha <= 0] = 0
    return Image.fromarray(np.round(output * 255).astype(np.uint8), "RGBA")


def find_gutter(counts: list[int], expected: float, cell_size: float) -> int:
    radius = round(cell_size * 0.35)
    start = max(1, round(expected) - radius)
    end = min(len(counts) - 1, round(expected) + radius)
    zero_runs: list[tuple[int, int]] = []
    run_start: int | None = None
    for index in range(start, end):
        if counts[index] == 0 and run_start is None:
            run_start = index
        elif counts[index] != 0 and run_start is not None:
            zero_runs.append((run_start, index - 1))
            run_start = None
    if run_start is not None:
        zero_runs.append((run_start, end - 1))
    if zero_runs:
        widest = max(zero_runs, key=lambda run: (run[1] - run[0], -abs((run[0] + run[1]) / 2 - expected)))
        return round((widest[0] + widest[1]) / 2)

    # A large 5-star effect can leave no fully empty vertical gutter. In that
    # case select the quietest nine-pixel band around the expected boundary.
    half_window = 4
    return min(
        range(start + half_window, end - half_window),
        key=lambda index: (sum(counts[index - half_window:index + half_window + 1]), abs(index - expected)),
    )


def find_grid_bounds(sheet: Image.Image, column_count: int) -> tuple[list[int], list[int]]:
    alpha = sheet.getchannel("A")
    occupied = alpha.point(lambda value: 255 if value > 12 else 0)
    pixels = occupied.load()
    column_counts = [sum(pixels[x, y] != 0 for y in range(sheet.height)) for x in range(sheet.width)]
    row_counts = [sum(pixels[x, y] != 0 for x in range(sheet.width)) for y in range(sheet.height)]
    column_size = sheet.width / column_count
    row_size = sheet.height / len(ROWS)
    columns = [0, *[find_gutter(column_counts, column_size * index, column_size) for index in range(1, column_count)], sheet.width]
    rows = [0, *[find_gutter(row_counts, row_size * index, row_size) for index in range(1, len(ROWS))], sheet.height]
    return columns, rows


def remove_detached_gutter_spill(cell: Image.Image) -> Image.Image:
    """Remove only detached components that cross a detected cell boundary."""
    image = cell.copy()
    alpha = image.getchannel("A")
    width, height = image.size
    occupied = bytearray(1 if value > 12 else 0 for value in alpha.tobytes())
    visited = bytearray(width * height)
    components: list[tuple[list[int], bool]] = []

    for start in range(width * height):
        if not occupied[start] or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        pixels: list[int] = []
        touches_edge = False
        while queue:
            index = queue.popleft()
            pixels.append(index)
            x = index % width
            y = index // width
            touches_edge = touches_edge or x == 0 or y == 0 or x == width - 1 or y == height - 1
            if x > 0:
                neighbour = index - 1
                if occupied[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)
            if x + 1 < width:
                neighbour = index + 1
                if occupied[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)
            if y > 0:
                neighbour = index - width
                if occupied[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)
            if y + 1 < height:
                neighbour = index + width
                if occupied[neighbour] and not visited[neighbour]:
                    visited[neighbour] = 1
                    queue.append(neighbour)
        components.append((pixels, touches_edge))

    if not components:
        return image
    largest_pixels = max(components, key=lambda component: len(component[0]))[0]
    largest_id = id(largest_pixels)
    output = image.load()
    for pixels, touches_edge in components:
        if not touches_edge or id(pixels) == largest_id:
            continue
        for index in pixels:
            output[index % width, index // width] = (0, 0, 0, 0)
    return image


def fit_cell_on_runtime_canvas(cell: Image.Image) -> Image.Image:
    cell = remove_detached_gutter_spill(cell)
    # Rebuilt 5-star idle sources use canonical 512px cells whose character
    # anchor is already final. Returning those cells unchanged prevents a
    # second scale pass from moving the locked body or foot line.
    if cell.size == (FRAME_SIZE, FRAME_SIZE):
        canvas = cell.convert("RGBA")
        fully_transparent = canvas.getchannel("A").point(lambda value: 255 if value == 0 else 0)
        canvas.paste((0, 0, 0, 0), mask=fully_transparent)
        return canvas
    # Retain a safety gutter even when a projectile or burst effect reaches a
    # detected cell boundary. This prevents WebView scaling from clipping the
    # outermost antialiased pixels and keeps adjacent frames visually separate.
    safe_extent = round(FRAME_SIZE * 0.88)
    scale = min(safe_extent / cell.width, safe_extent / cell.height)
    width = max(1, round(cell.width * scale))
    height = max(1, round(cell.height * scale))
    resized = cell.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((FRAME_SIZE - width) // 2, (FRAME_SIZE - height) // 2))
    # Some WebP decoders expose RGB values stored underneath zero-alpha pixels
    # as coloured blocks. Clear that invisible payload while retaining every
    # antialiased edge pixel with non-zero alpha.
    fully_transparent = canvas.getchannel("A").point(lambda value: 255 if value == 0 else 0)
    canvas.paste((0, 0, 0, 0), mask=fully_transparent)
    return canvas


def slice_sheet(unit_id: str, stars: int) -> list[Path]:
    sheet_root = evolution_root(unit_id) / "sheets"
    frame_root = evolution_root(unit_id) / "frames"
    sheet_path = sheet_root / f"{unit_id}-{stars}-master-sheet.png"
    sheet = Image.open(sheet_path).convert("RGBA")
    corners = [sheet.getpixel(point) for point in ((0, 0), (sheet.width - 1, 0), (0, sheet.height - 1), (sheet.width - 1, sheet.height - 1))]
    if all(red > 180 and blue > 180 and green < 100 for red, green, blue, _alpha in corners):
        sheet = remove_magenta_chroma(sheet)
    alpha = sheet.getchannel("A")
    cleaned_alpha = alpha.point(lambda value: 0 if value <= 12 else value)
    if cleaned_alpha.tobytes() != alpha.tobytes():
        sheet.putalpha(cleaned_alpha)
        alpha = cleaned_alpha
    sheet.save(sheet_path, "PNG", optimize=True)
    if any(alpha.getpixel(point) != 0 for point in ((0, 0), (sheet.width - 1, 0), (0, sheet.height - 1), (sheet.width - 1, sheet.height - 1))):
        raise ValueError(f"{sheet_path.name} does not have transparent corners")

    column_count = FIVE_STAR_COLUMNS if stars == 5 and sheet.width == FRAME_SIZE * FIVE_STAR_COLUMNS else DEFAULT_COLUMNS
    # Rebuilt 5-star sheets use exact fixed 512px cells. Avoid redetecting their
    # gutters: the combined body/effect anchors are already authored in place.
    if stars == 5 and sheet.size == (FRAME_SIZE * FIVE_STAR_COLUMNS, FRAME_SIZE * len(ROWS)):
        columns = [index * FRAME_SIZE for index in range(FIVE_STAR_COLUMNS + 1)]
        rows = [index * FRAME_SIZE for index in range(len(ROWS) + 1)]
    else:
        columns, rows = find_grid_bounds(sheet, column_count)
    output_paths: list[Path] = []
    for row_index, animation in enumerate(ROWS):
        top, bottom = rows[row_index], rows[row_index + 1]
        output_dir = frame_root / str(stars)
        output_dir.mkdir(parents=True, exist_ok=True)
        frame_count = FIVE_STAR_COLUMNS if stars == 5 and animation == "idle" and column_count == FIVE_STAR_COLUMNS else DEFAULT_COLUMNS
        for column in range(frame_count):
            left, right = columns[column], columns[column + 1]
            cell = sheet.crop((left, top, right, bottom))
            runtime_frame = fit_cell_on_runtime_canvas(cell)
            output_path = output_dir / f"{animation}-{column + 1}.webp"
            runtime_frame.save(output_path, "WEBP", lossless=True, method=6, exact=True)
            output_paths.append(output_path)

            if stars == 2 and animation == "idle" and column == 0:
                FORM_ROOT.mkdir(parents=True, exist_ok=True)
                runtime_frame.save(FORM_ROOT / f"{unit_id}-2.webp", "WEBP", lossless=True, method=6, exact=True)

    return output_paths


def main() -> None:
    written = [path for unit_id in UNITS for stars in (2, 3, 4, 5) for path in slice_sheet(unit_id, stars)]
    print(f"Wrote {len(written)} runtime frames and {len(UNITS)} 2-star form portraits.")


if __name__ == "__main__":
    main()
