const youtubedl = require("youtube-dl-exec");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const stream = require("stream");

const token = process.env.BOT_TOKEN;
// Add port for Render
const port = process.env.PORT || 3000;

// Change to webhook mode
const bot = new TelegramBot(token, {
  webHook: {
    port: port,
  },
});

// Set webhook URL
const url = process.env.RENDER_EXTERNAL_URL;
bot.setWebHook(`${url}/bot${token}`);

const tempDir = path.join(__dirname, "temp");

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Send me a YouTube link");
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const videoUrl = msg.text;

  if (msg.text.match(/(https:\/\/)?(youtu\.be\/|youtube\.com\/).*/g)) {
    try {
      // Get video info with cookies
      const info = await youtubedl(videoUrl, {
        dumpSingleJson: true,
        cookiesFromBrowser: "brave",
      });

      const safeTitle = info.title.replace(/[^a-zA-Z0-9]/g, "_");
      const outputPath = path.join(tempDir, `${safeTitle}.mp3`);

      const sending = await bot.sendMessage(chatId, "Sending " + info.title);

      // Download with cookies
      await youtubedl(videoUrl, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputPath,
        restrictFilenames: true,
        noPlaylist: true,
        cookiesFromBrowser: "brave",
      });

      // Send file to Telegram
      await bot.sendAudio(
        chatId,
        outputPath,
        {
          title: info.title,
        },
        {
          filename: `${info.title}`,
        }
      );
      await bot.deleteMessage(chatId, msg.message_id);
      await bot.deleteMessage(chatId, sending.message_id);

      // Clean up - delete temp file
      fs.unlinkSync(outputPath);

      console.log("Audio sent successfully!");
    } catch (error) {
      console.error("Error:", error);
      if (error.message.includes("Sign in to confirm")) {
        await bot.sendMessage(
          chatId,
          "This video requires authentication. Please try another video."
        );
      } else {
        await bot.sendMessage(
          chatId,
          "Sorry, there was an error processing your request."
        );
      }
    }
  } else if (msg.text !== "/start") {
    bot.sendMessage(chatId, "The link is not from YouTube.");
  }
});
