const axios = require("axios");
const fs = require("fs");

// Configuration from environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
// Support multiple broadcasters separated by commas
const TWITCH_BROADCASTER_NAMES = process.env.TWITCH_BROADCASTER_NAMES.split(
  ","
).map(name => name.trim());

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
async function getBroadcasterId(accessToken, broadcasterName) {
  try {
    const response = await axios.get("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        login: broadcasterName,
      },
    });

    if (response.data.data.length > 0) {
      console.log(
        `✅ Found broadcaster: ${response.data.data[0].display_name}`
      );
      return {
        id: response.data.data[0].id,
        displayName: response.data.data[0].display_name,
      };
    }
    return null;
  } catch (error) {
    console.error(
      `❌ Error getting broadcaster ID for ${broadcasterName}:`,
      error.message
    );
    return null;
  }
}

// Fetch recent clips from Twitch
async function fetchRecentClips(
  accessToken,
  broadcasterId,
  broadcasterDisplayName
) {
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
      `📹 Found ${response.data.data.length} total clips from ${broadcasterDisplayName} in the last 24 hours`
    );

    // Add broadcaster info to each clip
    return response.data.data.map(clip => ({
      ...clip,
      broadcasterDisplayName: broadcasterDisplayName,
    }));
  } catch (error) {
    console.error(
      `❌ Error fetching clips for ${broadcasterDisplayName}:`,
      error.message
    );
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
        name: `${clip.broadcasterDisplayName} - Clipped by ${clip.creator_name}`,
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
      content: `🎬 **New clip from ${clip.broadcasterDisplayName}!**\n${clip.url}`,
      embeds: [embed],
    });

    console.log(
      `✅ Posted clip from ${clip.broadcasterDisplayName}: ${clip.title}`
    );

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
  console.log(`📺 Channels: ${TWITCH_BROADCASTER_NAMES.join(", ")}`);

  // Validate environment variables
  if (
    !DISCORD_WEBHOOK_URL ||
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET ||
    !TWITCH_BROADCASTER_NAMES
  ) {
    console.error("❌ Missing required environment variables");
    process.exit(1);
  }

  try {
    // Get Twitch access token
    const accessToken = await getTwitchAccessToken();

    let allNewClips = [];

    // Check each broadcaster
    for (const broadcasterName of TWITCH_BROADCASTER_NAMES) {
      console.log(`\n📺 Checking ${broadcasterName}...`);

      // Get broadcaster ID
      const broadcasterInfo = await getBroadcasterId(
        accessToken,
        broadcasterName
      );
      if (!broadcasterInfo) {
        console.error(`❌ Could not find broadcaster: ${broadcasterName}`);
        continue;
      }

      // Fetch recent clips
      const clips = await fetchRecentClips(
        accessToken,
        broadcasterInfo.id,
        broadcasterInfo.displayName
      );

      // Filter out already posted clips
      const newClips = clips.filter(clip => !postedClips.has(clip.id));

      if (newClips.length > 0) {
        console.log(
          `📌 Found ${newClips.length} new clip(s) from ${broadcasterInfo.displayName}`
        );
        allNewClips.push(...newClips);
      }
    }

    if (allNewClips.length === 0) {
      console.log("\n✅ No new clips found from any broadcaster");
      return;
    }

    console.log(`\n🎉 Total new clips to post: ${allNewClips.length}`);

    // Sort clips by creation date (oldest first)
    allNewClips.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Post each new clip
    for (const clip of allNewClips) {
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
