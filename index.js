const youtubedl = require("youtube-dl-exec");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const stream = require("stream");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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
      // Get video info first
      const info = await youtubedl(videoUrl, { dumpSingleJson: true });
      const safeTitle = info.title.replace(/[^a-zA-Z0-9]/g, "_"); // Sanitize filename
      const outputPath = path.join(tempDir, `${safeTitle}.mp3`);

      // Download to temp file
      await youtubedl(videoUrl, {
        extractAudio: true,
        audioFormat: "mp3",
        output: outputPath,
        restrictFilenames: true,
        noPlaylist: true,
      });

      // Send file to Telegram
      await bot.sendAudio(
        chatId,
        outputPath,
        {},
        {
          filename: `${info.title}.mp3`,
        }
      );

      // Clean up - delete temp file
      fs.unlinkSync(outputPath);

      console.log("Audio sent successfully!");
    } catch (error) {
      console.error("Error:", error);
      await bot.sendMessage(
        chatId,
        "Sorry, there was an error processing your request."
      );
    }
  } else if (msg.text !== "/start") {
    bot.sendMessage(chatId, "The link is not from YouTube.");
  }
});
