import argparse
import json
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional

# COCO category id -> (target_class_name, yolo_class_id)
CATEGORY_MAP = {
    1: ("child", 0),
    2: ("elderly", 1),
    4: ("disabled", 2),
    3: ("adult", 3),
}

CLASS_NAMES = ["child", "elderly", "disabled", "adult"]


def load_coco(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def coco_to_yolo_bbox(bbox: List[float], width: int, height: int) -> Optional[str]:
    x, y, w, h = bbox
    if w <= 0 or h <= 0 or width <= 0 or height <= 0:
        return None
    cx = (x + w / 2) / width
    cy = (y + h / 2) / height
    nw = w / width
    nh = h / height
    return f"{cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


def convert_split(
    split: str,
    base_dir: Path,
    output_dir: Path,
    max_images: Optional[int] = None,
) -> Dict[str, int]:
    coco_path = base_dir / "Groundtruth" / f"{split}_annotations.coco.json"
    images_dir = base_dir / "Dataset" / split / split
    out_images = output_dir / split / "images"
    out_labels = output_dir / split / "labels"
    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    data = load_coco(coco_path)
    img_meta = {img["id"]: img for img in data.get("images", [])}
    anns_by_img: Dict[int, List[dict]] = defaultdict(list)
    for ann in data.get("annotations", []):
        anns_by_img[ann["image_id"]].append(ann)

    # deterministic subset for dry-run
    image_items = sorted(img_meta.items(), key=lambda kv: kv[1]["file_name"])
    if max_images is not None:
        image_items = image_items[:max_images]

    stats = {
        "images": 0,
        "labels": 0,
        "boxes": 0,
        "skipped_cat": 0,
        "skipped_bbox": 0,
        "missing_images": 0,
    }

    for img_id, meta in image_items:
        file_name = meta["file_name"]
        width, height = meta["width"], meta["height"]
        src_img = images_dir / file_name
        dst_img = out_images / file_name
        dst_lbl = out_labels / f"{Path(file_name).stem}.txt"

        if not src_img.exists():
            stats["missing_images"] += 1
            print(f"[warn] missing image skipped: {src_img}")
            continue

        shutil.copy2(src_img, dst_img)
        stats["images"] += 1

        lines: List[str] = []
        for ann in anns_by_img.get(img_id, []):
            cat_id = ann.get("category_id")
            mapping = CATEGORY_MAP.get(cat_id)
            if mapping is None:
                stats["skipped_cat"] += 1
                continue
            _, cls_id = mapping
            yolo_bbox = coco_to_yolo_bbox(ann.get("bbox", []), width, height)
            if yolo_bbox is None:
                stats["skipped_bbox"] += 1
                continue
            lines.append(f"{cls_id} {yolo_bbox}")
            stats["boxes"] += 1

        with dst_lbl.open("w", encoding="utf-8") as f:
            if lines:
                f.write("\n".join(lines))
        stats["labels"] += 1

    return stats


def write_data_yaml(path: Path, yolo_root: Path):
    content = {
        "path": str(yolo_root),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "names": CLASS_NAMES,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        yaml_str = (
            "path: " + content["path"] + "\n" +
            "train: " + content["train"] + "\n" +
            "val: " + content["val"] + "\n" +
            "test: " + content["test"] + "\n" +
            "names:\n  " + "\n  ".join(f"- {n}" for n in content["names"]) + "\n"
        )
        f.write(yaml_str)


def main():
    parser = argparse.ArgumentParser(description="Convert BGVP COCO annotations to YOLO format.")
    parser.add_argument("--base-dir", type=Path, default=Path("datasets/BGVP-main/BGVP-main"))
    parser.add_argument("--output-dir", type=Path, default=Path("datasets/BGVP-main/yolo"))
    parser.add_argument("--splits", nargs="*", default=["train", "valid", "test"], choices=["train", "valid", "test"])
    parser.add_argument("--max-images", type=int, default=None, help="Limit images per split for dry-run")
    parser.add_argument("--write-data-yaml", type=Path, default=None, help="Optional path to write data.yaml")
    args = parser.parse_args()

    summary = {}
    for split in args.splits:
        stats = convert_split(split, args.base_dir, args.output_dir, args.max_images)
        summary[split] = stats
        print(
            f"[split:{split}] images={stats['images']} labels={stats['labels']} "
            f"boxes={stats['boxes']} missing_images={stats['missing_images']} "
            f"skipped_cat={stats['skipped_cat']} skipped_bbox={stats['skipped_bbox']}"
        )

    if args.write_data_yaml:
        write_data_yaml(args.write_data_yaml, args.output_dir)
        print(f"data.yaml written to {args.write_data_yaml}")

    total_imgs = sum(v["images"] for v in summary.values())
    total_boxes = sum(v["boxes"] for v in summary.values())
    print(f"Done. Total images={total_imgs}, total boxes={total_boxes}")


if __name__ == "__main__":
    main()
