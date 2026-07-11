const http = require('http');
const assert = require('assert');

// 动态加载被测应用（后面会创建 server.js）
let app;
try {
  app = require('../server');
} catch (e) {
  console.log('FAIL: server.js 尚未创建或导出 app');
  process.exit(1);
}

const PORT = 9999;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  let server;
  try {
    server = app.listen(PORT, () => {
      console.log('Test server started on port', PORT);
    });
  } catch (e) {
    console.log('FAIL: 无法启动测试服务器');
    console.error(e.message);
    process.exit(1);
  }

  // 等待服务器启动
  await new Promise(r => setTimeout(r, 500));

  let passed = 0;
  let failed = 0;

  // Test 1: GET /api/songs 返回歌曲列表
  try {
    const res = await request('/api/songs');
    assert.strictEqual(res.status, 200, '状态码应为 200');
    assert.ok(Array.isArray(res.body), '响应体应为数组');
    assert.ok(res.body.length > 0, '歌曲列表不应为空');
    const song = res.body[0];
    assert.ok(song.id !== undefined, '歌曲应有 id');
    assert.ok(song.title, '歌曲应有 title');
    assert.ok(song.cover_url !== undefined, '歌曲应有 cover_url（背景同步需要）');
    console.log('PASS GET /api/songs 返回歌曲列表');
    passed++;
  } catch (e) {
    console.log('FAIL GET /api/songs:', e.message);
    failed++;
  }

  // Test 2: GET /api/artists 返回歌手列表
  try {
    const res = await request('/api/artists');
    assert.strictEqual(res.status, 200, '状态码应为 200');
    assert.ok(Array.isArray(res.body), '响应体应为数组');
    assert.ok(res.body.length > 0, '歌手列表不应为空');
    assert.ok(res.body[0].name, '歌手应有 name');
    console.log('PASS GET /api/artists 返回歌手列表');
    passed++;
  } catch (e) {
    console.log('FAIL GET /api/artists:', e.message);
    failed++;
  }

  // Test 3: GET /api/artists/:id/albums 按发行时间倒序返回专辑
  try {
    const artistsRes = await request('/api/artists');
    const artistId = artistsRes.body[0].id;
    const res = await request(`/api/artists/${artistId}/albums`);
    assert.strictEqual(res.status, 200, '状态码应为 200');
    assert.ok(Array.isArray(res.body), '响应体应为数组');
    assert.ok(res.body.length > 0, '专辑列表不应为空');
    // 验证按发行时间倒序
    for (let i = 0; i < res.body.length - 1; i++) {
      const d1 = new Date(res.body[i].release_date).getTime();
      const d2 = new Date(res.body[i + 1].release_date).getTime();
      assert.ok(d1 >= d2, `专辑应按发行时间倒序排列: ${res.body[i].title} vs ${res.body[i+1].title}`);
    }
    console.log('PASS GET /api/artists/:id/albums 按时间倒序返回专辑');
    passed++;
  } catch (e) {
    console.log('FAIL GET /api/artists/:id/albums:', e.message);
    failed++;
  }

  // Test 4: GET /api/albums/:id/songs 返回专辑单曲列表
  try {
    const artistsRes = await request('/api/artists');
    const artistId = artistsRes.body[0].id;
    const albumsRes = await request(`/api/artists/${artistId}/albums`);
    const albumId = albumsRes.body[0].id;
    const res = await request(`/api/albums/${albumId}/songs`);
    assert.strictEqual(res.status, 200, '状态码应为 200');
    assert.ok(Array.isArray(res.body), '响应体应为数组');
    assert.ok(res.body.length > 0, '专辑应有歌曲');
    assert.ok(res.body[0].title, '歌曲应有 title');
    console.log('PASS GET /api/albums/:id/songs 返回专辑单曲列表');
    passed++;
  } catch (e) {
    console.log('FAIL GET /api/albums/:id/songs:', e.message);
    failed++;
  }

  // Test 5: GET /api/songs/:id 返回歌曲详情（含 cover_url，用于背景同步）
  try {
    const songsRes = await request('/api/songs');
    const songId = songsRes.body[0].id;
    const res = await request(`/api/songs/${songId}`);
    assert.strictEqual(res.status, 200, '状态码应为 200');
    assert.ok(res.body.id, '歌曲详情应有 id');
    assert.ok(res.body.title, '歌曲详情应有 title');
    assert.ok(res.body.cover_url !== undefined, '歌曲详情应有 cover_url，前端背景同步依赖此字段');
    console.log('PASS GET /api/songs/:id 返回歌曲详情（含 cover_url）');
    passed++;
  } catch (e) {
    console.log('FAIL GET /api/songs/:id:', e.message);
    failed++;
  }

  server.close(() => {
    console.log(`\n测试完成: ${passed} 通过, ${failed} 失败`);
    process.exit(failed > 0 ? 1 : 0);
  });
}

runTests();
