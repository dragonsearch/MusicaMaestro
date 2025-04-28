import { logger } from "../../../utils/logger/logger.mjs";
function triggerEvent(bot, event, ...args) {
  const { client } = bot;
  try {
    if (client.events.has(event.name))
      client.events.get(event.name).run(bot, ...args);
    else throw new Error(`Event ${event.name} does not exist`);
  } catch (error) {
    logger.error(`Error in event ${event.name}: ${error.message}`);
    if (error.stack) logger.error(error.stack);
  }
}

export { triggerEvent };
