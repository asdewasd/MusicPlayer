const express = require('express');
const bcrypt = require('bcryptjs');
const { query, isConnected } = require('../db');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();

// 内存 fallback 用户存储（MySQL 不可用时使用）
const memoryUsers = new Map();

// 初始化一个 demo 用户到内存中
(function initDemoUser() {
  const hash = bcrypt.hashSync('123456', 10);
  memoryUsers.set('demo_user', {
    id: 1,
    username: 'demo_user',
    nickname: '测试用户',
    email: 'demo@musicflow.local',
    avatar_url: 'assets/covers/yehuimei.svg',
    password_hash: hash,
  });
})();

// ===== POST /api/auth/register — 注册 =====
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 校验
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.trim().length < 2) {
      return res.status(400).json({ error: '用户名至少2个字符' });
    }
    if (username.trim().length > 50) {
      return res.status(400).json({ error: '用户名最多50个字符' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const cleanUsername = username.trim();
    const cleanEmail = (email || '').trim() || null;

    if (isConnected()) {
      // 检查用户名是否已存在
      const existing = await query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
      if (existing.length > 0) {
        return res.status(409).json({ error: '用户名已被注册' });
      }

      // 检查邮箱
      if (cleanEmail) {
        const emailExists = await query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (emailExists.length > 0) {
          return res.status(409).json({ error: '邮箱已被注册' });
        }
      }

      const result = await query(
        `INSERT INTO users (username, nickname, email, password_hash)
         VALUES (?, ?, ?, ?)`,
        [cleanUsername, cleanUsername, cleanEmail, passwordHash]
      );

      const user = {
        id: result.insertId,
        username: cleanUsername,
        nickname: cleanUsername,
      };

      const token = generateToken(user);
      return res.status(201).json({ token, user });
    }

    // 内存模式
    if (memoryUsers.has(cleanUsername)) {
      return res.status(409).json({ error: '用户名已被注册' });
    }

    const newId = memoryUsers.size + 1;
    const user = {
      id: newId,
      username: cleanUsername,
      nickname: cleanUsername,
      email: cleanEmail,
      avatar_url: null,
      password_hash: passwordHash,
    };
    memoryUsers.set(cleanUsername, user);

    const token = generateToken({ id: user.id, username: user.username });
    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, email: user.email },
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err.message);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// ===== POST /api/auth/login — 登录 =====
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const cleanUsername = username.trim();

    if (isConnected()) {
      const rows = await query(
        'SELECT id, username, nickname, email, avatar_url, password_hash FROM users WHERE username = ?',
        [cleanUsername]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const user = rows[0];
      if (!user.password_hash) {
        return res.status(401).json({ error: '该账号未设置密码，请先重置密码' });
      }

      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = generateToken({ id: user.id, username: user.username });
      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });
    }

    // 内存模式
    const user = memoryUsers.get(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = generateToken({ id: user.id, username: user.username });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err.message);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// ===== GET /api/auth/me — 获取当前用户信息（需要登录） =====
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (isConnected()) {
      const rows = await query(
        'SELECT id, username, nickname, email, avatar_url, created_at FROM users WHERE id = ?',
        [req.user.userId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      return res.json(rows[0]);
    }

    // 内存模式
    const user = memoryUsers.get(req.user.username);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    return res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

module.exports = router;