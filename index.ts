import "dotenv/config";
import { Telegraf, Markup, session } from "telegraf";
import { HttpsProxyAgent } from "https-proxy-agent";
import { message } from "telegraf/filters";

import { store } from "./lib/redis";
import { BotContext } from "./lib/types";

import {
  createBotGroup,
  deleteBotGroup,
  getBotGroup,
  updateBotGroup,
} from "./lib/db";
import {
  createWaitingAction,
  isValidSuiAddress,
  isValidTelegramUrl,
  isValidWebsite,
  isValidXHandle,
  editGroupMessage,
  listGroupsMessage,
} from "./lib/utils";
import {
  BOT_TOKEN,
  editGroupActions,
  HTTPS_PROXY,
  MAX_EMOJI_LENGTH,
  MIN_WHALE_BUY,
  NODE_ENV,
} from "./lib/constants";

const agent =
  NODE_ENV === "development" && HTTPS_PROXY
    ? new HttpsProxyAgent(HTTPS_PROXY)
    : undefined;

const bot = new Telegraf<BotContext>(BOT_TOKEN, {
  telegram: { agent },
});

bot.use(
  session({
    store: store,
    defaultSession: () => ({ selectedGroupId: undefined, pendingEdits: {} }),
  })
);

bot.start(async (ctx) => {
  const startPayload = ctx.payload;

  if (startPayload?.startsWith("setup_")) {
    const groupId = startPayload.split("_")[1];

    ctx.session.selectedGroupId = groupId;

    await editGroupMessage(ctx);
  } else if (ctx.chat.type === "private") {
    await listGroupsMessage(ctx);
  }
});

bot.command("help", async (ctx) => {
  await ctx.replyWithHTML(
    `<b>📚 Available Commands</b>\n\n` +
      `<b>/start</b> - Start the bot\n` +
      `<b>/groups</b> - List your groups\n` +
      `<b>/help</b> - Show this help message`
  );
});

bot.command("groups", async (ctx) => {
  await listGroupsMessage(ctx);
});

bot.command("test", async (ctx) => {
  const groupId = ctx.session.selectedGroupId || "";

  // Get group configuration
  const group = await getBotGroup(groupId);

  if (!group) {
    return await ctx.replyWithHTML("<b>❌ No group selected</b>");
  }

  // If no media set
  if (!group.mediaUrl) {
    return await ctx.replyWithHTML("<b>❌ No media set for this group</b>");
  }

  // Prepare caption
  const caption =
    `🔍 Test Message\n\n` +
    `Token: ${group.tokenAddress || "Not set"}\n` +
    `Min Buy: ${group.minBuy} SUI\n` +
    `${group.emoji || "🐳"} Website: ${group.website || "Not set"}`;

  // Send media based on type
  try {
    switch (group.mediaType) {
      case "PHOTO":
        await ctx.replyWithPhoto(group.mediaUrl, {
          caption: caption,
          parse_mode: "HTML",
        });
        break;
      case "VIDEO":
        await ctx.replyWithVideo(group.mediaUrl, {
          caption: caption,
          parse_mode: "HTML",
        });
        break;
      case "ANIMATION":
        await ctx.replyWithAnimation(group.mediaUrl, {
          caption: caption,
          parse_mode: "HTML",
        });
        break;
    }
  } catch (error) {
    await ctx.replyWithHTML(
      "<b>❌ Error sending media. Please try setting media again.</b>"
    );
  }
});

