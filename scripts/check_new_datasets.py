import pathlib, collections, json

# Vulnerable People dataset
vuln_root = pathlib.Path(r'datasets\Vulnerable People.v2i.yolov8')
vuln_classes = ['children_wo_disability', 'elderly_wo_disability', 'non_vulnerable', 'with_disability']

print("=== 1. Vulnerable People Dataset ===")
vuln_result = {}
for split in ['train', 'valid']:
    labels_dir = vuln_root / split / 'labels'
    if not labels_dir.exists():
        print(f"{split}: Dizin yok")
        continue
    counts = collections.Counter()
    file_count = 0
    for file in labels_dir.glob('*.txt'):
        file_count += 1
        try:
            content = file.read_text(encoding='utf-8', errors='ignore')
            for line in content.strip().splitlines():
                if not line.strip():
                    continue
                parts = line.split()
                if parts:
                    cls = int(parts[0])
                    counts[cls] += 1
        except Exception as e:
            print(f"Hata {file.name}: {e}")
            continue
    vuln_result[split] = {
        'files': file_count,
        'instances': {vuln_classes[i]: counts.get(i, 0) for i in range(len(vuln_classes))},
    }
    print(f"\n{split.upper()}:")
    print(f"  Dosya: {file_count}")
    for i, name in enumerate(vuln_classes):
        print(f"  {name}: {counts.get(i, 0)}")

# Total
total_vuln = collections.Counter()
for split in ['train', 'valid']:
    if split in vuln_result:
        for i, name in enumerate(vuln_classes):
            total_vuln[i] += vuln_result[split]['instances'][name]
print("\nTOPLAM:")
for i, name in enumerate(vuln_classes):
    print(f"  {name}: {total_vuln[i]}")

print("\n\n=== 2. BGVP Dataset (COCO Format) ===")
bgvp_root = pathlib.Path(r'datasets\BGVP-main\BGVP-main')
groundtruth_dir = bgvp_root / 'Groundtruth'
if groundtruth_dir.exists():
    for json_file in sorted(groundtruth_dir.glob('*.json')):
        print(f"\n{json_file.name}:")
        try:
            data = json.loads(json_file.read_text(encoding='utf-8'))
            if 'categories' in data:
                print("  Sınıflar:")
                for cat in data['categories']:
                    print(f"    {cat['id']}: {cat['name']}")
            if 'annotations' in data:
                cat_counts = collections.Counter(ann['category_id'] for ann in data['annotations'])
                print("  Annotation sayıları:")
                for cat in data['categories']:
                    print(f"    {cat['name']}: {cat_counts.get(cat['id'], 0)}")
            if 'images' in data:
                print(f"  Görüntü sayısı: {len(data['images'])}")
        except Exception as e:
            print(f"  Hata: {e}")
else:
    print("Groundtruth dizini bulunamadı")

print("\n\n=== 3. Bizim Sınıflarla Eşleştirme ===")
print("Hedef sınıflar: elderly, child, disabled, adult\n")
print("Vulnerable People eşleştirme:")
print("  children_wo_disability → child")
print("  elderly_wo_disability → elderly")
print("  with_disability → disabled")
print("  non_vulnerable → adult")
print("\nBGVP eşleştirme:")
print("  Children Without Disability → child")
print("  Elderly without Disability → elderly")
print("  With Disability → disabled")
print("  Non-Vulnerable → adult")

print("\n\n=== Format Uyumluluk ===")
print("✓ Vulnerable People: YOLOv8 formatında (train/labels/*.txt) - DOĞRUDAN KULLANILABİLİR")
print("⚠ BGVP: COCO JSON formatında - YOLOv8'e DÖNÜŞTÜRME GEREKLİ")
