/**
 * 播放队列（Play Queue）API
 * 存储用户临时播放队列，退出登录/关闭页面时自动清空
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { query, isConnected } = require('../db');

const router = express.Router();

// 内存 fallback 队列存储：Map<userId, Array<track>>
const memoryQueue = new Map();

function getUserQueue(userId) {
  if (!memoryQueue.has(userId)) {
    memoryQueue.set(userId, []);
  }
  return memoryQueue.get(userId);
}

// ==================== GET /api/playlist — 获取播放队列 ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (isConnected()) {
      const rows = await query(
        `SELECT id, user_id, sort_order, song_id, title, artist_name, album_name, cover_url, audio_url, duration, created_at
         FROM playlist_songs WHERE user_id = ? ORDER BY sort_order ASC`,
        [userId]
      );
      return res.json(rows.map(r => ({
        queueId: r.id,
        id: r.song_id,
        title: r.title,
        artist_name: r.artist_name,
        album_name: r.album_name,
        cover_url: r.cover_url,
        audio_url: r.audio_url,
        duration_seconds: r.duration,
        sort_order: r.sort_order,
      })));
    }

    const queue = getUserQueue(userId);
    res.json(queue);
  } catch (err) {
    console.error('GET /api/playlist error:', err.message);
    res.status(500).json({ error: '获取播放队列失败' });
  }
});

// ==================== POST /api/playlist — 添加歌曲到队列 ====================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { song_id, title, artist_name, album_name, cover_url, audio_url, duration } = req.body;

    if (!song_id || !title) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const songId = String(song_id);

    if (isConnected()) {
      // 获取当前最大排序值
      const [maxOrder] = await query(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM playlist_songs WHERE user_id = ?',
        [userId]
      );
      const nextOrder = maxOrder.max_order + 1;

      const result = await query(
        `INSERT INTO playlist_songs (user_id, sort_order, song_id, title, artist_name, album_name, cover_url, audio_url, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, nextOrder, songId, title, artist_name || '', album_name || '', cover_url || '', audio_url || '', duration || 0]
      );

      return res.json({
        success: true,
        queueId: result.insertId,
        sort_order: nextOrder,
      });
    }

    const queue = getUserQueue(userId);
    const entry = {
      queueId: Date.now(),
      id: songId,
      title,
      artist_name: artist_name || '',
      album_name: album_name || '',
      cover_url: cover_url || '',
      audio_url: audio_url || '',
      duration_seconds: duration || 0,
      sort_order: queue.length,
    };
    queue.push(entry);
    res.json({ success: true, queueId: entry.queueId, sort_order: queue.length - 1 });
  } catch (err) {
    console.error('POST /api/playlist error:', err.message);
    res.status(500).json({ error: '添加失败' });
  }
});

// ==================== DELETE /api/playlist/:queueId — 移除队列中的歌曲 ====================
router.delete('/:queueId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const queueId = parseInt(req.params.queueId, 10);

    if (isConnected()) {
      await query(
        'DELETE FROM playlist_songs WHERE id = ? AND user_id = ?',
        [queueId, userId]
      );
      return res.json({ success: true });
    }

    const queue = getUserQueue(userId);
    const idx = queue.findIndex(q => q.queueId === queueId);
    if (idx !== -1) queue.splice(idx, 1);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/playlist/:queueId error:', err.message);
    res.status(500).json({ error: '移除失败' });
  }
});

// ==================== DELETE /api/playlist — 清空播放队列 ====================
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (isConnected()) {
      await query('DELETE FROM playlist_songs WHERE user_id = ?', [userId]);
      return res.json({ success: true });
    }

    memoryQueue.set(userId, []);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/playlist error:', err.message);
    res.status(500).json({ error: '清空失败' });
  }
});

// ==================== PUT /api/playlist/reorder — 调整队列顺序 ====================
router.put('/reorder', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items } = req.body; // [{ queueId, sort_order }, ...]

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items 必须是数组' });
    }

    if (isConnected()) {
      for (const item of items) {
        await query(
          'UPDATE playlist_songs SET sort_order = ? WHERE id = ? AND user_id = ?',
          [item.sort_order, item.queueId, userId]
        );
      }
      return res.json({ success: true });
    }

    const queue = getUserQueue(userId);
    for (const item of items) {
      const entry = queue.find(q => q.queueId === item.queueId);
      if (entry) entry.sort_order = item.sort_order;
    }
    queue.sort((a, b) => a.sort_order - b.sort_order);
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/playlist/reorder error:', err.message);
    res.status(500).json({ error: '排序失败' });
  }
});

module.exports = router;