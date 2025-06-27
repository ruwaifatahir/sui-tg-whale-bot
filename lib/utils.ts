import { Markup } from "telegraf";
import { BotContext } from "./types";
import { getBotGroup, getBotGroups } from "./db";

export const createWaitingAction = (
  sessionKey: keyof BotContext["session"]["pendingEdits"],
  message: string
) => {
  return async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    ctx.session.pendingEdits = {};
    ctx.session.pendingEdits[sessionKey] = true as never;
    await ctx.replyWithHTML(`<b>⚙️ ${message}</b>`);
  };
};

export const editGroupMessage = async (ctx: BotContext, message?: string) => {
  const group = await getBotGroup(ctx.session.selectedGroupId || "");

  if (!group) {
    return await ctx.replyWithHTML("<b>❌ Group not found</b>");
  }

  if (group.isActive) {
    const statusEmoji = group.isActive ? "🟢" : "🔴";
    const statusText = group.isActive ? "Active" : "Inactive";

    await ctx.replyWithHTML(
      `<b>${message || "✅ You have successfully added the bot!"}</b>\n\n` +
        `<b>📊 Current Configuration:</b>\n` +
        `<b>• Group:</b> ${group.groupTitle || "Unknown"}\n` +
        `<b>• Status:</b> ${statusEmoji} ${statusText}\n` +
        `<b>• Token:</b> ${
          group.token
            ? `<code>${group.token.substring(0, 10)}...${group.token.substring(
                group.token.length - 6
              )}</code>`
            : "Not set"
        }\n` +
        `<b>• Min Buy:</b> ${group.minBuy} USD\n` +
        `<b>• Emoji:</b> ${group.emoji || "🐳"}\n\n` +
        `<i>Select an option below to configure your whale alerts:</i>`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("💎 Token", "update_token"),
          Markup.button.callback("😀 Emoji", "update_emoji"),
          Markup.button.callback("💰 Min Buy", "update_min_buy"),
        ],
        [
          Markup.button.callback("📱 Media", "update_media"),
          Markup.button.callback(
            group.isActive ? "🟢 On" : "🔴 Off",
            "toggle_bot"
          ),
          Markup.button.callback("🌐 Website", "update_website"),
        ],
        [
          Markup.button.callback("📱 Telegram", "update_telegram"),
          Markup.button.callback("🐦 X", "update_x"),
        ],
      ])
    );
  }
};

export const listGroupsMessage = async (ctx: BotContext) => {
  const groups = await getBotGroups(ctx.from?.id.toString() || "");

  if (groups.length > 0) {
    const groupButtons = groups.map((group) => [
      Markup.button.callback(
        `${group.isActive ? "🟢" : "🔴"} ${group.groupTitle}`,
        `edit_group_${group.groupId}`
      ),
    ]);

    await ctx.replyWithHTML(
      `<b>🔍 Your Monitored Groups</b>\n\n` +
        `<i>Select a group to configure whale alerts:</i>`,
      Markup.inlineKeyboard([
        ...groupButtons,
        [
          Markup.button.url(
            "➕ Add to Another Group",
            `https://t.me/${ctx.botInfo.username}?startgroup=true`
          ),
        ],
      ])
    );
  } else {
    await ctx.replyWithHTML(
      `<b>👋 Welcome to Sui Telegram Whale Bot!</b>\n\n` +
        `<i>This bot tracks whale transactions on the Sui blockchain and sends alerts to your group.</i>\n\n` +
        `<b>To get started:</b>\n` +
        `1️⃣ Add this bot to your group\n` +
        `2️⃣ Configure your alert settings\n` +
        `3️⃣ Start receiving whale alerts!`,
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
};

/**
 * Format a number with commas as thousand separators
 * @param num The number to format
 * @returns Formatted number string with commas
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US");
};

export const isValidSuiAddress = (address: string) => {
  if (!address?.trim()) return false;

  const addr = address.trim();

  if (addr.includes("::")) {
    const parts = addr.split("::");
    return (
      parts.length === 3 &&
      /^0x[a-fA-F0-9]{64}$/.test(parts[0]) &&
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parts[1]) &&
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parts[2])
    );
  }

  return /^0x[a-fA-F0-9]{64}$/.test(addr);
};

export const isValidTelegramUrl = (url: string) => {
  if (!url?.trim()) return false;
  const trimmedUrl = url.trim();
  return (
    trimmedUrl.startsWith("https://t.me/") || trimmedUrl.startsWith("t.me/")
  );
};

export function isValidXHandle(value: string) {
  // Handle @ format
  if (value.startsWith("@")) {
    return /^@[a-zA-Z0-9_]{4,15}$/.test(value);
  }

  // Handle URL format
  try {
    const url = new URL(value);
    const isValidDomain =
      url.hostname === "twitter.com" || url.hostname === "x.com";
    const username = url.pathname.slice(1); // Remove leading slash
    return isValidDomain && /^[a-zA-Z0-9_]{4,15}$/.test(username);
  } catch {
    return false;
  }
}

export function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
