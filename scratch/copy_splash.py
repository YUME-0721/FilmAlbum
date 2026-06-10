import shutil, os

src = r'd:\code\Antigravity\FilmAlbum\mobile\assets\splash-icon.png'
dirs = ['drawable-hdpi', 'drawable-mdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi']
base = r'd:\code\Antigravity\FilmAlbum\mobile\android\app\src\main\res'

for d in dirs:
    dst = os.path.join(base, d, 'splashscreen_logo.png')
    shutil.copy2(src, dst)
    print(f'Copied to {dst}')

print('All done!')
