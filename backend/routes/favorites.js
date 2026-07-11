/**
 * 用户收藏（我喜欢的音乐）API
 * 支持 MySQL 和内存 fallback 双模式
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, isConnected } = require('../db');

const router = express.Router();

// 内存 fallback 收藏存储：Map<userId, Map<songId, favorite>>
const memoryFavorites = new Map();

/**
 * 获取或创建用户的收藏列表
 */
function getUserFavorites(userId) {
  if (!memoryFavorites.has(userId)) {
    memoryFavorites.set(userId, new Map());
  }
  return memoryFavorites.get(userId);
}

// ==================== POST /api/favorites — 添加收藏 ====================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { song_id, title, artist_name, album_name, cover_url, audio_url, duration } = req.body;

    if (!song_id || !title) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const songId = String(song_id);

    if (isConnected()) {
      // 检查是否已收藏
      const existing = await query(
        'SELECT id FROM favorites WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      );
      if (existing.length > 0) {
        return res.json({ success: true, message: '已收藏' });
      }

      await query(
        `INSERT INTO favorites (user_id, song_id, title, artist_name, album_name, cover_url, audio_url, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, songId, title, artist_name || '', album_name || '', cover_url || '', audio_url || '', duration || 0]
      );

      return res.json({ success: true, message: '已添加到我喜欢' });
    }

    // 内存模式
    const userFavs = getUserFavorites(userId);
    if (userFavs.has(songId)) {
      return res.json({ success: true, message: '已收藏' });
    }

    userFavs.set(songId, {
      id: Date.now(),
      user_id: userId,
      song_id: songId,
      title,
      artist_name: artist_name || '',
      album_name: album_name || '',
      cover_url: cover_url || '',
      audio_url: audio_url || '',
      duration: duration || 0,
      created_at: new Date().toISOString(),
    });

    return res.json({ success: true, message: '已添加到我喜欢' });
  } catch (err) {
    console.error('POST /api/favorites error:', err.message);
    res.status(500).json({ error: '收藏失败' });
  }
});

// ==================== DELETE /api/favorites/:songId — 取消收藏 ====================
router.delete('/:songId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = String(req.params.songId);

    if (isConnected()) {
      await query(
        'DELETE FROM favorites WHERE user_id = ? AND song_id = ?',
        [userId, songId]
      );
      return res.json({ success: true, message: '已取消收藏' });
    }

    // 内存模式
    const userFavs = getUserFavorites(userId);
    userFavs.delete(songId);
    return res.json({ success: true, message: '已取消收藏' });
  } catch (err) {
    console.error('DELETE /api/favorites/:songId error:', err.message);
    res.status(500).json({ error: '操作失败' });
  }
});

// ==================== GET /api/favorites — 获取收藏列表 ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (isConnected()) {
      const rows = await query(
        `SELECT id, song_id, title, artist_name, album_name, cover_url, audio_url, duration, created_at
         FROM favorites WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      );
      return res.json(rows.map(r => ({
        ...r,
        id: r.song_id,
        cover_url: r.cover_url,
        audio_url: r.audio_url,
        duration_seconds: r.duration,
      })));
    }

    // 内存模式
    const userFavs = getUserFavorites(userId);
    const list = Array.from(userFavs.values()).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return res.json(list.map(r => ({
      ...r,
      id: r.song_id,
      cover_url: r.cover_url,
      audio_url: r.audio_url,
      duration_seconds: r.duration,
    })));
  } catch (err) {
    console.error('GET /api/favorites error:', err.message);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
});

// ==================== GET /api/favorites/check — 批量检查收藏状态 ====================
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const songIds = (req.query.ids || '').split(',').filter(Boolean).map(String);

    if (songIds.length === 0) {
      return res.json({});
    }

    if (isConnected()) {
      const placeholders = songIds.map(() => '?').join(',');
      const rows = await query(
        `SELECT song_id FROM favorites WHERE user_id = ? AND song_id IN (${placeholders})`,
        [userId, ...songIds]
      );
      const result = {};
      rows.forEach(r => { result[r.song_id] = true; });
      return res.json(result);
    }

    // 内存模式
    const userFavs = getUserFavorites(userId);
    const result = {};
    songIds.forEach(id => {
      result[id] = userFavs.has(id);
    });
    return res.json(result);
  } catch (err) {
    console.error('GET /api/favorites/check error:', err.message);
    res.status(500).json({ error: '检查收藏状态失败' });
  }
});

module.exports = router;