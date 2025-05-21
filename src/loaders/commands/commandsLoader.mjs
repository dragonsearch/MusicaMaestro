import "dotenv/config";
import { REST, Routes } from "discord.js";
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
import { getSaveCommands } from "./functions/getCommands.mjs";
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function loadCommands(bot) {
  //Get save commands returns a promise so we need to await it
  let commandslist = await getSaveCommands(bot);
  try {
    logger.info("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commandslist,
    });
    logger.info("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error("Error reloading application (/) commands.");
    logger.error(error);
  }
}

export default loadCommands;
