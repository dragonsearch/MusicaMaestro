import { logger } from "../../../util/logger.mjs";
import { getFiles } from "../../../util/functions.mjs"; // Todo refactor
function findEvents() {
  let events = getFiles("src/events/", ".mjs"); // This uses the working directory as the root folder (where the bot is running)
  // TODO: change relative paths to absolute paths
  if (events.length === 0) {
    logger.warn("There are no events to load.");
  }
  return events;
}
export default { findEvents };
