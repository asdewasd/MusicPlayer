/**
 * 音频生成服务
 * 根据歌曲元数据生成简单 WAV 音频，使播放器真正可播放
 * 每首歌根据其 ID 生成不同的旋律，ID 相同时旋律一致（可缓存）
 * 
 * 同时支持 Jamendo API 代理（需要 JAMENDO_CLIENT_ID）
 */
const express = require('express');

const router = express.Router();

// ==================== WAV 音频生成 ====================

// 音符频率表（C4-B4 八度）
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00, B5: 987.77,
};

// 不同风格的旋律模板
const MELODY_TEMPLATES = [
  // 1. 上行音阶风格
  ['C4','D4','E4','F4','G4','A4','B4','C5','B4','A4','G4','F4','E4','D4','C4'],
  // 2. 三和弦风格
  ['C4','E4','G4','C5','G4','E4','C4','E4','G4','E4','C4'],
  // 3. 五声音阶
  ['C4','D4','E4','G4','A4','C5','A4','G4','E4','D4','C4'],
  // 4. 小调风格
  ['A4','C5','E5','A4','C5','E5','D5','C5','B4','A4'],
  // 5. 跳跃风格
  ['C4','G4','E4','A4','F4','C5','G4','E4','C4'],
  // 6. 下行音阶
  ['C5','B4','A4','G4','F4','E4','D4','C4','D4','E4','F4','G4','A4','B4','C5'],
  // 7. 华尔兹风格
  ['C4','E4','G4','G4','E4','G4','C5','C5','G4','E4','C4'],
  // 8. 布鲁斯风格
  ['C4','E4','G4','A4','A4','G4','E4','C4','E4','G4','A4','C5','A4','G4','E4','C4'],
];

// 和弦进行（同时播放多个音符）
const CHORD_PROGRESSIONS = [
  [['C4','E4','G4'], ['F4','A4','C5'], ['G4','B4','D5'], ['C4','E4','G4']],
  [['A4','C5','E5'], ['D4','F4','A4'], ['E4','G4','B4'], ['A4','C5','E5']],
  [['C4','E4','G4'], ['A4','C5','E5'], ['F4','A4','C5'], ['G4','B4','D5']],
];

/**
 * 生成 WAV 文件头
 */
function createWavHeader(dataLength, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4); // 文件大小 - 8
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

/**
 * 生成音频采样数据
 * @param {number} songId - 歌曲 ID，用于确定性生成
 * @param {number} durationSeconds - 时长（秒）
 * @returns {Buffer} PCM 音频数据
 */
