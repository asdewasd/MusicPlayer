/**
 * Jamendo 数据管理路由
 * 将 Jamendo 歌曲数据分表存储到 artists / albums / songs 三张表中
 * 提供按歌手搜索、按专辑分组等查询接口
 */
const express = require('express');
const router = express.Router();
const nodeFetch = require('node-fetch');

const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// ==================== 内存 fallback 存储（MySQL 不可用时使用） ====================
const memStore = {
  artists: new Map(),  // key: external_api_id (artist_name hash)
  albums: new Map(),   // key: external_api_id (album_name + artist_name hash)
  songs: new Map(),    // key: external_api_id (Jamendo track id)
  artistIdCounter: 0,
  albumIdCounter: 0,
  songIdCounter: 0,
};

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return 'mem_' + Math.abs(hash);
}

function getOrCreateArtist(name, db) {
  const extId = hashStr(name);
  if (memStore.artists.has(extId)) {
    return memStore.artists.get(extId);
  }
  memStore.artistIdCounter++;
  const artist = {
    id: memStore.artistIdCounter,
    name,
    avatar_url: '',
    external_api_id: extId,
  };
  memStore.artists.set(extId, artist);
  return artist;
}

function getOrCreateAlbum(artistDbId, albumName, artistName, db) {
  const extId = hashStr(albumName + '|' + artistName);
  if (memStore.albums.has(extId)) {
    return memStore.albums.get(extId);
  }
  memStore.albumIdCounter++;
  const album = {
    id: memStore.albumIdCounter,
    artist_id: artistDbId,
    title: albumName,
    cover_url: '',
    release_date: null,
    external_api_id: extId,
  };
  memStore.albums.set(extId, album);
  return album;
}

function getOrCreateSong(artistDbId, albumDbId, track, db) {
  const extId = 'jamendo_' + track.id;
  if (memStore.songs.has(extId)) {
    return memStore.songs.get(extId);
  }
  memStore.songIdCounter++;
  const song = {
    id: memStore.songIdCounter,
    artist_id: artistDbId,
    album_id: albumDbId,
    title: track.name,
    duration_seconds: Math.floor(track.duration || 0),
    cover_url: track.image || '',
    audio_url: track.audio || '',
    external_api_id: extId,
    artist_name: track.artist_name,
    album_name: track.album_name || '',
  };
  memStore.songs.set(extId, song);
  return song;
}

// ==================== 服务启动时自动同步热门数据 ====================
let syncPromise = null;
let dbSynced = false;

/**
 * 同步数据到 MySQL（artists / albums / songs 三表）
 */
async function syncToMySQL(tracks) {
  const { query } = require('../db');
  let synced = 0;
  for (const track of tracks) {
    try {
      const artistExtId = 'jamendo_' + hashStr(track.artist_name);
      const albumExtId = 'jamendo_' + hashStr(track.album_name + '|' + track.artist_name);
      const songExtId = 'jamendo_' + track.id;

      await query(
        'INSERT IGNORE INTO artists (name, avatar_url, external_api_id) VALUES (?, ?, ?)',
        [track.artist_name, track.image || '', artistExtId]
      );
      const [ar] = await query('SELECT id FROM artists WHERE external_api_id = ?', [artistExtId]);
      const artistId = ar.id;

      await query(
        'INSERT IGNORE INTO albums (artist_id, title, cover_url, external_api_id) VALUES (?, ?, ?, ?)',
        [artistId, track.album_name || '未知专辑', track.image || '', albumExtId]
      );
      const [al] = await query('SELECT id FROM albums WHERE external_api_id = ?', [albumExtId]);
      const albumId = al.id;

      const result = await query(
        'INSERT IGNORE INTO songs (artist_id, album_id, title, duration_seconds, cover_url, audio_url, external_api_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [artistId, albumId, track.name, Math.floor(track.duration || 0), track.image || '', track.audio || '', songExtId]
      );

      if (result.affectedRows > 0) synced++;
      else {
        await query(
          'UPDATE songs SET audio_url = ?, cover_url = ? WHERE external_api_id = ?',
          [track.audio || '', track.image || '', songExtId]
        );
      }
    } catch (err) {
       // 跳过单条错误
       if (synced === 0) console.error('[JamendoData] syncToMySQL first error:', err.message);
     }
  }
  return synced;
}

