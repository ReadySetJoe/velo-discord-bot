# Twitch Clip Discord Bot - Multi-Broadcaster Support

A Discord bot that automatically fetches clips from multiple Twitch channels and posts them to a Discord channel.

## ✨ Features

- 🔄 Automatically checks for new clips every 5 minutes
- 📺 **Supports multiple Twitch channels** - track clips from all your favorite streamers!
- 🎨 Posts clips with rich embeds including title, creator, views, and thumbnail
- 💾 Tracks posted clips to avoid duplicates
- 🏷️ Clearly labels which broadcaster each clip is from
- ⚡ Easy to set up and configure

## Prerequisites

- Node.js (v16 or higher)
- A Discord account and server
- A Twitch account

## Quick Start

### 1. Set Up Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under "TOKEN", click "Reset Token" and copy it
5. Enable the following Privileged Gateway Intents:
   - Presence Intent
   - Server Members Intent
6. Go to "OAuth2" > "URL Generator"
7. Select scopes: `bot`
8. Select permissions: `Send Messages`, `Embed Links`, `Read Messages/View Channels`
9. Use the generated URL to add the bot to your server

### 2. Get Discord Channel ID

1. Enable Developer Mode: Settings > Advanced > Developer Mode
2. Right-click the channel where you want clips posted
3. Click "Copy Channel ID"

### 3. Create Twitch Application

1. Go to https://dev.twitch.tv/console/apps
2. Click "Register Your Application"
3. Fill in the details (use `http://localhost` for OAuth Redirect URL)
4. Click "Create" then "Manage"
5. Copy the "Client ID" and generate a "Client Secret"

### 4. Install and Configure

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_channel_id
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
TWITCH_BROADCASTER_NAMES=streamer1,streamer2,streamer3
```

### 5. Run the Bot

```bash
# Start the bot
npm start

# Or for development with auto-restart
npm run dev
```

## 📺 Multiple Broadcasters

To track multiple Twitch channels, simply list them separated by commas:

```env
# Single broadcaster
TWITCH_BROADCASTER_NAMES=shroud

# Multiple broadcasters
TWITCH_BROADCASTER_NAMES=shroud,pokimane,ninja,xqc

# Spaces are automatically trimmed
TWITCH_BROADCASTER_NAMES=shroud, pokimane, ninja
```

The bot will:

- Check all broadcasters for new clips
- Post clips from any of them to your Discord channel
- Clearly label which broadcaster each clip is from
- Track clips separately to avoid duplicates

## How It Works

1. Bot authenticates with Discord and Twitch APIs
2. Every 5 minutes, checks each broadcaster for clips from the last 24 hours
3. New clips are posted to Discord with rich embeds
4. Clip IDs are saved to `posted_clips.json` to prevent duplicates
5. All clips are sorted chronologically before posting

## Customization

Edit `twitch-clip-bot.js` to customize:

**Check interval:**

```javascript
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (in milliseconds)
```

**Clip timeframe:**

```javascript
// In fetchRecentClips function
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
```

**Embed appearance:**

```javascript
// In postClipToDiscord function
const embed = new EmbedBuilder()
  .setColor("#9146FF") // Change color
  .setTitle(clip.title);
// ... customize other fields
```

**Clips per check:**

```javascript
// In fetchRecentClips function
params: {
    broadcaster_id: broadcasterId,
    started_at: oneDayAgo,
    first: 20 // Maximum 100
}
```

## Project Structure

```
twitch-clip-bot/
├── twitch-clip-bot.js      # Main bot (for 24/7 hosting)
├── check-clips.js           # GitHub Actions version
├── package.json             # Dependencies
├── .env                     # Configuration (create from .env.example)
├── .env.example             # Configuration template
├── posted_clips.json        # Posted clips tracker (auto-generated)
└── README.md                # This file
```

## Hosting Options

### Option 1: Railway (Recommended)

- ✅ Easiest setup
- ✅ Free tier available
- See `DEPLOY_RAILWAY.md`

### Option 2: GitHub Actions

- ✅ Completely free
- ⚠️ 15-minute minimum interval
- See `DEPLOY_GITHUB_ACTIONS.md`

### Option 3: VPS (DigitalOcean, etc.)

- ✅ Full control
- ✅ ~$5-6/month
- See `DEPLOY_VPS.md`

### Option 4: Render

- ✅ Free tier available
- See `DEPLOY_RENDER.md`

See `HOSTING_COMPARISON.md` for a detailed comparison.

## Troubleshooting

**Bot doesn't post clips:**

- Verify all broadcaster names are spelled correctly
- Check bot has permissions in Discord channel
- Ensure clips exist in the last 24 hours for at least one broadcaster
- Check the console logs for errors

**"Missing Access" error:**

- Bot needs "Send Messages" and "Embed Links" permissions

**Authentication errors:**

- Double-check Discord token and Twitch credentials
- Ensure no extra spaces in `.env` file

**Broadcaster not found:**

- Verify the exact Twitch username (case-insensitive)
- Check that the broadcaster's account exists

**Rate limit errors:**

- Reduce the number of broadcasters
- Increase the delay between posting clips (default is 2 seconds)

## Advanced: Per-Channel Configuration

If you want different Discord channels for different broadcasters, you can:

1. Run multiple instances of the bot with different configurations
2. Modify the code to use a broadcaster-to-channel mapping
3. Use Discord's thread feature to organize clips

## Contributing

Feel free to fork and customize this bot for your needs!

## License

ISC

## Support

For issues with:

- **Discord API**: Check Discord Developer Portal
- **Twitch API**: Check Twitch Developer Documentation
- **The bot**: Check the logs and ensure environment variables are correct

## Changelog

### v2.0 - Multi-Broadcaster Support

- Added support for multiple Twitch channels
- Improved logging to show which broadcaster clips are from
- Better error handling per broadcaster

### v1.0 - Initial Release

- Single broadcaster support
- Basic clip posting functionality