function generateAudioSamples(songId, durationSeconds) {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const sampleBuffer = Buffer.alloc(totalSamples * 2); // 16-bit = 2 bytes per sample

  // 根据 songId 选择旋律和风格
  const melodyIdx = (songId - 1) % MELODY_TEMPLATES.length;
  const melody = MELODY_TEMPLATES[melodyIdx];
  const chordIdx = (songId - 1) % CHORD_PROGRESSIONS.length;
  const chords = CHORD_PROGRESSIONS[chordIdx];

  // 每拍时长（秒），根据 ID 变化节奏
  const bpm = 80 + (songId * 13) % 60; // 80-140 BPM
  const beatDuration = 60 / bpm;
  const notesPerBeat = 1 + ((songId * 7) % 3); // 1-4 个音符每拍
  const noteDuration = beatDuration / notesPerBeat;

  // 生成音符序列
  const noteSequence = [];
  let currentTime = 0;
  let melodyPos = 0;
  let chordPos = 0;

  while (currentTime < durationSeconds) {
    // 插入和弦音符（每4拍）
    if (Math.floor(currentTime / beatDuration) % 4 === 0) {
      const chord = chords[chordPos % chords.length];
      for (const noteName of chord) {
        noteSequence.push({
          time: currentTime,
          freq: NOTES[noteName],
          duration: beatDuration * 0.9,
          volume: 0.15, // 和弦音量较低
        });
      }
      chordPos++;
    }

    // 插入旋律音符
    const noteName = melody[melodyPos % melody.length];
    noteSequence.push({
      time: currentTime,
      freq: NOTES[noteName],
      duration: noteDuration * 0.85,
      volume: 0.35, // 旋律音量
    });

    melodyPos++;
    currentTime += noteDuration;
  }

  // 填充采样数据
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of noteSequence) {
      if (t >= note.time && t < note.time + note.duration) {
        const elapsed = t - note.time;
        // ADSR 包络
        const attack = 0.02;
        const decay = 0.1;
        const sustain = 0.7;
        const release = 0.15;
        let envelope;
        if (elapsed < attack) {
          envelope = elapsed / attack;
        } else if (elapsed < attack + decay) {
          envelope = 1 - (1 - sustain) * ((elapsed - attack) / decay);
        } else if (elapsed < note.duration - release) {
          envelope = sustain;
        } else {
          const releaseTime = elapsed - (note.duration - release);
          envelope = sustain * (1 - releaseTime / release);
        }
        if (envelope < 0) envelope = 0;

        // 正弦波 + 少量泛音
        const wave = Math.sin(2 * Math.PI * note.freq * elapsed)
          + 0.3 * Math.sin(2 * Math.PI * note.freq * 2 * elapsed)
          + 0.1 * Math.sin(2 * Math.PI * note.freq * 3 * elapsed);

        sample += wave * envelope * note.volume;
      }
    }

    // 限幅
    if (sample > 1) sample = 1;
    if (sample < -1) sample = -1;

    // 16-bit PCM
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    sampleBuffer.writeInt16LE(intSample, i * 2);
  }

  return sampleBuffer;
}

// 缓存已生成的音频（避免重复生成）
const audioCache = new Map();
const MAX_CACHE_SIZE = 20;