async function ensureDataLoaded() {
  if (memStore.artists.size > 0) return;
  if (!CLIENT_ID) return;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=200&include=musicinfo&order=popularity_total`;
      const data = await nodeFetch(url).then(r => r.json());
      if (data && data.headers && data.headers.status === 'success' && data.results) {
        // 始终写入内存（fallback 模式用）
        for (const track of data.results) {
          const artist = getOrCreateArtist(track.artist_name);
          const album = getOrCreateAlbum(artist.id, track.album_name || '未知专辑', track.artist_name);
          getOrCreateSong(artist.id, album.id, track);
        }

        // 同时写入 MySQL
        const { isConnected } = require('../db');
        if (isConnected()) {
          const synced = await syncToMySQL(data.results);
          dbSynced = true;
          console.log(`[JamendoData] Auto-synced ${data.results.length} tracks (memory), ${synced} new songs (MySQL). ${memStore.artists.size} artists, ${memStore.albums.size} albums`);
        } else {
          console.log(`[JamendoData] Auto-synced ${data.results.length} tracks, ${memStore.artists.size} artists, ${memStore.albums.size} albums (memory only)`);
        }
      }
    } catch (err) {
      console.error('[JamendoData] Auto-sync failed:', err.message);
    }
  })();
  return syncPromise;
}

// 由 server.js 在 initDb() 完成后调用
// ensureDataLoaded();

/**
 * 从 Jamendo API 拉取数据并存入 artist/album/song 表
 * POST /api/jamendo-data/sync?q=keyword&limit=50
 */
router.post('/sync', async (req, res) => {
  try {
    if (!CLIENT_ID) {
      return res.status(503).json({ error: 'Jamendo API 未配置' });
    }

    const q = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const fetch = nodeFetch;
    let url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&include=musicinfo&order=popularity_total`;
    if (q) {
      url += `&namesearch=${encodeURIComponent(q)}`;
    }

    const data = await fetch(url).then(r => r.json());
    if (!data || data.headers.status !== 'success') {
      return res.status(400).json({ error: 'Jamendo API 请求失败' });
    }

    const { isConnected, query } = require('../db');
    let syncedArtists = 0, syncedAlbums = 0, syncedSongs = 0;

    if (isConnected()) {
      // === MySQL 存储 ===
      for (const track of data.results) {
        const artistExtId = 'jamendo_' + hashStr(track.artist_name);
        const albumExtId = 'jamendo_' + hashStr(track.album_name + '|' + track.artist_name);
        const songExtId = 'jamendo_' + track.id;

        // 插入或忽略 artist
        await query(
          `INSERT IGNORE INTO artists (name, avatar_url, external_api_id) VALUES (?, '', ?)`,
          [track.artist_name, artistExtId]
        );
        const [artistRows] = await query(
          `SELECT id FROM artists WHERE external_api_id = ?`, [artistExtId]
        );
        const artistId = artistRows.id;

        // 插入或忽略 album
        await query(
          `INSERT IGNORE INTO albums (artist_id, title, cover_url, external_api_id) VALUES (?, ?, ?, ?)`,
          [artistId, track.album_name || '未知专辑', track.image || '', albumExtId]
        );
        const [albumRows] = await query(
          `SELECT id FROM albums WHERE external_api_id = ?`, [albumExtId]
        );
        const albumId = albumRows.id;

        // 插入或忽略 song
        const result = await query(
          `INSERT IGNORE INTO songs (artist_id, album_id, title, duration_seconds, cover_url, audio_url, external_api_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [artistId, albumId, track.name, Math.floor(track.duration || 0), track.image || '', track.audio || '', songExtId]
        );

        if (result.affectedRows > 0) syncedSongs++;
        else {
          // 更新已有歌曲的音频 URL
          await query(
            `UPDATE songs SET audio_url = ?, cover_url = ? WHERE external_api_id = ?`,
            [track.audio || '', track.image || '', songExtId]
          );
        }
      }
    } else {
      // === 内存 fallback 存储 ===
      for (const track of data.results) {
        const artist = getOrCreateArtist(track.artist_name);
        syncedArtists++;
        const album = getOrCreateAlbum(artist.id, track.album_name || '未知专辑', track.artist_name);
        syncedAlbums++;
        getOrCreateSong(artist.id, album.id, track);
        syncedSongs++;
      }
    }

    res.json({
      success: true,
      total: data.results.length,
      syncedArtists,
      syncedAlbums,
      syncedSongs,
    });
  } catch (err) {
    console.error('POST /jamendo-data/sync error:', err.message);
    res.status(500).json({ error: '同步失败' });
  }
});

// ==================== 按歌手搜索，按专辑分组 ====================

/**
 * GET /api/jamendo-data/artist-search?q=artist_name
 * 搜索歌手，返回按专辑分组的歌曲列表
 */
router.get('/artist-search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: '请输入歌手名称' });
    }

    const { isConnected, query } = require('../db');

    if (isConnected() && dbSynced) {
      // === MySQL 查询 ===
      // 1. 先找匹配的歌手
      const artists = await query(
        `SELECT id, name, avatar_url FROM artists WHERE name LIKE ? ORDER BY name ASC LIMIT 10`,
        [`%${q}%`]
      );

      if (artists.length === 0) {
        return res.json({ artists: [], albums: [] });
      }

      // 2. 找这些歌手的专辑
      const artistIds = artists.map(a => a.id);
      const placeholders = artistIds.map(() => '?').join(',');
      const albums = await query(
        `SELECT id, artist_id, title, cover_url, release_date FROM albums
         WHERE artist_id IN (${placeholders}) ORDER BY release_date DESC`,
        artistIds
      );

      // 3. 找专辑下的歌曲
      const albumIds = albums.map(a => a.id);
      if (albumIds.length === 0) {
        return res.json({ artists, albums: [] });
      }
      const albumPlaceholders = albumIds.map(() => '?').join(',');
      const songs = await query(
        `SELECT id, artist_id, album_id, title, duration_seconds, cover_url, audio_url, external_api_id
         FROM songs WHERE album_id IN (${albumPlaceholders}) ORDER BY id ASC`,
        albumIds
      );

      // 4. 按专辑分组
      const grouped = albums.map(album => ({
        ...album,
        artist_name: artists.find(a => a.id === album.artist_id)?.name || '',
        songs: songs.filter(s => s.album_id === album.id).map(s => ({
          ...s,
          artist_name: artists.find(a => a.id === s.artist_id)?.name || '',
        })),
      }));

      return res.json({ artists, albums: grouped });
    }

    // === 内存 fallback ===
    // 确保数据已加载
    await ensureDataLoaded();

    // 搜索匹配的歌手
    const matchedArtists = [];
    for (const [key, artist] of memStore.artists) {
      const nameLower = artist.name.toLowerCase();
      if (nameLower.includes(q.toLowerCase())) {
        matchedArtists.push(artist);
      }
    }

    // 本地无结果时，从 Jamendo API 搜索并同步
    if (matchedArtists.length === 0) {
      try {
        const searchUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=50&namesearch=${encodeURIComponent(q)}&include=musicinfo&order=popularity_total`;
        const data = await nodeFetch(searchUrl).then(r => r.json());
        if (data && data.headers && data.headers.status === 'success' && data.results) {
          for (const track of data.results) {
            const artist = getOrCreateArtist(track.artist_name);
            const album = getOrCreateAlbum(artist.id, track.album_name || '未知专辑', track.artist_name);
            getOrCreateSong(artist.id, album.id, track);
            // 重新检查是否匹配
            if (artist.name.toLowerCase().includes(q.toLowerCase()) && !matchedArtists.find(a => a.id === artist.id)) {
              matchedArtists.push(artist);
            }
          }
        }
      } catch (err) {
        console.error('[ArtistSearch] Jamendo fallback failed:', err.message);
      }
    }
    matchedArtists.sort((a, b) => a.name.localeCompare(b.name));
    const topArtists = matchedArtists.slice(0, 10);

    if (topArtists.length === 0) {
      return res.json({ artists: [], albums: [] });
    }

    const artistIdSet = new Set(topArtists.map(a => a.id));

    // 找这些歌手的专辑
    const matchedAlbums = [];
    for (const [, album] of memStore.albums) {
      if (artistIdSet.has(album.artist_id)) {
        matchedAlbums.push(album);
      }
    }
    matchedAlbums.sort((a, b) => {
      if (a.release_date && b.release_date) return new Date(b.release_date) - new Date(a.release_date);
      return b.id - a.id;
    });

    // 按专辑分组歌曲
    const grouped = matchedAlbums.map(album => {
      const albumSongs = [];
      for (const [, song] of memStore.songs) {
        if (song.album_id === album.id) {
          albumSongs.push(song);
        }
      }
      const artist = topArtists.find(a => a.id === album.artist_id);
      return {
        id: album.id,
        artist_id: album.artist_id,
        title: album.title,
        cover_url: album.cover_url || (albumSongs.length > 0 ? albumSongs[0].cover_url : ''),
        release_date: album.release_date,
        artist_name: artist ? artist.name : '',
        songs: albumSongs,
      };
    });

    return res.json({ artists: topArtists, albums: grouped });
  } catch (err) {
    console.error('GET /jamendo-data/artist-search error:', err.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

// ==================== 获取已存储的歌手列表 ====================

/**
 * GET /api/jamendo-data/artists?q=keyword
 * 模糊搜索已存储的歌手
 */
router.get('/artists', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { isConnected, query } = require('../db');

    if (isConnected() && dbSynced) {
      const rows = await query(
        `SELECT id, name, avatar_url FROM artists WHERE name LIKE ? ORDER BY name ASC LIMIT 20`,
        [`%${q}%`]
      );
      return res.json(rows);
    }

    const matched = [];
    for (const [, artist] of memStore.artists) {
      if (!q || artist.name.toLowerCase().includes(q.toLowerCase())) {
        matched.push(artist);
      }
    }
    matched.sort((a, b) => a.name.localeCompare(b.name));
    res.json(matched.slice(0, 20));
  } catch (err) {
    console.error('GET /jamendo-data/artists error:', err.message);
    res.status(500).json({ error: '获取歌手列表失败' });
  }
});

// ==================== 获取歌手的专辑（含歌曲） ====================

/**
 * GET /api/jamendo-data/artist/:id/albums
 * 获取指定歌手的专辑列表，带歌曲
 */
router.get('/artist/:id/albums', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id, 10);
    const { isConnected, query } = require('../db');

    if (isConnected() && dbSynced) {
      const albums = await query(
        `SELECT id, artist_id, title, cover_url, release_date FROM albums WHERE artist_id = ? ORDER BY release_date DESC`,
        [artistId]
      );

      const albumIds = albums.map(a => a.id);
      if (albumIds.length === 0) return res.json({ albums: [] });

      const placeholders = albumIds.map(() => '?').join(',');
      const songs = await query(
        `SELECT id, artist_id, album_id, title, duration_seconds, cover_url, audio_url, external_api_id
         FROM songs WHERE album_id IN (${placeholders}) ORDER BY id ASC`,
        albumIds
      );

      const grouped = albums.map(album => ({
        ...album,
        songs: songs.filter(s => s.album_id === album.id),
      }));

      return res.json({ albums: grouped });
    }

    // 内存 fallback
    const matchedAlbums = [];
    for (const [, album] of memStore.albums) {
      if (album.artist_id === artistId) {
        const albumSongs = [];
        for (const [, song] of memStore.songs) {
          if (song.album_id === album.id) {
            albumSongs.push(song);
          }
        }
        matchedAlbums.push({ ...album, songs: albumSongs });
      }
    }
    matchedAlbums.sort((a, b) => {
      if (a.release_date && b.release_date) return new Date(b.release_date) - new Date(a.release_date);
      return b.id - a.id;
    });

    res.json({ albums: matchedAlbums });
  } catch (err) {
    console.error('GET /jamendo-data/artist/:id/albums error:', err.message);
    res.status(500).json({ error: '获取专辑失败' });
  }
});

// ==================== 搜索建议 ====================

/**
 * GET /api/jamendo-data/suggestions?q=keyword&limit=8
 * 返回匹配的歌手名作为搜索建议
 */
router.get('/suggestions', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = parseInt(req.query.limit || '8', 10);

    if (!q) return res.json([]);

    await ensureDataLoaded();

    const matched = [];
    for (const [, artist] of memStore.artists) {
      if (artist.name.toLowerCase().includes(q.toLowerCase())) {
        if (!matched.find(m => m.name === artist.name)) {
          matched.push({ id: artist.id, name: artist.name });
        }
      }
    }
    matched.sort((a, b) => a.name.localeCompare(b.name));

    res.json(matched.slice(0, limit));
  } catch (err) {
    console.error('GET /jamendo-data/suggestions error:', err.message);
    res.status(500).json({ error: '获取建议失败' });
  }
});

module.exports = router;
module.exports.ensureDataLoaded = ensureDataLoaded;