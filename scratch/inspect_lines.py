file_path = r"d:\code\Antigravity\FilmAlbum\mobile\src\components\PhotoViewerModal.tsx"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for i in range(760, 810):
    clean_line = lines[i].encode('ascii', 'ignore').decode('ascii')
    print(f"{i+1}: {clean_line}", end="")
