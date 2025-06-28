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
  isSingleEmoji,
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


bot.on(message("text"), async (ctx) => {
  const { pendingEdits } = ctx.session;
  const text = ctx.message.text;
  const groupId = ctx.session.selectedGroupId || "";

  if (pendingEdits.waitingForToken) {
    if (!isValidSuiAddress(text)) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID TOKEN ADDRESS</b>

<i>The address format doesn't match Sui network standards</i>

Please send a <b>valid Sui token address</b>
<i>Example: 0xc1a35b6a9771e6eb69e3b36e921a3a373e6d33e6f863dab6949ed3c2d1228f73::neonet::NEONET</i>`
      );
    }

    await updateBotGroup(groupId, {
      tokenAddress: text,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Token address saved!</b>\n\n<code>${text}</code>`
    );
  } else if (pendingEdits.waitingForEmoji) {
    if (!isSingleEmoji(text)) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID EMOJI</b>

<i>Please provide a single emoji</i>

Send a <b>single emoji</b>
<i>Example: 🚀</i>`
      );
    }
    await updateBotGroup(groupId, {
      emoji: text,
    });

    return await ctx.replyWithHTML(`<b>✅ Emoji saved!</b>\n\n${text}`);
  } else if (pendingEdits.waitingForMinBuy) {
    if (parseFloat(text) < MIN_WHALE_BUY) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID MIN BUY</b>

<i>Please provide a minimum buy amount greater than ${MIN_WHALE_BUY}</i>

Send a <b>valid amount</b>
<i>Example: 1200</i>`
      );
    }
    await updateBotGroup(groupId, {
      minBuy: parseFloat(text),
    });

    return await ctx.replyWithHTML(
      `<b>✅ Min buy saved!</b>\n\n<code>${text}</code> SUI`
    );
  } else if (pendingEdits.waitingForWebsite) {
    if (!isValidWebsite(text)) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID WEBSITE</b>

<i>Please provide a valid website URL</i>

Send a <b>valid website URL</b>
<i>Example: https://neonetai.ai</i>`,
        { link_preview_options: { is_disabled: true } }
      );
    }

    await updateBotGroup(groupId, {
      website: text,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Website saved!</b>\n\n<a href="${text}">${text}</a>`
    );
  } else if (pendingEdits.waitingForTelegram) {
    if (!isValidTelegramUrl(text)) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID TELEGRAM URL</b>

<i>Please provide a valid Telegram group or channel link</i>

Send a <b>valid t.me link</b>
<i>Example: https://t.me/neonet_agent</i>`,
        { link_preview_options: { is_disabled: true } }
      );
    }

    await updateBotGroup(groupId, {
      telegram: text,
    });

    return await ctx.replyWithHTML(
      `<b>✅ Telegram saved!</b>\n\n<a href="${text}">${text}</a>`
    );
  } else if (pendingEdits.waitingForX) {
    if (!isValidXHandle(text)) {
      return await ctx.replyWithHTML(
        `❌ <b>INVALID X HANDLE</b>

<i>Please provide a valid X handle</i>

Send a <b>valid X handle</b>
<i>Example: @neonet_agent</i>`,
        { link_preview_options: { is_disabled: true } }
      );
    }

    await updateBotGroup(groupId, {
      x: text,
    });

    const xUrl = text.startsWith("@")
      ? `https://x.com/${text.substring(1)}`
      : text;

    return await ctx.replyWithHTML(
      `<b>✅ X saved!</b>\n\n<a href="${xUrl}">${text}</a>`
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
        `Configure me to get alerts of whale buys in this group.\n\n` +
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
