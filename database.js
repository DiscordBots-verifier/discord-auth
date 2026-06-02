const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT,
      last_login TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_guilds (
      user_id TEXT,
      guild_id TEXT,
      guild_name TEXT,
      is_owner INTEGER,
      PRIMARY KEY (user_id, guild_id)
    )
  `);
});

module.exports = db;