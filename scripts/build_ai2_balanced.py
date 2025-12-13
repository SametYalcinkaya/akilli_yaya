import random
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

# Unified class order: 0=child, 1=elderly, 2=disabled, 3=adult
CLASS_NAMES = ["child", "elderly", "disabled", "adult"]
TARGET_PER_CLASS: Dict[int, int] = {}  # will be computed dynamically per run
SPLIT_RATIOS = {
    "train": 0.8,
    "val": 0.1,
    "test": 0.1,
}
RNG_SEED = 42

@dataclass
class DatasetConfig:
    name: str
    root: Path
    class_map: Dict[int, int]  # source id -> unified id
    splits: Tuple[str, ...] = ("train", "valid", "val", "test")


def collect_items(cfg: DatasetConfig) -> List[dict]:
    items = []
    for split in cfg.splits:
        img_dir = cfg.root / split / "images"
        lbl_dir = cfg.root / split / "labels"
        if not lbl_dir.exists():
            continue
        for lbl_path in lbl_dir.glob("*.txt"):
            try:
                lines = [ln for ln in lbl_path.read_text().strip().splitlines() if ln.strip()]
            except FileNotFoundError:
                # Missing label file; skip
                continue
            mapped_lines = []
            cls_counts = Counter()
            for ln in lines:
                parts = ln.split()
                if not parts:
                    continue
                src_cls = int(parts[0])
                if src_cls not in cfg.class_map:
                    continue
                dst_cls = cfg.class_map[src_cls]
                mapped_lines.append((dst_cls, parts[1:]))
                cls_counts[dst_cls] += 1
            if not mapped_lines:
                continue
            img_path = img_dir / f"{lbl_path.stem}.jpg"
            if not img_path.exists():
                img_path = img_dir / f"{lbl_path.stem}.png"
            if not img_path.exists():
                # No image: skip
                continue
            items.append(
                {
                    "source": cfg.name,
                    "img_path": img_path,
                    "lbl_path": lbl_path,
                    "split": split,
                    "cls_counts": cls_counts,
                    "mapped_lines": mapped_lines,
                }
            )
    return items


def compute_available(items: List[dict]) -> Counter:
    total = Counter()
    for it in items:
        total.update(it["cls_counts"])
    return total


def assign_splits(items: List[dict], target_per_class: Dict[int, int]) -> Dict[str, List[dict]]:
    random.seed(RNG_SEED)
    random.shuffle(items)

    available = compute_available(items)

    def per_split_targets():
        targets = {}
        for split, ratio in SPLIT_RATIOS.items():
            targets[split] = {}
            for cls_idx in range(len(CLASS_NAMES)):
                cap = min(target_per_class[cls_idx], available.get(cls_idx, 0))
                targets[split][cls_idx] = int(cap * ratio)
        return targets

    targets = per_split_targets()
    assigned: Dict[str, List[dict]] = {"train": [], "val": [], "test": []}

    def score(item, remaining):
        sc = 0.0
        for cls, cnt in item["cls_counts"].items():
            rem = remaining.get(cls, 0)
            if rem <= 0:
                continue
            target = target_per_class[cls]
            weight = (rem / (target + 1e-6))
            sc += cnt * weight
        return sc

    def adapt_item(it, remaining_split):
        # Drop adult/child boxes if that class is already filled, keep scarce classes
        new_lines = []
        for cls, rest in it["mapped_lines"]:
            if cls in (0, 3) and remaining_split.get(cls, 0) <= 0:
                continue
            new_lines.append((cls, rest))
        if not new_lines:
            return None
        new_counts = Counter(cls for cls, _ in new_lines)
        for cls, cnt in new_counts.items():
            if cnt > remaining_split.get(cls, 0):
                return None
        new_it = dict(it)
        new_it["mapped_lines"] = new_lines
        new_it["cls_counts"] = new_counts
        return new_it

    def try_fill(split_order: List[str]):
        remaining = {s: targets[s].copy() for s in split_order}
        pool = list(items)
        for s in split_order:
            # keep trying to place items into this split while any class needs remain
            while True:
                pool.sort(key=lambda it: score(it, remaining[s]), reverse=True)
                placed_any = False
                next_pool: List[dict] = []
                for it in pool:
                    if score(it, remaining[s]) <= 0:
                        next_pool.append(it)
                        continue
                    if all(it["cls_counts"][cls] <= remaining[s][cls] for cls in it["cls_counts"]):
                        assigned[s].append(it)
                        for cls, cnt in it["cls_counts"].items():
                            remaining[s][cls] -= cnt
                        placed_any = True
                    else:
                        adapted = adapt_item(it, remaining[s])
                        if adapted and all(adapted["cls_counts"][cls] <= remaining[s][cls] for cls in adapted["cls_counts"]):
                            assigned[s].append(adapted)
                            for cls, cnt in adapted["cls_counts"].items():
                                remaining[s][cls] -= cnt
                            placed_any = True
                        else:
                            next_pool.append(it)
                pool = next_pool
                if not placed_any:
                    break
        unused = pool
        return unused, remaining

    # First satisfy val/test, then train
    leftover, rem_small = try_fill(["val", "test"])
    # Update targets with remaining from rem_small, then fill train
    for split in rem_small:
        for cls in rem_small[split]:
            targets[split][cls] = rem_small[split][cls]
    items_for_train = leftover
    # fill train
    random.shuffle(items_for_train)
    leftover_train, rem_train = try_fill(["train"])
    for cls in rem_train["train"]:
        targets["train"][cls] = rem_train["train"][cls]
    return assigned




