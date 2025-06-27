import { Context } from "telegraf";

export interface BotSession {
  selectedGroupId?: string;
  pendingEdits: {
    waitingForToken?: boolean;
    waitingForEmoji?: boolean;
    waitingForMinBuy?: boolean;
    waitingForMedia?: boolean;
    waitingForWebsite?: boolean;
    waitingForTelegram?: boolean;
    waitingForX?: boolean;
  };
}

export interface BotContext extends Context {
  session: BotSession;
}
