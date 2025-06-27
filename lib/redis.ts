import { Redis } from "@telegraf/session/redis";
import { createClient } from "redis";
import { BotSession } from "./types";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "./constants";

const redisClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
  },

  password: REDIS_PASSWORD,
});

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.log("Redis error:", err));

export const store = Redis<BotSession>({
  client: redisClient,
});
