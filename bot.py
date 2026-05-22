import discord
import asyncio
import yt_dlp
import os
from dotenv import load_dotenv

load_dotenv()

STREAMS = [
    {'name': 'Video 1', 'url': 'https://youtu.be/8-Qx2kpTImA?si=wNB-wbKoXlc9fukG'},
    {'name': 'Video 2', 'url': 'https://youtu.be/zw0xIbiw8fo?si=1eHsUgYfWF0MChqs'},
    {'name': 'Video 3', 'url': 'https://youtu.be/JN0lN2S_3jE?si=DUuro_vGcLTG2VwJ'},
    {'name': 'Video 4', 'url': 'https://youtu.be/YUCMqFrJ2aM?si=sbgLA5kW_ms26IJt'},
    {'name': 'Video 5', 'url': 'https://youtu.be/fefwYey8rAs?si=Q6oMZBguyOtr_f3L'},
]

GUILD_ID = int(os.getenv('GUILD_ID'))
VOICE_CHANNEL_ID = int(os.getenv('VOICE_CHANNEL_ID'))

COOKIES_FILE = '/app/cookies.txt'

YDL_OPTS = {
    'format': 'bestaudio/best',
    'quiet': True,
    'no_warnings': True,
    'cookiefile': COOKIES_FILE,
}

FFMPEG_OPTS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn',
}

intents = discord.Intents.default()
intents.voice_states = True
client = discord.Client(intents=intents)

current_index = 0


def get_audio_url(url):
    with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
        info = ydl.extract_info(url, download=False)
        return info['url']


async def play_next(vc):
    global current_index
    entry = STREAMS[current_index % len(STREAMS)]
    print(f'[Bot] Now playing: {entry["name"]}')

    try:
        audio_url = await asyncio.get_event_loop().run_in_executor(None, get_audio_url, entry['url'])
        source = discord.FFmpegPCMAudio(audio_url, **FFMPEG_OPTS)

        def after_play(error):
            global current_index
            if error:
                print(f'[Bot] Player error: {error}')
            current_index = (current_index + 1) % len(STREAMS)
            asyncio.run_coroutine_threadsafe(play_next(vc), client.loop)

        vc.play(source, after=after_play)
    except Exception as e:
        print(f'[Bot] Failed to play {entry["name"]}: {e}')
        current_index = (current_index + 1) % len(STREAMS)
        await asyncio.sleep(3)
        await play_next(vc)


@client.event
async def on_ready():
    print(f'[Bot] Logged in as {client.user}')
    await asyncio.sleep(2)

    guild = client.get_guild(GUILD_ID)
    if not guild:
        print('[Bot] Guild not found!')
        return

    channel = guild.get_channel(VOICE_CHANNEL_ID)
    if not channel:
        print('[Bot] Channel not found!')
        return

    print(f'[Bot] Joining: {channel.name} (type: {channel.type})')
    vc = await channel.connect()

    # If it's a stage channel, request to speak
    if isinstance(channel, discord.StageChannel):
        print('[Bot] Stage channel — requesting to speak...')
        try:
            await guild.me.edit(suppress=False)
            print('[Bot] Now a speaker!')
        except Exception as e:
            print(f'[Bot] Could not become speaker: {e}')
            try:
                await guild.me.request_to_speak()
                print('[Bot] Requested to speak!')
            except Exception as e2:
                print(f'[Bot] Request to speak failed: {e2}')

    print('[Bot] Starting playback...')
    await play_next(vc)

    while True:
        await client.change_presence(activity=discord.Activity(
            type=discord.ActivityType.listening, name='music 24/7'))
        await asyncio.sleep(600)


client.run(os.getenv('DISCORD_TOKEN'))
