"""Build anchored six-frame 5-star idle sheets with baked elemental art.

Every runtime frame is one combined raster: the character, its weapon/armour
details, and the elemental VFX are already composited together.  Nothing is
positioned as a separate battle layer.  The character is allowed only a very
small bottom-anchored vertical compression so the pose reads as a knee bend;
its horizontal body centre and foot line stay fixed.  The elemental formation
has a fixed centre and ground line per unit while its internal shape follows a
six-phase rise/peak/regression loop.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SPRITE_ROOT = PROJECT_ROOT / "public" / "sprites" / "units"
SOURCE_ROOT = SPRITE_ROOT / "idle-vfx-sources"
FRAME_SIZE = 512
IDLE_FRAME_COUNT = 6
UNITS = ("kael", "lyra", "brannock", "zephyra", "solenne", "nyx")
PHASE_ORDER = ("restrained", "rising", "near-peak", "peak", "receding", "settling")
PHASE_WEIGHT_RATIOS = (0.34, 0.54, 0.79, 1.0, 0.75, 0.47)
BODY_SCALE_Y = (1.0, 0.997, 0.993, 0.988, 0.993, 0.997)

# A distinct, constant placement for each element.  These anchors are applied
# to every phase, so the art can grow/flicker/curl but cannot slide sideways.
EFFECT_ANCHORS = {
    "kael": (298, 438),       # sword-side ground fire
    "lyra": (238, 446),       # lower-left tide sweep
    "brannock": (256, 475),   # centred roots, rocks and leaves
    "zephyra": (302, 452),    # bow-side lightning and wind
    "solenne": (278, 468),    # staff-side light and healing seal
    "nyx": (222, 466),        # scythe-side shadow crescent
}

# A softly feathered portion of each effect is repeated in front of the body.
# This makes the element visibly touch a different authored area for each unit
# while the rest remains behind the character and preserves silhouette clarity.
FOREGROUND_BOXES = {
    "kael": (298, 170, 506, 454),
    "lyra": (80, 310, 430, 470),
    "brannock": (90, 330, 470, 496),
    "zephyra": (276, 88, 468, 452),
    "solenne": (292, 100, 456, 430),
    "nyx": (118, 54, 438, 250),
}
FOREGROUND_OPACITY = {
    "kael": 0.36,
    "lyra": 0.31,
    "brannock": 0.42,
    "zephyra": 0.48,
    "solenne": 0.34,
    "nyx": 0.38,
}


def alpha_weight(image: Image.Image) -> int:
    return sum(image.getchannel("A").tobytes())


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def split_vfx_phases(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (FRAME_SIZE * 3, FRAME_SIZE * 2):
        raise ValueError(f"{path.name}: expected a 1536x1024 3x2 VFX sheet, got {sheet.size}")
    phases = []
    for index in range(IDLE_FRAME_COUNT):
        left = (index % 3) * FRAME_SIZE
        top = (index // 3) * FRAME_SIZE
        phases.append(sheet.crop((left, top, left + FRAME_SIZE, top + FRAME_SIZE)))
    return phases


def set_phase_weight(phase: Image.Image, target_weight: int) -> Image.Image:
    current_weight = alpha_weight(phase)
    if current_weight <= 0:
        raise ValueError("VFX phase is empty")
    factor = target_weight / current_weight
    output = phase.copy()
    alpha = output.getchannel("A").point(lambda value: min(255, round(value * factor)))
    output.putalpha(alpha)
    return output


def align_effect(phase: Image.Image, center_x: int, ground_y: int) -> Image.Image:
    bounds = phase.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("VFX phase is empty after chroma removal")
    left, _top, right, bottom = bounds
    dx = round(center_x - (left + right) / 2)
    dy = ground_y - bottom
    output = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    output.alpha_composite(phase, (dx, dy))
    aligned_bounds = output.getchannel("A").getbbox()
    if not aligned_bounds:
        raise ValueError("Aligned VFX phase was clipped away")
    aligned_center = (aligned_bounds[0] + aligned_bounds[2]) / 2
    if abs(aligned_center - center_x) > 0.51 or aligned_bounds[3] != ground_y:
        raise ValueError(f"VFX anchor moved: expected {(center_x, ground_y)}, got {(aligned_center, aligned_bounds[3])}")
    return output


def bend_body(body: Image.Image, scale_y: float) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bounds = body.getchannel("A").getbbox()
    if not bounds:
        raise ValueError("Locked body source is empty")
    left, top, right, bottom = bounds
    crop = body.crop(bounds)
    new_height = max(1, round(crop.height * scale_y))
    bent = crop.resize((crop.width, new_height), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    output.alpha_composite(bent, (left, bottom - new_height))
    output_bounds = output.getchannel("A").getbbox()
    if not output_bounds:
        raise ValueError("Bent body became empty")
    return output, output_bounds


def assert_body_anchors(bounds: list[tuple[int, int, int, int]], label: str) -> None:
    centres = [(left + right) / 2 for left, _top, right, _bottom in bounds]
    foot_lines = [bottom for _left, _top, _right, bottom in bounds]
    if max(centres) - min(centres) > 0.01:
        raise ValueError(f"{label}: horizontal body centre moved: {centres}")
    if len(set(foot_lines)) != 1:
        raise ValueError(f"{label}: foot anchor moved: {foot_lines}")


def foreground_wrap(unit_id: str, effect: Image.Image) -> Image.Image:
    mask = Image.new("L", (FRAME_SIZE, FRAME_SIZE), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(FOREGROUND_BOXES[unit_id], radius=22, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(7))
    effect_alpha = effect.getchannel("A")
    wrapped_alpha = Image.new("L", (FRAME_SIZE, FRAME_SIZE), 0)
    wrapped_alpha.paste(effect_alpha, mask=mask)
    opacity = FOREGROUND_OPACITY[unit_id]
    wrapped_alpha = wrapped_alpha.point(lambda value: round(value * opacity))
    wrapped = effect.copy()
    wrapped.putalpha(wrapped_alpha)
    return wrapped


def build_unit(unit_id: str) -> dict[str, object]:
    unit_root = SPRITE_ROOT / f"{unit_id}-evolution"
    frame_root = unit_root / "frames" / "5"
    body_path = SOURCE_ROOT / f"{unit_id}-5-idle-body.png"
    if not body_path.exists():
        Image.open(frame_root / "idle-1.webp").convert("RGBA").save(body_path, "PNG", optimize=True)
    body = Image.open(body_path).convert("RGBA")
    if body.size != (FRAME_SIZE, FRAME_SIZE):
        raise ValueError(f"{body_path.name}: expected a 512x512 locked body")

    vfx_path = SOURCE_ROOT / f"{unit_id}-5-idle-vfx-6phase-alpha.png"
    raw_phases = split_vfx_phases(vfx_path)
    raw_peak_weight = alpha_weight(raw_phases[3])
    weighted_phases = [
        set_phase_weight(phase, round(raw_peak_weight * PHASE_WEIGHT_RATIOS[index]))
        for index, phase in enumerate(raw_phases)
    ]
    center_x, ground_y = EFFECT_ANCHORS[unit_id]
    vfx_phases = [align_effect(phase, center_x, ground_y) for phase in weighted_phases]
    weights = [alpha_weight(phase) for phase in vfx_phases]
    if not weights[0] < weights[1] < weights[2] < weights[3]:
        raise ValueError(f"{unit_id}: VFX progression is not monotonic: {weights}")
    if not weights[3] > weights[4] > weights[5] > weights[0]:
        raise ValueError(f"{unit_id}: VFX regression is not monotonic: {weights}")

    idle_frames: list[Image.Image] = []
    body_bounds: list[tuple[int, int, int, int]] = []
    for index, (phase, scale_y) in enumerate(zip(vfx_phases, BODY_SCALE_Y, strict=True), start=1):
        bent_body, bent_bounds = bend_body(body, scale_y)
        body_bounds.append(bent_bounds)
        # Back VFX + body + a unit-specific foreground wrap are flattened into
        # a single frame.  The runtime never positions an elemental layer.
        frame = Image.alpha_composite(phase, bent_body)
        frame = Image.alpha_composite(frame, foreground_wrap(unit_id, phase))
        output_path = frame_root / f"idle-{index}.webp"
        frame.save(output_path, "WEBP", lossless=True, method=6, exact=True)
        idle_frames.append(frame)
    assert_body_anchors(body_bounds, unit_id)

    # The dedicated 3x2 idle sheet is the canonical editable source for the
    # complete combined animation: six frames, generous fixed 512px cells.
    idle_sheet = Image.new("RGBA", (FRAME_SIZE * 3, FRAME_SIZE * 2), (0, 0, 0, 0))
    for index, frame in enumerate(idle_frames):
        idle_sheet.alpha_composite(frame, ((index % 3) * FRAME_SIZE, (index // 3) * FRAME_SIZE))
    idle_sheet_path = unit_root / "sheets" / f"{unit_id}-5-idle-sheet.png"
    idle_sheet.save(idle_sheet_path, "PNG", optimize=True)

    # The complete 5-star master keeps the new six-frame idle row and preserves
    # the existing four attack and four Burst frames without alteration.
    master = Image.new("RGBA", (FRAME_SIZE * IDLE_FRAME_COUNT, FRAME_SIZE * 3), (0, 0, 0, 0))
    for column, frame in enumerate(idle_frames):
        master.alpha_composite(frame, (column * FRAME_SIZE, 0))
    for row, animation in enumerate(("attack", "burst"), start=1):
        for column in range(4):
            frame = Image.open(frame_root / f"{animation}-{column + 1}.webp").convert("RGBA")
            master.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))
    master_path = unit_root / "sheets" / f"{unit_id}-5-master-sheet.png"
    master.save(master_path, "PNG", optimize=True)

    return {
        "unit": unit_id,
        "bodySource": body_path.relative_to(PROJECT_ROOT).as_posix(),
        "bodySha256": sha256(body_path),
        "bodyAnchorPolicy": "fixed horizontal centre and foot line; bottom-anchored 1.2% maximum knee compression",
        "bodyFrameBounds": body_bounds,
        "bodyScaleY": BODY_SCALE_Y,
        "vfxSource": vfx_path.relative_to(PROJECT_ROOT).as_posix(),
        "vfxAlphaWeights": weights,
        "vfxAnchor": {"centerX": center_x, "groundY": ground_y},
        "phaseOrder": PHASE_ORDER,
        "combinedIdleSheet": idle_sheet_path.relative_to(PROJECT_ROOT).as_posix(),
        "masterSheet": master_path.relative_to(PROJECT_ROOT).as_posix(),
    }


def preserve_authored_combined_unit(unit_id: str) -> dict[str, object]:
    """Preserve a fully redrawn combined idle sheet without legacy overlays."""
    unit_root = SPRITE_ROOT / f"{unit_id}-evolution"
    frame_root = unit_root / "frames" / "5"
    frames = [Image.open(frame_root / f"idle-{index}.webp").convert("RGBA") for index in range(1, 7)]
    bounds = [frame.getchannel("A").getbbox() for frame in frames]
    if not all(bounds):
        raise ValueError(f"{unit_id}: authored idle frame is empty")
    foot_lines = [bound[3] for bound in bounds if bound]
    if len(set(foot_lines)) != 1:
        raise ValueError(f"{unit_id}: authored foot anchor moved: {foot_lines}")

    idle_sheet = Image.new("RGBA", (FRAME_SIZE * 3, FRAME_SIZE * 2), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        idle_sheet.alpha_composite(frame, ((index % 3) * FRAME_SIZE, (index // 3) * FRAME_SIZE))
    idle_sheet_path = unit_root / "sheets" / f"{unit_id}-5-idle-sheet.png"
    idle_sheet.save(idle_sheet_path, "PNG", optimize=True)

    master = Image.new("RGBA", (FRAME_SIZE * IDLE_FRAME_COUNT, FRAME_SIZE * 3), (0, 0, 0, 0))
    for column, frame in enumerate(frames):
        master.alpha_composite(frame, (column * FRAME_SIZE, 0))
    for row, animation in enumerate(("attack", "burst"), start=1):
        for column in range(4):
            frame = Image.open(frame_root / f"{animation}-{column + 1}.webp").convert("RGBA")
            master.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))
    master_path = unit_root / "sheets" / f"{unit_id}-5-master-sheet.png"
    master.save(master_path, "PNG", optimize=True)

    return {
        "unit": unit_id,
        "sourceMode": "authored combined character-and-element frames",
        "bodyAnchorPolicy": "fixed 512px cells and shared foot line across six progression/recovery frames",
        "bodyFrameBounds": bounds,
        "phaseOrder": PHASE_ORDER,
        "combinedIdleSheet": idle_sheet_path.relative_to(PROJECT_ROOT).as_posix(),
        "masterSheet": master_path.relative_to(PROJECT_ROOT).as_posix(),
    }


def main() -> None:
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "frameSize": FRAME_SIZE,
        "idleFrameCount": IDLE_FRAME_COUNT,
        "bodyAnchorPolicy": "fixed horizontal body centre and foot line across all six combined frames",
        "elementAnchorPolicy": "fixed per-unit VFX centre and ground line; no independent runtime layer",
        "loop": "restrained -> rising -> near-peak -> peak -> receding -> settling -> restrained",
        "units": [preserve_authored_combined_unit(unit_id) if unit_id == "brannock" else build_unit(unit_id) for unit_id in UNITS],
    }
    manifest_path = SOURCE_ROOT / "5star-idle-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Rebuilt {len(UNITS)} combined six-frame 5-star idle sheets and 36 runtime frames")


if __name__ == "__main__":
    main()
