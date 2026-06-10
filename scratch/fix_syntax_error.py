file_path = r"d:\code\Antigravity\FilmAlbum\mobile\src\components\PhotoViewerModal.tsx"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

bad_segment = """              ))}
            </ScrollView>
          )}
            />
          )}"""

good_segment = """              ))}
            </ScrollView>
          )}"""

content = content.replace(bad_segment, good_segment)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("SUCCESS: Duplicate closing tags removed!")
