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
const ytdl = require('ytdl-core');
require('dotenv').config();

// Fix encryption error — load libsodium before anything else
const sodium = require('libsodium-wrappers');
sodium.ready.then(() => {
  console.log('[Bot] Sodium ready');
});

const STREAMS = [
  { name: 'Video 1', url: 'https://youtu.be/8-Qx2kpTImA?si=wNB-wbKoXlc9fukG' },
  { name: 'Video 2', url: 'https://youtu.be/zw0xIbiw8fo?si=1eHsUgYfWF0MChqs' },
  { name: 'Video 3', url: 'https://youtu.be/JN0lN2S_3jE?si=DUuro_vGcLTG2VwJ' },
  { name: 'Video 4', url: 'https://youtu.be/YUCMqFrJ2aM?si=sbgLA5kW_ms26IJt' },
  { name: 'Video 5', url: 'https://youtu.be/fefwYey8rAs?si=Q6oMZBguyOtr_f3L' },
];

const TARGET_GUILD_ID    = process.env.GUILD_ID;
const TARGET_CHANNEL_ID  = process.env.VOICE_CHANNEL_ID;
const RECONNECT_DELAY    = 5_000;
const STREAM_SWITCH_DELAY = 3_000;

let currentStreamIndex = 0;
let player;
let connection;
let isShuttingDown = false;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

function createPlayer() {
  const p = createAudioPlayer();

  p.on(AudioPlayerStatus.Idle, () => {
    console.log('[Player] Video ended — moving to next...');
    setTimeout(playNextStream, STREAM_SWITCH_DELAY);
  });

  p.on('error', (err) => {
    console.error('[Player] Error:', err.message);
    setTimeout(playNextStream, STREAM_SWITCH_DELAY);
  });

  return p;
}

async function playStream(index) {
  const entry = STREAMS[index % STREAMS.length];
  console.log(`[Bot] Now playing: ${entry.name} — ${entry.url}`);

  try {
    const ytStream = ytdl(entry.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(ytStream, {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
  } catch (err) {
    console.error(`[Bot] Failed to load "${entry.name}":`, err.message);
    currentStreamIndex = (index + 1) % STREAMS.length;
    setTimeout(() => playStream(currentStreamIndex), STREAM_SWITCH_DELAY);
  }
}

function playNextStream() {
  currentStreamIndex = (currentStreamIndex + 1) % STREAMS.length;
  playStream(currentStreamIndex);
}

async function connectAndPlay() {
  if (isShuttingDown) return;

  const guild = client.guilds.cache.get(TARGET_GUILD_ID);
  if (!guild) { console.error('[Bot] Guild not found'); return; }

  const channel = guild.channels.cache.get(TARGET_CHANNEL_ID);
  if (!channel) { console.error('[Bot] Voice channel not found'); return; }

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
      console.warn('[Bot] Disconnected — reconnecting...');
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
      if (!isShuttingDown) setTimeout(connectAndPlay, RECONNECT_DELAY);
    });

  } catch (err) {
    console.error('[Bot] Failed to connect:', err.message);
    setTimeout(connectAndPlay, RECONNECT_DELAY);
  }
}

client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  await sodium.ready;
  player = createPlayer();
  connectAndPlay();
});

setInterval(() => {
  if (client.isReady()) {
    client.user.setActivity('music 24/7', { type: 2 });
  }
}, 10 * 60 * 1000);

process.on('SIGINT', () => {
  isShuttingDown = true;
  if (connection) connection.destroy();
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
