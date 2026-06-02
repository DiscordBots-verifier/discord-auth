require('dotenv').config();
const express = require('express');
const db = require('./database');

const app = express();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Only me middleware
function onlyMe(req, res, next) {
  if (req.query.secret !== SESSION_SECRET) {
    return res.redirect('https://discord.com');
  }
  next();
}

// Home
app.get('/', (req, res) => {
  res.send('<a href="/login">Login with Discord</a>');
});

// Login
app.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'guilds',
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// Callback
app.get('/callback', async (req, res) => {
  try {
    console.log('Callback reached');
    console.log('Query:', req.query);

    const code = req.query.code;
    if (!code) {
      console.log('No code in query');
      return res.redirect('https://discord.com');
    }

    // Get token
console.log('Sending to Discord:', {
client_id: CLIENT_ID,
client_secret: CLIENT_SECRET ? 'exists' : 'MISSING',
grant_type: 'authorization_code',
code: code,
redirect_uri: REDIRECT_URI,
});

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token data:', tokenData);

    if (!tokenData.access_token) {
      console.log('No access token received');
      return res.send('Auth failed, check terminal for details');
    }

    const accessToken = tokenData.access_token;

    // Get user
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userResponse.json();
    console.log('User:', user);

    // Block non-you
    if (user.id !== ALLOWED_USER_ID) {
      return res.redirect('https://discord.com');
    }

    // Get guilds
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guildsData = await guildsResponse.json();
    console.log('Guilds response:', guildsData);
    const guilds = Array.isArray(guildsData) ? guildsData : [];
    console.log('Guilds count:', guilds.length);

    // Save to database
    db.prepare(`
      INSERT OR REPLACE INTO users (id, username, email, last_login)
      VALUES (?, ?, ?, ?)
    `).run(user.id, user.username, user.email, new Date().toISOString());

    const insertGuild = db.prepare(`
      INSERT OR REPLACE INTO user_guilds (user_id, guild_id, guild_name, is_owner)
      VALUES (?, ?, ?, ?)
    `);
    for (const guild of guilds) {
      insertGuild.run(user.id, guild.id, guild.name, guild.owner ? 1 : 0);
    }

    // Show page
    res.send(`
      <h1>Welcome, ${user.username}!</h1>
      <p>Email: ${user.email}</p>
      <h2>Your Servers (${guilds.length}):</h2>
      <ul>
        ${guilds.map(g => `<li>${g.name} ${g.owner ? '👑' : ''}</li>`).join('')}
      </ul>
      <br>
      <a href="/data?secret=${SESSION_SECRET}">View saved data</a>
    `);

  } catch (err) {
    console.error('Error in callback:', err);
    res.send('Something went wrong, check terminal');
  }
});

// Data view
app.get('/data', onlyMe, (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  const guilds = db.prepare('SELECT * FROM user_guilds').all();

  res.send(`
    <h1>Saved Users</h1>
    <table border="1" cellpadding="8">
      <tr><th>ID</th><th>Username</th><th>Email</th><th>Last Login</th></tr>
      ${users.map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>${u.last_login}</td>
        </tr>
      `).join('')}
    </table>

    <h1>Saved Servers</h1>
    <table border="1" cellpadding="8">
      <tr><th>UserID</th><th>ID</th><th>Name</th><th>Own</th></tr>
      ${guilds.map(g => `
        <tr>
          <td>${g.user_id}</td>
          <td>${g.guild_id}</td>
          <td>${g.guild_name}</td>
          <td>${g.is_owner ? 'Y' : 'N'}</td>
        </tr>
      `).join('')}
    </table>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  console.log('Client ID:', CLIENT_ID);
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('Allowed User ID:', ALLOWED_USER_ID);
});