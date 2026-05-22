# 🎄 24/7 Christmas Music Bot

A Discord bot that auto-joins a voice channel and streams Christmas music around the clock. No commands needed — it just plays forever.

---

## Files

```
xmas-bot/
├── bot.js           ← All the bot logic
├── package.json     ← Dependencies
├── .env.example     ← Copy this to .env and fill it in
├── Dockerfile       ← For cloud hosting (Railway, Render, Fly.io)
├── railway.toml     ← Railway-specific config
└── .gitignore
```

---

## Step 1 — Create your Discord bot

1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name (e.g. "Christmas Radio")
3. Go to the **Bot** tab → click **Add Bot**
4. Under **Token**, click **Reset Token** → copy it → paste into your `.env` as `DISCORD_TOKEN`
5. Scroll down to **Privileged Gateway Intents** → enable **Server Members Intent** and **Message Content Intent**
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Connect`, `Speak`, `Use Voice Activity`
7. Copy the generated URL → open it in your browser → add the bot to your server

---

## Step 2 — Get your IDs

In Discord, go to **Settings → Advanced → enable Developer Mode**.

- Right-click your **server name** → **Copy Server ID** → paste as `GUILD_ID`
- Right-click the **voice channel** the bot should join → **Copy Channel ID** → paste as `VOICE_CHANNEL_ID`

---

## Step 3 — Choose how to run it

### Option A — Railway (recommended, free tier available)

1. Push this folder to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub repo
3. Add your environment variables under **Variables**:
   - `DISCORD_TOKEN`
   - `GUILD_ID`
   - `VOICE_CHANNEL_ID`
4. Railway reads `railway.toml` and `Dockerfile` automatically — it will deploy and stay running 24/7

### Option B — Render (free tier)

1. Push to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your repo, set **Environment** to Docker
4. Add the same 3 environment variables
5. Deploy — Render will keep it alive

### Option C — Run locally (for testing)

```bash
# Install Node.js 18+ first if you haven't already

# 1. Install dependencies
npm install

# 2. Copy the env template and fill it in
cp .env.example .env
# (edit .env with your token and IDs)

# 3. Start the bot
npm start
```

---

## How it works

- On startup the bot joins the configured voice channel
- It picks the first stream from the list in `bot.js` and starts playing
- If a stream dies or goes idle, it automatically switches to the next one in the list
- If the bot gets disconnected from the voice channel, it reconnects automatically
- The stream list rotates, so there is always a fallback

### Changing streams

All streams are listed near the top of `bot.js` in the `STREAMS` array. Each entry has a `name` (just for your logs) and a `url` (any direct mp3 stream or m3u8 playlist URL works).

```js
const STREAMS = [
  { name: 'My Custom Station', url: 'https://example.com/stream.mp3' },
  // add as many as you want
];
```

Free 24/7 Christmas streams you can add:
- SomaFM Christmas Lounge: `https://ice4.somafm.com/christmas-128-mp3`
- SomaFM Christmas Rocks: `https://ice4.somafm.com/xmasrocks-128-mp3`
- 977 Music Xmas: `https://playerservices.streamtheworld.com/api/livestream-redirect/977_XMAS.mp3`

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot joins but no sound | Make sure the bot has `Speak` and `Connect` permissions in that channel |
| "Guild not found" error | Double-check `GUILD_ID` — make sure it's the server ID, not a channel ID |
| Bot keeps disconnecting | Normal on free-tier hosts — `railway.toml` auto-restarts it |
| Stream not playing | The stream URL may be down; the bot will cycle to the next one automatically |
