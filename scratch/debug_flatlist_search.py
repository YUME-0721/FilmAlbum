file_path = r"d:\code\Antigravity\FilmAlbum\mobile\src\components\PhotoViewerModal.tsx"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

lines = content.splitlines()
for i, line in enumerate(lines):
    if "<FlatList" in line:
        print(f"Index {i}: line='{line}'")
        print(f"Index {i-1}: prev='{lines[i-1]}'")
        print(f"Condition 1: {'<FlatList' in line}")
        print(f"Condition 2: {'isListReady' in lines[i-1]}")
