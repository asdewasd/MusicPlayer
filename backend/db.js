require('dotenv').config();
const mysql = require('mysql2/promise');

let pool = null;
let connected = false;

async function initDb() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'MusicPlayer',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 3000,
    });
    // 测试连接
    await pool.execute('SELECT 1');
    connected = true;
    console.log('MySQL connected to', process.env.DB_NAME);
  } catch (err) {
    connected = false;
    console.warn('MySQL connection failed:', err.message);
    console.warn('Running with in-memory fallback data.');
  }
}

async function query(sql, params) {
  if (!connected || !pool) {
    throw new Error('Database not connected');
  }
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function isConnected() {
  return connected;
}

module.exports = { initDb, query, isConnected };
