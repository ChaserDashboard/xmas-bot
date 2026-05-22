const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const { stream } = require('play-dl');
require('dotenv').config();

// ─────────────────────────────────────────────
//  Christmas Radio Streams
//  All are free, public, 24/7 Christmas streams.
//  The bot cycles through them so if one goes
//  down it automatically tries the next one.
// ─────────────────────────────────────────────
const STREAMS = [
  { name: 'Classic Christmas Radio',     url: 'https://stream.rcast.net/radio/8040/stream' },
  { name: 'Christmas Music Radio',       url: 'https://cloudstream2023.haystack.tv/live/christmas/playlist.m3u8' },
  { name: 'SomaFM Christmas Lounge',     url: 'https://ice4.somafm.com/christmas-128-mp3' },
  { name: 'SomaFM Christmas Rocks',      url: 'https://ice4.somafm.com/xmasrocks-128-mp3' },
  { name: 'SomaFM Jolly Ol\' Soul',      url: 'https://ice4.somafm.com/jollysoul-128-mp3' },
  { name: 'RadioParadise Xmas',          url: 'http://stream.radioparadise.com/christmas-128' },
  { name: 'iHeart Christmas',            url: 'https://stream.revma.ihrhls.com/zc2089/hls.m3u8' },
  { name: '977 Music Christmas',         url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/977_XMAS.mp3' },
  { name: 'JingleBell Radio',            url: 'https://jinglebell.radio/stream/high.mp3' },
  { name: 'North Pole Radio',            url: 'https://stream.laut.fm/northpoleradio' },
];

const TARGET_GUILD_ID   = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const RECONNECT_DELAY   = 5_000;   // ms before retrying after a failure
const STREAM_SWITCH_DELAY = 3_000; // ms before switching to next stream

let currentStreamIndex = 0;
let player;
let connection;
let isShuttingDown = false;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// ─────────────────────────────────────────────
//  Audio player — created once, reused forever
// ─────────────────────────────────────────────
function createPlayer() {
  const p = createAudioPlayer();

  p.on(AudioPlayerStatus.Idle, () => {
    console.log('[Player] Stream ended or went idle — switching to next stream...');
    setTimeout(playNextStream, STREAM_SWITCH_DELAY);
  });

  p.on('error', (err) => {
    console.error('[Player] Error:', err.message);
    setTimeout(playNextStream, STREAM_SWITCH_DELAY);
  });

  return p;
}

// ─────────────────────────────────────────────
//  Play — fetch stream and hand to player
// ─────────────────────────────────────────────
async function playStream(index) {
  const entry = STREAMS[index % STREAMS.length];
  console.log(`[Bot] Playing: ${entry.name} — ${entry.url}`);

  try {
    // play-dl handles both direct mp3 streams and m3u8 playlists
    const source = await stream(entry.url, { quality: 2, discordPlayerCompatibility: true });
    const resource = createAudioResource(source.stream, {
      inputType: source.type ?? StreamType.Arbitrary,
    });
    player.play(resource);
  } catch (err) {
    console.error(`[Bot] Failed to load stream "${entry.name}":`, err.message);
    currentStreamIndex = (index + 1) % STREAMS.length;
    setTimeout(() => playStream(currentStreamIndex), STREAM_SWITCH_DELAY);
  }
}

function playNextStream() {
  currentStreamIndex = (currentStreamIndex + 1) % STREAMS.length;
  playStream(currentStreamIndex);
}

// ─────────────────────────────────────────────
//  Voice connection
// ─────────────────────────────────────────────
async function connectAndPlay() {
  if (isShuttingDown) return;

  const guild = client.guilds.cache.get(TARGET_GUILD_ID);
  if (!guild) {
    console.error('[Bot] Guild not found. Check GUILD_ID in .env');
    return;
  }

  const channel = guild.channels.cache.get(TARGET_CHANNEL_ID);
  if (!channel) {
    console.error('[Bot] Voice channel not found. Check VOICE_CHANNEL_ID in .env');
    return;
  }

  try {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log('[Bot] Connected to voice channel:', channel.name);

    connection.subscribe(player);
    playStream(currentStreamIndex);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.warn('[Bot] Disconnected — attempting to reconnect...');
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        setTimeout(connectAndPlay, RECONNECT_DELAY);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.warn('[Bot] Connection destroyed — reconnecting...');
      if (!isShuttingDown) setTimeout(connectAndPlay, RECONNECT_DELAY);
    });

  } catch (err) {
    console.error('[Bot] Failed to connect:', err.message);
    setTimeout(connectAndPlay, RECONNECT_DELAY);
  }
}

// ─────────────────────────────────────────────
//  Client events
// ─────────────────────────────────────────────
client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  player = createPlayer();
  connectAndPlay();
});

// Keep the bot alive in environments that kill idle processes
setInterval(() => {
  if (client.isReady()) {
    client.user.setActivity('Christmas music 24/7', { type: 2 }); // LISTENING
  }
}, 10 * 60 * 1000); // every 10 minutes

// ─────────────────────────────────────────────
//  Graceful shutdown
// ─────────────────────────────────────────────
process.on('SIGINT', () => {
  isShuttingDown = true;
  console.log('[Bot] Shutting down...');
  if (connection) connection.destroy();
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