def export_dataset(assigned: Dict[str, List[dict]], out_root: Path):
    if out_root.exists():
        shutil.rmtree(out_root)  # clean previous build to avoid stale labels
    out_root.mkdir(parents=True, exist_ok=True)
    for split, lst in assigned.items():
        img_out = out_root / split / "images"
        lbl_out = out_root / split / "labels"
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)
        for it in lst:
            stem = f"{it['source']}_{it['img_path'].stem}"
            dst_img = img_out / f"{stem}{it['img_path'].suffix}"
            dst_lbl = lbl_out / f"{stem}.txt"
            shutil.copy2(it["img_path"], dst_img)
            with dst_lbl.open("w", encoding="utf-8") as f:
                for cls, rest in it["mapped_lines"]:
                    f.write(f"{cls} {' '.join(rest)}\n")


def report(assigned: Dict[str, List[dict]]):
    for split, lst in assigned.items():
        cls_counts = Counter()
        for it in lst:
            cls_counts.update(it["cls_counts"])
        print(split, "images", len(lst), "boxes", dict(cls_counts))
    total = Counter()
    total_imgs = 0
    for lst in assigned.values():
        for it in lst:
            total_imgs += 1
            total.update(it["cls_counts"])
    print("TOTAL images", total_imgs, "boxes", dict(total))


def write_data_yaml(out_root: Path):
    content = (
        "path: " + str(out_root) + "\n"
        "train: train/images\n"
        "val: val/images\n"
        "test: test/images\n"
        "names:\n  " + "\n  ".join(f"- {n}" for n in CLASS_NAMES) + "\n"
    )
    (out_root / "data.yaml").write_text(content, encoding="utf-8")


def main():
    datasets = [
        DatasetConfig(
            name="vp",
            root=Path("datasets/Vulnerable People.v2i.yolov8"),
            class_map={0: 0, 1: 1, 3: 2, 2: 3},
        ),
        DatasetConfig(
            name="proc",
            root=Path("datasets/processed/pedestrians"),
            class_map={0: 1, 1: 0, 2: 2, 3: 3},
        ),
        DatasetConfig(
            name="bgvp",
            root=Path("datasets/BGVP-main/yolo"),
            class_map={0: 0, 1: 1, 2: 2, 3: 3},
        ),
    ]

    all_items: List[dict] = []
    for cfg in datasets:
        collected = collect_items(cfg)
        all_items.extend(collected)
        print(f"Collected {len(collected)} items from {cfg.name}")

    available = compute_available(all_items)
    print("Available boxes per class:", dict(sorted(available.items())))

    target_per_class = {}
    for cls_idx in range(len(CLASS_NAMES)):
        avail = available.get(cls_idx, 0)
        if cls_idx == 1:  # elderly: take everything available (4017)
            target = avail
        else:
            # Aim for 4500 if available, but stay within 4k-5k band
            if avail >= 4500:
                target = 4500
            elif avail >= 4000:
                target = 4000
            else:
                target = avail
        target_per_class[cls_idx] = target

    print("Using targets:", target_per_class)

    assigned = assign_splits(all_items, target_per_class)
    report(assigned)

    out_root = Path("datasets/ai2_balanced")
    export_dataset(assigned, out_root)
    write_data_yaml(out_root)
    print("Wrote", out_root / "data.yaml")


if __name__ == "__main__":
    main()
