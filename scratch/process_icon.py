import sys
import os
from PIL import Image

def process_images():
    source_img_path = r"C:\Users\Meng\.gemini\antigravity-ide\brain\1cf07a15-0a71-4668-be54-c623c341a1d5\app_icon_pure_1781090197049.png"
    assets_dir = r"d:\code\Antigravity\FilmAlbum\mobile\assets"
    
    # 确保 assets 目录存在
    os.makedirs(assets_dir, exist_ok=True)
    
    # 1. 复制为通用 icon.png (保留白底，iOS 不允许透明通道)
    dest_icon_path = os.path.join(assets_dir, "icon.png")
    try:
        img_icon = Image.open(source_img_path)
        img_icon.convert("RGB").save(dest_icon_path, "PNG")
        print(f"[Success] Saved universal icon.png")
    except Exception as e:
        print(f"[Error] Failed to save icon.png: {e}")
        return
        
    # 2. 为 Android 生成透明背景的前景图标 android-icon-foreground.png (使用 BFS 泛洪填充)
    dest_foreground_path = os.path.join(assets_dir, "android-icon-foreground.png")
    try:
        img_fg = Image.open(source_img_path).convert("RGBA")
        width, height = img_fg.size
        pixels = img_fg.load()
        
        visited = set()
        queue = []
        
        def is_white(r, g, b):
            return r > 240 and g > 240 and b > 240
            
        for x in range(width):
            queue.append((x, 0))
            queue.append((x, height - 1))
        for y in range(1, height - 1):
            queue.append((0, y))
            queue.append((width - 1, y))
            
        while queue:
            cx, cy = queue.pop(0)
            if (cx, cy) in visited:
                continue
            visited.add((cx, cy))
            
            r, g, b, a = pixels[cx, cy]
            if is_white(r, g, b):
                pixels[cx, cy] = (r, g, b, 0)
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            nr, ng, nb, _ = pixels[nx, ny]
                            if is_white(nr, ng, nb):
                                queue.append((nx, ny))
                                
        img_fg.save(dest_foreground_path, "PNG")
        print(f"[Success] Saved android-icon-foreground.png")
    except Exception as e:
        print(f"[Error] Failed to process adaptive icon: {e}")
        return

    # 3. 生成自适应图标背景 android-icon-background.png (全黑 #0e0e0e 以与 app.json 配置对齐)
    dest_background_path = os.path.join(assets_dir, "android-icon-background.png")
    try:
        # 自适应图标背景规范尺寸为 1084x1084 (或根据前景比例 512x512)
        # 我们使用源图的尺寸（通常为 1024x1024 或者是前景图同等尺寸，这里读取 img_fg 尺寸）
        bg_width, bg_height = img_fg.size
        img_bg = Image.new("RGB", (bg_width, bg_height), "#0e0e0e")
        img_bg.save(dest_background_path, "PNG")
        print(f"[Success] Saved android-icon-background.png (Solid #0e0e0e)")
    except Exception as e:
        print(f"[Error] Failed to generate android-icon-background.png: {e}")

    # 4. 生成单色/主题图标 android-icon-monochrome.png
    dest_monochrome_path = os.path.join(assets_dir, "android-icon-monochrome.png")
    try:
        # 单色图标规范要求：保留前景图标的透明背景，且将所有非透明图案部分颜色转换为纯黑色
        img_mono = Image.open(dest_foreground_path).convert("RGBA")
        mono_width, mono_height = img_mono.size
        mono_pixels = img_mono.load()
        
        for y in range(mono_height):
            for x in range(mono_width):
                r, g, b, a = mono_pixels[x, y]
                if a > 0:
                    # 设为纯黑色，保留其原始 Alpha 透明度（保留抗锯齿和过渡细节）
                    mono_pixels[x, y] = (0, 0, 0, a)
                    
        img_mono.save(dest_monochrome_path, "PNG")
        print(f"[Success] Saved android-icon-monochrome.png (Pure Black Silhouette)")
    except Exception as e:
        print(f"[Error] Failed to generate android-icon-monochrome.png: {e}")

    # 5. 生成网页微标 favicon.png
    dest_favicon_path = os.path.join(assets_dir, "favicon.png")
    try:
        # favicon 需要透明背景并采用 48x48 规格
        img_favicon = Image.open(dest_foreground_path)
        img_favicon.thumbnail((48, 48), Image.Resampling.LANCZOS)
        img_favicon.save(dest_favicon_path, "PNG")
        print(f"[Success] Saved favicon.png (48x48 transparent)")
    except Exception as e:
        print(f"[Error] Failed to generate favicon.png: {e}")

if __name__ == "__main__":
    process_images()