bot.on(message("text"), async (ctx) => {
  const { pendingEdits } = ctx.session;
  const messageText = ctx.message.text;
  const groupId = ctx.session.selectedGroupId || "";

  if (pendingEdits.waitingForToken) {
    if (!isValidSuiAddress(messageText)) {
      return await ctx.replyWithHTML(
        "<b>❌ Invalid SUI address</b>\n\nPlease send a valid SUI address."
      );
    }

    await updateBotGroup(groupId, {
      tokenAddress: messageText,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Token address saved!</b>\n\n<code>${messageText}</code>`
    );
  } else if (pendingEdits.waitingForEmoji) {
    if (messageText.length > MAX_EMOJI_LENGTH) {
      return await ctx.replyWithHTML(
        "<b>❌ Emoji must be a single character</b>"
      );
    }

    await updateBotGroup(groupId, {
      emoji: messageText,
    });

    return await ctx.replyWithHTML(`<b>✅ Emoji saved!</b>\n\n${messageText}`);
  } else if (pendingEdits.waitingForMinBuy) {
    if (parseFloat(messageText) < MIN_WHALE_BUY) {
      return await ctx.replyWithHTML(
        `<b>❌ Min buy must be greater than ${MIN_WHALE_BUY}</b>`
      );
    }
    await updateBotGroup(groupId, {
      minBuy: parseFloat(messageText),
    });

    return await ctx.replyWithHTML(
      `<b>✅ Min buy saved!</b>\n\n<code>${messageText}</code> SUI`
    );
  } else if (pendingEdits.waitingForWebsite) {
    if (!isValidWebsite(messageText)) {
      return await ctx.replyWithHTML(
        "<b>❌ Invalid website URL</b>\n\nPlease enter a valid URL starting with http:// or https://"
      );
    }

    await updateBotGroup(groupId, {
      website: messageText,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Website saved!</b>\n\n<a href="${messageText}">${messageText}</a>`
    );
  } else if (pendingEdits.waitingForTelegram) {
    if (!isValidTelegramUrl(messageText)) {
      return await ctx.replyWithHTML(
        "<b>❌ Invalid Telegram URL</b>\n\nPlease enter a valid URL starting with t.me/ or https://t.me/"
      );
    }

    await updateBotGroup(groupId, {
      telegram: messageText,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Telegram saved!</b>\n\n<a href="${messageText}">${messageText}</a>`
    );
  } else if (pendingEdits.waitingForX) {
    if (!isValidXHandle(messageText)) {
      return await ctx.replyWithHTML(
        "<b>❌ Invalid X handle</b>\n\nPlease enter a valid X handle (e.g. @username) or URL"
      );
    }

    await updateBotGroup(groupId, {
      x: messageText,
    });

    const xUrl = messageText.startsWith("@")
      ? `https://x.com/${messageText.substring(1)}`
      : messageText;

    return await ctx.replyWithHTML(
      `<b>✅ X saved!</b>\n\n<a href="${xUrl}">${messageText}</a>`
    );
  }

  ctx.session.pendingEdits = {};
});

bot.on(["photo", "video", "animation"], async (ctx) => {
  const { pendingEdits } = ctx.session;
  const groupId = ctx.session.selectedGroupId || "";

  if (pendingEdits.waitingForMedia) {
    let mediaType: "PHOTO" | "VIDEO" | "ANIMATION";
    let fileId: string;

    if ("photo" in ctx.message) {
      mediaType = "PHOTO";
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    } else if ("video" in ctx.message) {
      mediaType = "VIDEO";
      fileId = ctx.message.video.file_id;
    } else {
      mediaType = "ANIMATION";
      fileId = ctx.message.animation.file_id;
    }

    await updateBotGroup(groupId, {
      mediaType,
      mediaUrl: fileId,
    });

    ctx.session.pendingEdits = {};
    return await ctx.replyWithHTML(
      "<b>✅ Media saved successfully!</b>\n\nYour media will be displayed with whale alerts."
    );
  }
});

//Send message to group when bot is added
bot.on("my_chat_member", async (ctx) => {
  const { new_chat_member, old_chat_member } = ctx.update.my_chat_member;

  if (
    old_chat_member.status === "left" &&
    new_chat_member.status === "member"
  ) {
    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
      await createBotGroup({
        groupId: ctx.chat.id.toString(),
        groupTitle: ctx.chat.title,
        addedBy: ctx.from.id.toString(),
      });
    }

    const chatTitle = "title" in ctx.chat ? ctx.chat.title : "this chat";

    await ctx.replyWithHTML(
      `<b>🎉 Thanks for adding me to ${chatTitle}!</b>\n\n` +
        `I'll send whale transaction alerts for SUI tokens to this group.\n\n` +
        `<i>Type /help for available commands.</i>`,
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "⚙️ Configure Bot",
            `https://t.me/${ctx.botInfo.username}?start=setup_${ctx.chat.id}`
          ),
        ],
      ])
    );
  } else if (
    old_chat_member.status === "member" &&
    (new_chat_member.status === "left" || new_chat_member.status === "kicked")
  ) {
    const group = await deleteBotGroup(ctx.chat.id.toString());

    console.log(
      `Bot was removed from group ${group.groupTitle} - ${group.groupId}`
    );
  }
});

bot.action(/^edit_group_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();

  const groupId = ctx.match[1];

  ctx.session.selectedGroupId = groupId;

  await editGroupMessage(ctx, `Configure settings for this group`);
});

Object.entries(editGroupActions).forEach(([action, config]) => {
  bot.action(action, createWaitingAction(config.sessionKey, config.message));
});

bot.action("toggle_bot", async (ctx) => {
  const groupId = ctx.session.selectedGroupId || "";

  const group = await getBotGroup(groupId);

  if (!group) {
    return await ctx.answerCbQuery("Group not found");
  }

  await updateBotGroup(groupId, {
    isActive: !group.isActive,
  });

  await ctx.answerCbQuery(
    group.isActive ? "Bot has been deactivated" : "Bot has been activated"
  );

  await editGroupMessage(
    ctx,
    group.isActive ? "Bot deactivated" : "Bot activated"
  );
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
