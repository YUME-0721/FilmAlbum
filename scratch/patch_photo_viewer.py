import os

file_path = r"d:\code\Antigravity\FilmAlbum\mobile\src\components\PhotoViewerModal.tsx"
with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# 1. 替换 Ref 声明与增加 State
old_ref = """  // 📸 FlatList 引用，用于控制水平照片列表的物理顺滑滑动定位
  const flatListRef = useRef<FlatList<any>>(null);"""

new_ref = """  // 📸 ScrollView 引用，用于控制水平照片列表的物理顺滑滑动定位
  const scrollViewRef = useRef<ScrollView>(null);
  const [isScrollPositioned, setIsScrollPositioned] = useState(false); // 💡 首次滚动定位是否真正完成
  const [flatListLayoutReady, setFlatListLayoutReady] = useState(false); // 💡 ScrollView 容器布局是否测量就绪"""

if old_ref in content:
    content = content.replace(old_ref, new_ref)
    print("Ref declaration replaced successfully!")
else:
    print("Warning: Ref declaration not found or already replaced.")

# 2. 替换 visible useEffect 并添加 performScroll useEffect
new_effect_js = """  useEffect(() => {
    if (visible) {
      setIsListReady(false); 
      setIsScrollPositioned(false);
      setFlatListLayoutReady(false);
      setCurrentIndex(initialIndex);
      resetViewerState();

      // 💡 延迟 350ms 等待 Modal 原生滑入动画彻底平息，组件尺寸完全测量稳定后，再静默载入多图滚动 ScrollView
      const timer = setTimeout(() => {
        setIsListReady(true);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex]);

  // 💡 专用的定位副作用：当 ScrollView 布局就绪且 Modal 加载就绪后，立刻精准递归定位到目标 index
  useEffect(() => {
    if (isListReady && flatListLayoutReady && scrollViewRef.current && !isScrollPositioned) {
      let active = true;
      let timer: any = null;

      const performScroll = () => {
        if (!active) return;
        try {
          scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * currentIndex, animated: false });
          // 💡 滚动调用成功后延迟 80ms 再隐去底层的占位图，给原生端渲染留下平缓的载入时间缓冲，100% 解决黑屏
          timer = setTimeout(() => {
            if (active) {
              setIsScrollPositioned(true);
            }
          }, 80);
        } catch (e) {
          // 💡 失败说明 ScrollView 原生视图或尺寸在当前帧尚未测量好，100ms 后再次递归尝试
          timer = setTimeout(performScroll, 100);
        }
      };

      performScroll();

      return () => {
        active = false;
        if (timer) clearTimeout(timer);
      };
    }
  }, [isListReady, flatListLayoutReady, currentIndex, isScrollPositioned]);"""

# 模糊查找 visible useEffect 块并替换
lines = content.splitlines()
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "if (visible) {" in line and "useEffect(" in lines[i-1] and "setIsListReady(false)" in lines[i+1]:
        start_idx = i - 1
        for j in range(i, len(lines)):
            if "}, [visible, initialIndex]);" in lines[j]:
                end_idx = j + 1
                break
        break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx] = new_effect_js.splitlines()
    content = "\n".join(lines)
    print("Effect replaced via line indices successfully!")
else:
    print("Error: Could not locate visible useEffect block.")

# 3. 替换 goToFrame 函数
old_goto = """  // 切换底片
  const goToFrame = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < frames.length) {
      setCurrentIndex(targetIndex);
      resetViewerState();
    }
  };"""

new_goto = """  // 切换底片
  const goToFrame = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < frames.length) {
      setCurrentIndex(targetIndex);
      resetViewerState();
      scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * targetIndex, animated: false });
    }
  };"""

if old_goto in content:
    content = content.replace(old_goto, new_goto)
    print("goToFrame replaced successfully!")
else:
    print("Warning: goToFrame not found or already replaced.")

# 4. 更改守望图的 opacity
lines = content.splitlines()
replaced = False
for i, line in enumerate(lines):
    if "opacity: isListReady ? 0 : 1" in line:
        lines[i] = line.replace("opacity: isListReady ? 0 : 1 }]", "opacity: isScrollPositioned ? 0 : 1 }]} pointerEvents={isScrollPositioned ? 'none' : 'auto'}")
        content = "\n".join(lines)
        replaced = True
        print("Opacity replaced via fuzzy match successfully!")
        break
if not replaced:
    print("Error: Could not locate opacity block.")

# 5. 替换 FlatList 渲染代码块为 ScrollView 渲染代码块
new_scroll_view = """          {isListReady && (
            <ScrollView
              ref={scrollViewRef}
              horizontal={true}
              pagingEnabled={true}
              showsHorizontalScrollIndicator={false}
              scrollEnabled={scale <= 1} // 💡 绝妙设计：双击放大时禁用水平滑动翻页，在原图或缩小状态下允许滑动
              onLayout={() => setFlatListLayoutReady(true)}
              onMomentumScrollEnd={(e) => {
                // 滑动完全停止时，平滑更新当前的底片索引，底层的守望单图也将瞬间且无痕同步为当前看图，完成全链路无缝守望
                const nextIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                if (nextIndex >= 0 && nextIndex < frames.length && nextIndex !== currentIndex) {
                  setCurrentIndex(nextIndex);
                }
              }}
              style={StyleSheet.absoluteFill}
            >
              {frames.map((item, index) => (
                <ViewerImageItem
                  key={item.id}
                  item={item}
                  isCurrent={index === currentIndex}
                  borderType={scale > 1 ? 'none' : borderType} // 💡 绝妙设计：放大缩小图片时自动动态隐藏边框以满屏查看大图细节！
                  borderOptions={borderOptions}
                  isShowingOriginal={isShowingOriginal}
                  scale={scale}
                  rotation={rotation}
                  position={position}
                  getRotationScale={getRotationScale}
                  panResponder={panResponder}
                  renderExposureString={renderExposureString}
                  handleDoubleClick={handleDoubleClick}
                  brandInitial={brandInitial}
                  roll={roll}
                  isDark={isViewerDark}
                />
              ))}
            </ScrollView>
          )}"""

lines = content.splitlines()
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "<FlatList" in line and "isListReady" in lines[i-1]:
        start_idx = i - 1
        for j in range(i, len(lines)):
            if "/>" in lines[j] and ")}" in lines[j+1]:
                end_idx = j + 2
                break
        break

if start_idx != -1 and end_idx != -1:
    lines[start_idx:end_idx] = new_scroll_view.splitlines()
    content = "\n".join(lines)
    print(f"ScrollView block replaced successfully from line {start_idx+1} to {end_idx+1}!")
else:
    print("Error: Could not locate FlatList block via line search.")

# 写入文件
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
