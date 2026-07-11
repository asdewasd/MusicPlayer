# MusicFlow - 在线音乐播放器

基于 Vue 3 + Express + MySQL 的全栈音乐播放器，使用 Jamendo CC 免费音乐 API 提供海量正版音乐。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3（Composition API） | - |
| 构建工具 | Vite | 8.1 |
| 状态管理 | Pinia | 3.0 |
| 路由 | Vue Router | 4.6 |
| 后端框架 | Express | 5.2 |
| 数据库 | MySQL（mysql2） | 3.22 |
| 认证 | JWT + bcryptjs | 9.0 / 3.0 |
| 外部 API | Jamendo | v3.0 |

## 功能特性

- **音乐发现**：首页展示 Jamendo 热门推荐，支持无限滚动加载
- **智能搜索**：支持歌手、歌曲、专辑搜索，输入 250ms 后自动弹出建议
- **用户系统**：注册 / 登录 / 个人中心，JWT 认证
- **收藏管理**：登录后可将歌曲添加到"我喜欢的音乐"，支持批量检查状态
- **播放队列**：动态添加到播放列表，退出登录或关闭页面时自动清空
- **歌手详情**：专辑封面横向拖动浏览，按发行时间倒序排列
- **背景切换**：播放时页面背景自动切换为当前歌曲封面
- **响应式布局**：适配 PC 和移动端

## 项目结构

```
musicflow-vue/
├── public/                    # 静态资源
├── src/
│   ├── components/            # 组件（Sidebar、PlayerBar、TrackList 等）
│   ├── views/                 # 页面（Home、Search、Artist、Favorites 等）
│   ├── stores/                # Pinia 状态管理
│   │   ├── auth.js            # 认证状态
│   │   ├── player.js          # 播放器核心
│   │   ├── favorites.js       # 收藏管理
│   │   ├── playQueue.js       # 播放队列
│   │   └── music.js           # 音乐数据
│   ├── router/                # 路由配置
│   ├── composables/           # 组合式函数
│   └── utils/                 # 工具函数（网络请求封装）
├── backend/
│   ├── server.js              # Express 主入口
│   ├── db.js                  # MySQL 连接池（含内存 fallback）
│   ├── routes/                # API 路由
│   │   ├── auth.js            # 用户认证
│   │   ├── audio.js           # 音频生成 + Jamendo 代理
│   │   ├── favorites.js       # 收藏 CRUD
│   │   ├── playlist.js        # 播放队列 CRUD
│   │   └── jamendo-data.js    # Jamendo 数据同步
│   ├── middleware/
│   │   └── auth.js            # JWT 认证中间件
│   └── tests/                 # API 测试
├── vite.config.js
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL 8.0
- Jamendo API 密钥（[免费注册](https://developer.jamendo.com)）

### 1. 克隆项目

```bash
git clone https://github.com/asdewasd/MusicPlayer.git
cd MusicPlayer/musicflow-vue
```

### 2. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=MusicPlayer
SERVER_PORT=3000
JWT_SECRET=your_random_secret
JAMENDO_CLIENT_ID=your_jamendo_client_id
```

### 3. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS MusicPlayer DEFAULT CHARSET utf8mb4;
```

### 4. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd backend
npm install
```

### 5. 构建前端

```bash
npm run build
```

### 6. 启动服务

```bash
cd backend
node server.js
```

访问 http://127.0.0.1:3000

### 开发模式

```bash
# 终端1：启动后端
cd backend && node server.js

# 终端2：启动前端开发服务器（支持热更新）
npm run dev
# 访问 http://localhost:5174
```

## API 接口

### 公开接口（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/songs` | 推荐歌曲列表 |
| GET | `/api/songs/:id` | 歌曲详情 |
| GET | `/api/artists` | 歌手列表 |
| GET | `/api/artists/:id/albums` | 歌手专辑 |
| GET | `/api/albums/:id/songs` | 专辑歌曲 |
| GET | `/api/audio/jamendo/featured` | Jamendo 热门推荐 |
| GET | `/api/audio/jamendo/suggestions` | 搜索建议 |
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |

### 认证接口（需要 JWT Bearer Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/me` | 当前用户信息 |
| GET | `/api/favorites` | 获取收藏列表 |
| POST | `/api/favorites` | 添加收藏 |
| DELETE | `/api/favorites/:songId` | 取消收藏 |
| GET | `/api/favorites/check?ids=` | 批量检查收藏状态 |
| GET | `/api/playlist` | 获取播放队列 |
| POST | `/api/playlist` | 添加到队列 |
| DELETE | `/api/playlist` | 清空队列 |
| DELETE | `/api/playlist/:queueId` | 移除单首 |
| PUT | `/api/playlist/reorder` | 调整顺序 |

## 数据库表

| 表名 | 用途 |
|------|------|
| `users` | 用户账号信息 |
| `songs` | 歌曲数据（自动同步 Jamendo） |
| `artists` | 歌手数据 |
| `albums` | 专辑数据 |
| `favorites` | 用户收藏（按 user_id 隔离） |
| `playlist_songs` | 播放队列（临时数据，页面关闭时清空） |

## 设计说明

### 数据库双模式

后端优先使用 MySQL，连接失败时自动降级为内存 fallback 模式，确保开发环境无需数据库也能运行。

### 播放队列生命周期

- 登录用户点击歌曲旁的 "+" 按钮添加到队列
- 队列存储在 `playlist_songs` 表中，按用户隔离
- "下一首" 按钮优先从队列取歌，队列为空时回到原列表
- 退出登录时自动清空队列
- 关闭页面（`beforeunload`）时自动清空队列

### 数据同步

后端启动时自动从 Jamendo API 拉取热门歌曲，同步到 MySQL 的 `songs`、`artists`、`albums` 三张表中。

## License

MIT