// GET /api/audio/:id — 获取歌曲音频
router.get('/:id', (req, res) => {
  try {
    const songId = parseInt(req.params.id, 10);
    if (isNaN(songId) || songId < 1) {
      return res.status(400).json({ error: '无效的歌曲 ID' });
    }

    // 检查缓存
    const cacheKey = `song_${songId}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey);
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': cached.length,
        'Cache-Control': 'public, max-age=3600',
      });
      return res.send(cached);
    }

    // 获取歌曲时长（从 fallback 数据或使用默认值）
    const { isConnected } = require('../db');
    const { query } = require('../db');

    // 使用默认时长，实际从数据库获取
    let durationSeconds = 30; // 默认 30 秒预览

    // 从内存 fallback 数据查找时长
    const fallbackSongs = [
      { id: 1, duration_seconds: 30 },
      { id: 2, duration_seconds: 30 },
      { id: 3, duration_seconds: 30 },
      { id: 4, duration_seconds: 30 },
      { id: 5, duration_seconds: 30 },
      { id: 6, duration_seconds: 30 },
      { id: 7, duration_seconds: 30 },
      { id: 8, duration_seconds: 30 },
      { id: 9, duration_seconds: 30 },
      { id: 10, duration_seconds: 30 },
    ];
    const song = fallbackSongs.find(s => s.id === songId);
    if (song) {
      durationSeconds = Math.min(song.duration_seconds || 30, 60); // 最多 60 秒
    }

    // 生成音频
    const samples = generateAudioSamples(songId, durationSeconds);
    const header = createWavHeader(samples.length);
    const wavBuffer = Buffer.concat([header, samples]);

    // 缓存
    if (audioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioCache.keys().next().value;
      audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, wavBuffer);

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': wavBuffer.length,
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(wavBuffer);
  } catch (err) {
    console.error('GET /api/audio/:id error:', err.message);
    res.status(500).json({ error: '音频生成失败' });
  }
});

// ==================== Jamendo API 代理（可选） ====================

const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

// GET /api/audio/jamendo/search?q=keyword
router.get('/jamendo/search', async (req, res) => {
  try {
    if (!CLIENT_ID) {
      return res.status(503).json({ error: 'Jamendo API 未配置，请在 .env 中添加 JAMENDO_CLIENT_ID。免费注册: https://developer.jamendo.com/v3.0/' });
    }

    const q = req.query.q || '';
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const fetch = require('node-fetch');
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&namesearch=${encodeURIComponent(q)}&include=musicinfo`;

    const data = await fetch(url).then(r => r.json());

    if (!data || data.headers.status !== 'success') {
      return res.status(400).json({ error: '搜索失败', details: data?.headers?.error_message });
    }

    const results = (data.results || []).map(track => ({
      id: track.id,
      title: track.name,
      artist_name: track.artist_name,
      album_name: track.album_name,
      duration: track.duration,
      audio_url: track.audio,
      cover_url: track.image,
    }));

    res.json({ total: data.headers.results_full, results });
  } catch (err) {
    console.error('GET /api/audio/jamendo/search error:', err.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

// GET /api/audio/jamendo/featured
router.get('/jamendo/featured', async (req, res) => {
  try {
    if (!CLIENT_ID) {
      return res.status(503).json({ error: 'Jamendo API 未配置' });
    }

    const limit = parseInt(req.query.limit || '10', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const fetch = require('node-fetch');
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&offset=${offset}&include=musicinfo&order=popularity_total`;

    const data = await fetch(url).then(r => r.json());

    if (!data || data.headers.status !== 'success') {
      return res.status(400).json({ error: '获取推荐失败' });
    }

    const results = (data.results || []).map(track => ({
      id: track.id,
      title: track.name,
      artist_name: track.artist_name,
      album_name: track.album_name,
      duration: track.duration,
      audio_url: track.audio,
      cover_url: track.image,
    }));

    res.json(results);
  } catch (err) {
    console.error('GET /api/audio/jamendo/featured error:', err.message);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

// GET /api/audio/jamendo/suggestions?q=keyword&limit=8
// 直接从 Jamendo API 搜索并返回歌手名建议列表
router.get('/jamendo/suggestions', async (req, res) => {
  try {
    if (!CLIENT_ID) {
      return res.json([]);
    }

    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '8', 10), 20);

    if (!q) return res.json([]);

    const fetch = require('node-fetch');
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit * 4}&namesearch=${encodeURIComponent(q)}&include=musicinfo&order=popularity_total`;

    const data = await fetch(url).then(r => r.json());

    if (!data || data.headers.status !== 'success' || !data.results) {
      return res.json([]);
    }

    // 去重提取歌手名、歌曲名和专辑名
    const seen = new Set();
    const suggestions = [];

    for (const track of data.results) {
      // 歌手名
      if (track.artist_name && !seen.has('artist:' + track.artist_name)) {
        seen.add('artist:' + track.artist_name);
        suggestions.push({
          id: 'a_' + track.artist_id,
          name: track.artist_name,
          type: 'artist',
          artist_name: '',
          track_name: '',
          image: track.image
        });
      }
      // 歌曲名
      if (track.name && !seen.has('track:' + track.id)) {
        seen.add('track:' + track.id);
        suggestions.push({
          id: 't_' + track.id,
          name: track.name,
          type: 'track',
          artist_name: track.artist_name,
          track_name: track.name,
          image: track.image
        });
      }
      // 专辑名
      if (track.album_name && !seen.has('album:' + track.album_name)) {
        seen.add('album:' + track.album_name);
        suggestions.push({
          id: 'al_' + track.album_id,
          name: track.album_name,
          type: 'album',
          artist_name: track.artist_name,
          track_name: track.album_name,
          image: track.image
        });
      }
      if (suggestions.length >= limit) break;
    }

    res.json(suggestions.slice(0, limit));
  } catch (err) {
    console.error('GET /api/audio/jamendo/suggestions error:', err.message);
    res.json([]);
  }
});

module.exports = router;