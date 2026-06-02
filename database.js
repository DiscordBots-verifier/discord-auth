const Database = require('better-sqlite3');
const db = new Database('data.db');

// Create a table to store user + server data
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS user_guilds (
    user_id TEXT,
    guild_id TEXT,
    guild_name TEXT,
    is_owner INTEGER,
    PRIMARY KEY (user_id, guild_id)
  );
`);

module.exports = db;