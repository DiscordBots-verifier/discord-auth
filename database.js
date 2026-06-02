const fs = require('fs');
const DB_FILE = 'data.json';

// Initialize file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, guilds: {} }));
}

function read() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function saveUser(user) {
  const db = read();
  db.users[user.id] = {
    id: user.id,
    username: user.username,
    email: user.email,
    last_login: new Date().toISOString(),
  };
  write(db);
}

function saveGuilds(userId, guilds) {
  const db = read();
  db.guilds[userId] = guilds.map(g => ({
    guild_id: g.id,
    guild_name: g.name,
    is_owner: g.owner ? true : false,
  }));
  write(db);
}

function getAllUsers() {
  return Object.values(read().users);
}

function getAllGuilds() {
  const db = read();
  return Object.entries(db.guilds).flatMap(([userId, guilds]) =>
    guilds.map(g => ({ user_id: userId, ...g }))
  );
}

module.exports = { saveUser, saveGuilds, getAllUsers, getAllGuilds };