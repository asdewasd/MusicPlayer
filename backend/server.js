require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDb, query, isConnected } = require('./db');
const authRoutes = require('./routes/auth');
const audioRoutes = require('./routes/audio');
const jamendoDataRoutes = require('./routes/jamendo-data');
const favoritesRoutes = require('./routes/favorites');
const playlistRoutes = require('./routes/playlist');

const app = express();
app.use(cors());
app.use(express.json());

// 生产模式：托管前端构建产物
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// 内存 fallback 数据（与数据库测试数据一致）
// audio_url 指向后端音频生成服务: /api/audio/:id
const fallbackData = {
  artists: [
    { id: 1, name: '周杰伦', avatar_url: 'assets/covers/yehuimei.svg', description: '华语流行歌手', external_api_id: 'jay-chou' },
    { id: 2, name: '朴树', avatar_url: 'assets/covers/orion.svg', description: '独立音乐人', external_api_id: 'pu-shu' }
  ],
  albums: [
    { id: 1, artist_id: 1, title: '叶惠美', cover_url: 'assets/covers/yehuimei.svg', release_date: '2003-07-31', external_api_id: 'yehuimei' },
    { id: 2, artist_id: 1, title: '十一月的萧邦', cover_url: 'assets/covers/november.svg', release_date: '2005-11-01', external_api_id: 'november' },
    { id: 3, artist_id: 1, title: '我很忙', cover_url: 'assets/covers/busy.svg', release_date: '2007-11-02', external_api_id: 'busy' },
    { id: 4, artist_id: 2, title: '猎户星座', cover_url: 'assets/covers/orion.svg', release_date: '2017-04-30', external_api_id: 'orion' }
  ],
  songs: [
    { id: 1, artist_id: 1, album_id: 1, title: '晴天', duration_seconds: 30, cover_url: 'assets/covers/yehuimei.svg', audio_url: '/api/audio/1', lyric: '故事的小黄花，从出生那年就飘着。', external_api_id: 'sunny-day' },
    { id: 2, artist_id: 1, album_id: 1, title: '东风破', duration_seconds: 30, cover_url: 'assets/covers/yehuimei.svg', audio_url: '/api/audio/2', lyric: '一盏离愁，孤单伫立在窗口。', external_api_id: 'east-wind' },
    { id: 3, artist_id: 1, album_id: 2, title: '夜曲', duration_seconds: 30, cover_url: 'assets/covers/november.svg', audio_url: '/api/audio/3', lyric: '一群嗜血的蚂蚁，被腐肉所吸引。', external_api_id: 'nocturne' },
    { id: 4, artist_id: 1, album_id: 3, title: '青花瓷', duration_seconds: 30, cover_url: 'assets/covers/busy.svg', audio_url: '/api/audio/4', lyric: '素胚勾勒出青花笔锋浓转淡。', external_api_id: 'blue-white' },
    { id: 5, artist_id: 2, album_id: 4, title: '平凡之路', duration_seconds: 30, cover_url: 'assets/covers/orion.svg', audio_url: '/api/audio/5', lyric: '我曾经跨过山和大海，也穿过人山人海。', external_api_id: 'ordinary-road' },
    { id: 6, artist_id: 2, album_id: 4, title: '生如夏花', duration_seconds: 30, cover_url: 'assets/covers/orion.svg', audio_url: '/api/audio/6', lyric: '我是这耀眼的瞬间，是划过天边的刹那火焰。', external_api_id: 'summer-flowers' }
  ]
};

// 辅助：格式化歌曲数据
function formatSong(s) {
  return {
    id: s.id,
    title: s.title,
    artist_id: s.artist_id,
    album_id: s.album_id,
    duration_seconds: s.duration_seconds,
    cover_url: s.cover_url,
    audio_url: s.audio_url,
    lyric: s.lyric
  };
}

// GET /api/songs — 推荐歌曲列表
app.get('/api/songs', async (req, res) => {
  try {
    if (isConnected()) {
      const rows = await query(
        `SELECT id, title, artist_id, album_id, duration_seconds, cover_url, audio_url, lyric
         FROM songs ORDER BY id ASC`
      );
      return res.json(rows.map(formatSong));
    }
    res.json(fallbackData.songs.map(formatSong));
  } catch (err) {
    console.error('GET /api/songs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/songs/:id — 歌曲详情
app.get('/api/songs/:id', async (req, res) => {
  try {
    const songId = parseInt(req.params.id, 10);
    if (isConnected()) {
      const rows = await query(
        `SELECT id, title, artist_id, album_id, duration_seconds, cover_url, audio_url, lyric
         FROM songs WHERE id = ?`,
        [songId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Song not found' });
      return res.json(formatSong(rows[0]));
    }
    const song = fallbackData.songs.find(s => s.id === songId);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json(formatSong(song));
  } catch (err) {
    console.error('GET /api/songs/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/artists — 歌手列表
app.get('/api/artists', async (req, res) => {
  try {
    if (isConnected()) {
      const rows = await query(
        `SELECT id, name, avatar_url, description, external_api_id FROM artists ORDER BY id ASC`
      );
      return res.json(rows);
    }
    res.json(fallbackData.artists);
  } catch (err) {
    console.error('GET /api/artists error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/artists/:id/albums — 歌手专辑（按发行时间倒序）
app.get('/api/artists/:id/albums', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id, 10);
    if (isConnected()) {
      const rows = await query(
        `SELECT id, artist_id, title, cover_url, release_date, external_api_id
         FROM albums WHERE artist_id = ? ORDER BY release_date DESC`,
        [artistId]
      );
      return res.json(rows);
    }
    const albums = fallbackData.albums
      .filter(a => a.artist_id === artistId)
      .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    res.json(albums);
  } catch (err) {
    console.error('GET /api/artists/:id/albums error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/albums/:id/songs — 专辑单曲列表
app.get('/api/albums/:id/songs', async (req, res) => {
  try {
    const albumId = parseInt(req.params.id, 10);
    if (isConnected()) {
      const rows = await query(
        `SELECT id, title, artist_id, album_id, duration_seconds, cover_url, audio_url, lyric
         FROM songs WHERE album_id = ? ORDER BY id ASC`,
        [albumId]
      );
      return res.json(rows.map(formatSong));
    }
    const songs = fallbackData.songs
      .filter(s => s.album_id === albumId)
      .map(formatSong);
    res.json(songs);
  } catch (err) {
    console.error('GET /api/albums/:id/songs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 认证路由
app.use('/api/auth', authRoutes);

// 音频生成 & Jamendo 代理
app.use('/api/audio', audioRoutes);

// Jamendo 数据管理（分表存储 + 歌手搜索按专辑分组）
app.use('/api/jamendo-data', jamendoDataRoutes);

// 用户收藏（我喜欢的音乐）
app.use('/api/favorites', favoritesRoutes);

// 播放队列（临时播放列表）
app.use('/api/playlist', playlistRoutes);

// 初始化数据库连接，启动完成后自动同步数据
async function startAfterInit() {
  await initDb();
  // initDb 完成后延迟触发 Jamendo 同步
  const { ensureDataLoaded } = require('./routes/jamendo-data');
  await ensureDataLoaded();
}

startAfterInit();

// SPA 路由回退（Express 5.x 不支持 * 通配符，使用中间件方式）
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 如果是直接运行此文件，启动服务器
if (require.main === module) {
  const PORT = process.env.SERVER_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MusicFlow backend running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;