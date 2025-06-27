import "dotenv/config";
import { Telegraf, Markup, session } from "telegraf";
import { HttpsProxyAgent } from "https-proxy-agent";
import { message } from "telegraf/filters";

import { store } from "./lib/redis";
import { BotContext } from "./lib/types";

import { createBotGroup, getBotGroup, updateBotGroup } from "./lib/db";
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

bot.command("groups", async (ctx) => {
  await listGroupsMessage(ctx);
});

bot.command("test", async (ctx) => {
  const groupId = ctx.session.selectedGroupId || "";

  // Get group configuration
  const group = await getBotGroup(groupId);

  if (!group) {
    return await ctx.reply("No group selected");
  }

  // If no media set
  if (!group.mediaUrl) {
    return await ctx.reply("No media set for this group");
  }

  // Prepare caption
  const caption =
    `🔍 Test Message\n\n` +
    `Token: ${group.token || "Not set"}\n` +
    `Min Buy: ${group.minBuy} SUI\n` +
    `${group.emoji || "🐳"} Website: ${group.website || "Not set"}`;

  // Send media based on type
  try {
    switch (group.mediaType) {
      case "PHOTO":
        await ctx.replyWithPhoto(group.mediaUrl, { caption });
        break;
      case "VIDEO":
        await ctx.replyWithVideo(group.mediaUrl, { caption });
        break;
      case "ANIMATION":
        await ctx.replyWithAnimation(group.mediaUrl, { caption });
        break;
    }
  } catch (error) {
    await ctx.reply("Error sending media. Please try setting media again.");
  }
});

bot.on(message("text"), async (ctx) => {
  const { pendingEdits } = ctx.session;
  const messageText = ctx.message.text;
  const groupId = ctx.session.selectedGroupId || "";

  if (pendingEdits.waitingForToken) {
    if (!isValidSuiAddress(messageText)) {
      return await ctx.reply("Invalid SUI address");
    }

    await updateBotGroup(groupId, {
      token: messageText,
    });

    return await ctx.reply(`✅ Token address saved: ${messageText}`);
  } else if (pendingEdits.waitingForEmoji) {
    if (messageText.length > MAX_EMOJI_LENGTH) {
      return await ctx.reply("Emoji must be a single character");
    }

    await updateBotGroup(groupId, {
      emoji: messageText,
    });

    return await ctx.reply(`✅ Emoji saved: ${messageText}`);
  } else if (pendingEdits.waitingForMinBuy) {
    if (parseFloat(messageText) < MIN_WHALE_BUY) {
      return await ctx.reply("Min buy must be greater than 1000");
    }
    await updateBotGroup(groupId, {
      minBuy: parseFloat(messageText),
    });

    return await ctx.reply(`✅ Min buy saved: ${messageText}`);
  } else if (pendingEdits.waitingForWebsite) {
    if (!isValidWebsite(messageText)) {
      return await ctx.reply("Invalid website url");
    }

    await updateBotGroup(groupId, {
      website: messageText,
    });

    return await ctx.reply(`✅ Website saved: ${messageText}`);
  } else if (pendingEdits.waitingForTelegram) {
    if (!isValidTelegramUrl(messageText)) {
      return await ctx.reply("Invalid Telegram URL");
    }

    await updateBotGroup(groupId, {
      telegram: messageText,
    });

    return await ctx.reply(`✅ Telegram saved: ${messageText}`);
  } else if (pendingEdits.waitingForX) {
    if (!isValidXHandle(messageText)) {
      return await ctx.reply("Invalid X handle");
    }

    await updateBotGroup(groupId, {
      x: messageText,
    });

    return await ctx.reply(`✅ X saved: ${messageText}`);
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
    return await ctx.reply("✅ Media saved successfully!");
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

    await ctx.reply(
      "🎉 Thanks for adding me! Type /help for commands.",
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "Continue in private chat",
            `https://t.me/${ctx.botInfo.username}?start=setup_${ctx.chat.id}`
          ),
        ],
      ])
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

  const { isActive } = await updateBotGroup(groupId, {
    isActive: !group.isActive,
  });

  await ctx.answerCbQuery();

  await ctx.reply(`✅ Bot status updated: ${isActive ? "Active" : "Inactive"}`);
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
