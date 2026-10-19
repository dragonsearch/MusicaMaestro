export const name = "clientReady";
import { logger } from "../utils/logger/logger.mjs";
export async function run(bot) {
  logger.info("Logged in as " + bot.client.user.tag);
}
