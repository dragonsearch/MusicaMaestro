import { getAllInDir } from "../../../utils/getAllInDir.mjs";
import pino from "pino";
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  },
});
async function getSaveCommands(bot) {
  let commands = getAllInDir("./src/commands/", ".mjs", "commands"); // This uses the working directory as the root folder (where the bot is running)
  let commandslist = [];
  for await (const file of commands) {
    logger.info(`Loading file command ${file}`);
    const command = await import(`../../../commands/${file}`);
    bot.client.commands.set(command.name, command);
    commandslist.push(command);
    logger.info(`File command ${file} loaded`);
  }
  logger.info(
    `Total commands loaded: ${commandslist
      .map((command) => command.name)
      .join(", ")}`
  );
  return commandslist;
}

export { getSaveCommands };
