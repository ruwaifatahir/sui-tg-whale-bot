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
    await ctx.reply(message);
  };
};

export const editGroupMessage = async (ctx: BotContext, message?: string) => {
  const group = await getBotGroup(ctx.session.selectedGroupId || "");

  if (!group) {
    return await ctx.reply("Group not found");
  }

  if (group.isActive)
    await ctx.reply(
      message || "✅ You have successfully added the bot!",
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
};

export const listGroupsMessage = async (ctx: BotContext) => {
  const groups = await getBotGroups(ctx.from?.id.toString() || "");

  if (groups.length > 0) {
    const groupButtons = groups.map((group) => [
      Markup.button.callback(
        `⚙️ ${group.groupTitle}`,
        `edit_group_${group.groupId}`
      ),
    ]);

    await ctx.reply(
      "Select a group to configure:",
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
