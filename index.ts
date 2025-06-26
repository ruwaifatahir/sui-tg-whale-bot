import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import { HttpsProxyAgent } from "https-proxy-agent";

const agent =
  process.env.NODE_ENV === "development" && process.env.HTTPS_PROXY
    ? new HttpsProxyAgent(process.env.HTTPS_PROXY)
    : undefined;

const bot = new Telegraf(process.env.BOT_TOKEN!, {
  telegram: { agent },
});

bot.start(async (ctx) => {
  const startPayload = ctx.payload;

  console.log(startPayload);

  if (startPayload === "setup") {
    await ctx.reply(
      "✅ You have successfully added the bot!",
      Markup.inlineKeyboard([[Markup.button.callback("⚙️ Setup", "setup_bot")]])
    );
  } else if (ctx.chat.type === "private") {
    await ctx.reply(
      "👋 Welcome to Sui Telegram Whale Bot!",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "➕ Add to Group",
            `https://t.me/${ctx.botInfo.username}?startgroup=true`
          ),
        ],
      ])
    );
  }
});

bot.on("my_chat_member", async (ctx) => {
  const { new_chat_member, old_chat_member } = ctx.update.my_chat_member;

  if (
    old_chat_member.status === "left" &&
    new_chat_member.status === "member"
  ) {
    await ctx.reply(
      "🎉 Thanks for adding me! Type /help for commands.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "Continue in private chat",
            `https://t.me/${ctx.botInfo.username}?start=setup`
          ),
        ],
      ])
    );
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
