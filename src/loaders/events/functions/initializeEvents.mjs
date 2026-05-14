import { triggerEvent } from "./triggerEvent.mjs";
import { logger } from "../../../utils/logger/logger.mjs";
function initializeEvents(bot) {
  const client = bot.client;
  bot.events.forEach((e) => {
    logger.info(`Event ${e.name} initialized`);
    client.on(e.name, (...args) => {
      triggerEvent(bot, e, ...args);
    });
  });
}

export { initializeEvents };
