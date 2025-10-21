const axios = require("axios");
const fs = require("fs");

// Configuration from environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_BROADCASTER_NAME = process.env.TWITCH_BROADCASTER_NAME;

// File to store posted clip IDs
const POSTED_CLIPS_FILE = "posted_clips.json";

// Load posted clips from file
let postedClips = new Set();
if (fs.existsSync(POSTED_CLIPS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(POSTED_CLIPS_FILE, "utf8"));
    postedClips = new Set(data);
    console.log(`📋 Loaded ${postedClips.size} previously posted clips`);
  } catch (error) {
    console.log("⚠️ Could not load posted clips file, starting fresh");
  }
}

// Save posted clips to file
function savePostedClips() {
  fs.writeFileSync(POSTED_CLIPS_FILE, JSON.stringify([...postedClips]));
}

// Get Twitch OAuth token
async function getTwitchAccessToken() {
  try {
    const response = await axios.post(
      "https://id.twitch.tv/oauth2/token",
      null,
      {
        params: {
          client_id: TWITCH_CLIENT_ID,
          client_secret: TWITCH_CLIENT_SECRET,
          grant_type: "client_credentials",
        },
      }
    );
    console.log("✅ Twitch OAuth token obtained");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error getting Twitch token:", error.message);
    throw error;
  }
}

// Get broadcaster ID from username
async function getBroadcasterId(accessToken) {
  try {
    const response = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        login: TWITCH_BROADCASTER_NAME,
      },
    });

    if (response.data.data.length > 0) {
      console.log(
        `✅ Found broadcaster: ${response.data.data[0].display_name}`
      );
      return response.data.data[0].id;
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting broadcaster ID:", error.message);
    return null;
  }
}

// Fetch recent clips from Twitch
async function fetchRecentClips(accessToken, broadcasterId) {
  try {
    // Get clips from the last 24 hours
    // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await axios.get("https://api.twitch.tv/helix/clips", {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        broadcaster_id: broadcasterId,
        // started_at: oneDayAgo,
        first: 20,
      },
    });

    console.log(
      `📹 Found ${response.data.data.length} total clips in the last 24 hours`
    );
    return response.data.data;
  } catch (error) {
    console.error("❌ Error fetching clips:", error.message);
    return [];
  }
}

// Post clip to Discord via webhook
async function postClipToDiscord(clip) {
  try {
    const embed = {
      color: 0x9146ff,
      title: clip.title,
      url: clip.url,
      author: {
        name: `Clipped by ${clip.creator_name}`,
      },
      description: `👁️ ${clip.view_count.toLocaleString()} views`,
      thumbnail: {
        url: clip.thumbnail_url,
      },
      timestamp: new Date(clip.created_at).toISOString(),
      footer: {
        text: "Twitch Clip",
      },
    };

    await axios.post(DISCORD_WEBHOOK_URL, {
      content: `🎬 **New clip from ${TWITCH_BROADCASTER_NAME}!**\n${clip.url}`,
      embeds: [embed],
    });

    console.log(`✅ Posted clip: ${clip.title}`);

    // Mark clip as posted
    postedClips.add(clip.id);
    savePostedClips();

    // Wait a bit to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("❌ Error posting to Discord:", error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log("🔍 Starting Twitch clip checker...");
  console.log(`📺 Channel: ${TWITCH_BROADCASTER_NAME}`);

  // Validate environment variables
  if (
    !DISCORD_WEBHOOK_URL ||
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET ||
    !TWITCH_BROADCASTER_NAME
  ) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  try {
    // Get Twitch access token
    const accessToken = await getTwitchAccessToken();

    // Get broadcaster ID
    const broadcasterId = await getBroadcasterId(accessToken);
    if (!broadcasterId) {
      console.error("❌ Could not find broadcaster ID");
      process.exit(1);
    }

    // Fetch recent clips
    const clips = await fetchRecentClips(accessToken, broadcasterId);

    // Filter out already posted clips
    const newClips = clips.filter(clip => !postedClips.has(clip.id));

    if (newClips.length === 0) {
      console.log("✅ No new clips found");
      return;
    }

    console.log(`📌 Found ${newClips.length} new clip(s) to post`);

    // Sort clips by creation date (oldest first)
    newClips.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Post each new clip
    for (const clip of newClips) {
      await postClipToDiscord(clip);
    }

    console.log("🎉 Done! All new clips posted.");
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the main function
main();
