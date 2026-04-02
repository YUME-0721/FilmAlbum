-- 种子数据：创建测试用户和示例内容
-- 密码为 "password123" 的 PBKDF2 哈希（仅用于本地开发测试）
-- NOTE: 实际运行时需要先通过 API 注册用户，此处仅为快速测试提供

-- 用户
INSERT OR IGNORE INTO users (id, email, password_hash, nickname, avatar_url, bio) VALUES
('user-001', 'chenlin@example.com', 'placeholder_hash', '陈林', '', '记录光影里的颗粒，追逐那些即将逝去的瞬间。专注于街头人文与城市景观。'),
('user-002', 'moyan@example.com', 'placeholder_hash', '陈墨言', '', '雨后的街头总是最有故事的。'),
('user-003', 'lina@example.com', 'placeholder_hash', 'Lina Wang', '', '喜欢午后的阳光和咖啡的味道。');

-- 胶卷
INSERT OR IGNORE INTO rolls (id, user_id, title, film_stock, camera, lens, location, shot_date, format, status, tags) VALUES
('roll-042', 'user-001', 'City Solitude', 'Kodak Portra 400', 'Leica M6', 'Summicron 35mm f/2', 'Tokyo, Japan', '2023-11-15', '135', 'FINISHED', '["东京","街头","城市"]'),
('roll-043', 'user-001', 'Oceanic Drift', 'Fuji Superia 400', 'Nikon FM2', 'Nikkor 50mm f/1.4', 'Fujian, China', '2024-06-20', '135', 'IN PROGRESS', '["海洋","风景"]'),
('roll-044', 'user-001', 'Concrete Poetry', 'Ilford HP5 Plus', 'Hasselblad 500C/M', 'Planar 80mm f/2.8', 'Shanghai, China', '2022-03-10', '120', 'ARCHIVED', '["上海","建筑","黑白"]');

-- 帖子
INSERT OR IGNORE INTO posts (id, user_id, title, content, film_type, camera, lens, tags) VALUES
('post-001', 'user-002', '夜色东京 · 2024', '在雨后的新宿街头漫步，霓虹灯的倒影在水洼中闪烁。Cinestill 800T 独特的红色光晕给这座赛博朋克城市增添了一层迷幻的色彩。', 'Cinestill 800T', 'Leica M6', 'Summicron 35mm f/2', '["东京","街头","夜景","Cinestill800T"]'),
('post-002', 'user-003', '午后慵懒', '阳光透过百叶窗洒在地板上，猫咪蜷缩在光影交错中。Portra 400 温暖的色调完美还原了这个慵懒的午后。', 'Portra 400', 'Canon AE-1', 'FD 50mm f/1.4', '["日常","人文","Portra400"]'),
('post-003', 'user-001', '构造之美', '钢筋水泥之间的几何美学，Ilford HP5 的高反差让建筑的线条更加分明。', 'HP5 Plus', 'Nikon FM2', 'Nikkor 28mm f/2.8', '["建筑","黑白","极简"]');
