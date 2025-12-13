from pathlib import Path
import shutil

TARGET = ["elderly", "child", "disabled", "adult"]
NAME_MAP = {
    "child": "child",
    "person": "adult",
    "people": "adult",
    "silver": "elderly",
    "wheel": "disabled",
    "peopleWithWheelchair": "disabled",
}
INPUTS = [
    Path("datasets/PedestriansDetection.v1-pedestriandetectv1.yolov8"),
    Path("datasets/wheelchair detection.v1i.yolov8"),
]
OUTPUT_ROOT = Path("datasets/processed/pedestrians")


def parse_names(data_yaml: Path):
    text = data_yaml.read_text(encoding="utf-8")
    for line in text.splitlines():
        if line.strip().startswith("names:"):
            part = line.split(":", 1)[1].strip()
            if part.startswith("["):
                items = part.strip().strip("[]")
                return [x.strip().strip("'\"") for x in items.split(",") if x.strip()]
    return []


def remap():
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)

    images_out = {split: OUTPUT_ROOT / split / "images" for split in ("train", "valid", "test")}
    labels_out = {split: OUTPUT_ROOT / split / "labels" for split in ("train", "valid", "test")}
    for split in images_out:
        images_out[split].mkdir(parents=True, exist_ok=True)
        labels_out[split].mkdir(parents=True, exist_ok=True)

    summary = {"train": 0, "valid": 0, "test": 0}
    file_index = 0

    for ds in INPUTS:
        data_yaml = ds / "data.yaml"
        if not data_yaml.exists():
            print(f"[skip] {ds} no data.yaml")
            continue
        names = parse_names(data_yaml)
        name_by_id = {i: n for i, n in enumerate(names)}

        for split in ["train", "valid", "test"]:
            labels_dir = ds / split / "labels"
            images_dir = ds / split / "images"
            if not labels_dir.exists():
                continue
            for label_path in labels_dir.glob("*.txt"):
                img_name = label_path.stem
                img_path = None
                img_ext = None
                for ext in (".jpg", ".jpeg", ".png"):
                    cand = images_dir / f"{img_name}{ext}"
                    if cand.exists():
                        img_path = cand
                        img_ext = ext
                        break
                if img_path is None:
                    continue

                mapped_lines = []
                for line in label_path.read_text(encoding="utf-8").splitlines():
                    if not line.strip():
                        continue
                    parts = line.split()
                    try:
                        cls_id = int(parts[0])
                    except ValueError:
                        continue
                    cls_name = name_by_id.get(cls_id)
                    new_name = NAME_MAP.get(cls_name)
                    if new_name is None:
                        continue
                    new_id = TARGET.index(new_name)
                    mapped_lines.append(" ".join([str(new_id)] + parts[1:]))

                new_base = f"{ds.name.replace(' ', '_')}_{file_index:06d}"
                file_index += 1
                shutil.copyfile(img_path, images_out[split] / f"{new_base}{img_ext}")
                (labels_out[split] / f"{new_base}.txt").write_text("\n".join(mapped_lines), encoding="utf-8")
                summary[split] = summary.get(split, 0) + 1

    print("done", summary)
    print("classes", TARGET)


if __name__ == "__main__":
    remap()
