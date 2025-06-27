export const NODE_ENV = process.env.NODE_ENV;
export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const HTTPS_PROXY = process.env.HTTPS_PROXY;
export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_PORT = process.env.REDIS_PORT || "6379";

export const MIN_WHALE_BUY = 1000;
export const MAX_EMOJI_LENGTH = 1;

export const editGroupActions = {
  update_token: {
    sessionKey: "waitingForToken",
    message: "Please send the token address you want to track:",
  },
  update_emoji: {
    sessionKey: "waitingForEmoji",
    message: "Please send the emoji you want to use:",
  },
  update_min_buy: {
    sessionKey: "waitingForMinBuy",
    message: "Please send the minimum buy amount you want to set:",
  },
  update_website: {
    sessionKey: "waitingForWebsite",
    message: "Please send the website you want to use:",
  },
  update_telegram: {
    sessionKey: "waitingForTelegram",
    message: "Please send the Telegram username you want to use:",
  },
  update_x: {
    sessionKey: "waitingForX",
    message: "Please send the X username you want to use:",
  },
  update_media: {
    sessionKey: "waitingForMedia",
    message: "Please send a photo, video, or GIF that you want to use:",
  },
} as const;
