require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, REDIRECT_URI } = process.env;
const SCOPES = 'identify'; // guilds = see what servers they're in

// --- Route 1: Home page with login button ---
app.get('/', (req, res) => {
  res.send(`<a href="/login">Login with Discord</a>`);
});

// --- Route 2: Redirect user to Discord ---
app.get('/login', (req, res) => {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  res.redirect(url.toString());
});

// --- Route 3: Discord sends user back here after login ---
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code provided');

  // Exchange code for token
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Fetch user profile
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const user = await userRes.json();

  // ✅ CHECK: block anyone who isn't you
  if (user.id !== process.env.ALLOWED_USER_ID) {
    return res.redirect('https://discord.com/app');
    }

// Fetch servers (only reaches here if it's you)
  const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const guilds = await guildsRes.json();
  res.send(`<p>${user.username}${guilds.map(g => `, ${g.name}`).join('')}</p>`);
});
app.listen(3000, () => console.log('Running at http://localhost:3000'));