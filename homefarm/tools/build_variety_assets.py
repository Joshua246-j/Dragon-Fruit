"""Build compact, transparent WebP assets for the variety showcase.

The PNG/JPEG inputs remain source masters. Runtime only loads the WebP files
made by this script. Interior cutouts are extracted from the supplied cultivar
reference photographs, never from a generated replacement.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
VARIETIES = ROOT / "assets" / "images" / "varieties"


def central_component(mask: np.ndarray) -> np.ndarray:
    """Return the largest plausible product component near the image centre."""
    height, width = mask.shape
    labels, count = ndimage.label(mask)
    if not count:
        return np.zeros_like(mask, dtype=np.uint8)
    min_y, max_y = int(height * 0.12), int(height * 0.88)
    min_x, max_x = int(width * 0.12), int(width * 0.88)
    central_labels = np.unique(labels[min_y : max_y + 1, min_x : max_x + 1])
    central_labels = central_labels[central_labels > 0]
    if not central_labels.size:
        return np.zeros_like(mask, dtype=np.uint8)
    sizes = np.bincount(labels.ravel())
    selected = central_labels[np.argmax(sizes[central_labels])]
    return np.where(labels == selected, 255, 0).astype(np.uint8)


def interior_cutout(source: Path, destination: Path) -> None:
    """Extract the central fruit from a dark prop/reference photograph."""
    image = Image.open(source).convert("RGBA")
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    high = rgb.max(axis=2)
    low = rgb.min(axis=2)
    saturation = np.divide(high - low, high, out=np.zeros_like(high), where=high > 0)
    rows, columns = np.ogrid[: image.height, : image.width]
    central_ellipse = ((columns - image.width * 0.5) / (image.width * 0.46)) ** 2 + ((rows - image.height * 0.5) / (image.height * 0.47)) ** 2

    # Dragon-fruit skin is saturated; white flesh is bright and central. This
    # deliberately rejects neutral slates/plates and the bright rim-light that
    # occurs outside the fruit in several reference photographs.
    skin = (saturation > 0.22) & (high > 0.16) & (rows < image.height * 0.9)
    flesh = (high > 0.46) & (central_ellipse < 1.3)
    mask = skin | flesh
    alpha = Image.fromarray(central_component(mask), "L")
    alpha = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.25))

    # Crop around the subject with a little breathing room, then normalize every
    # variety to the same square canvas for stable in-browser motion.
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError(f"Could not isolate a fruit in {source}")
    left, top, right, bottom = bbox
    margin = int(max(right - left, bottom - top) * 0.055)
    left, top = max(0, left - margin), max(0, top - margin)
    right, bottom = min(image.width, right + margin), min(image.height, bottom + margin)
    crop = image.crop((left, top, right, bottom))
    crop.putalpha(alpha.crop((left, top, right, bottom)))
    size = max(crop.size)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(crop, ((size - crop.width) // 2, (size - crop.height) // 2))
    canvas.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (1024, 1024))
    output.alpha_composite(canvas, ((1024 - canvas.width) // 2, (1024 - canvas.height) // 2))
    output.save(destination, "WEBP", quality=88, method=6)


def hero_webp(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (1024, 1024))
    output.alpha_composite(image, ((1024 - image.width) // 2, (1024 - image.height) // 2))
    output.save(destination, "WEBP", quality=88, method=6)


def main() -> None:
    for source in sorted(VARIETIES.glob("*-cut.jpg")):
        variety_id = source.stem.removesuffix("-cut")
        directory = VARIETIES / variety_id
        directory.mkdir(exist_ok=True)
        interior_cutout(source, directory / f"{variety_id}-interior-cutout.webp")
        hero_webp(directory / f"{variety_id}-hero-cutout.png", directory / f"{variety_id}-hero.webp")
        print(f"built {variety_id}")


if __name__ == "__main__":
    main()
