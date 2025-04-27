import "dotenv/config";
import discord from "discord.js";
import { REST, Routes } from "discord.js";

import { getSaveCommands } from "./functions/getCommands.mjs";
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function loadCommands(bot) {
  //Get save commands returns a promise so we need to await it
  let commandslist = await getSaveCommands(bot);
  try {
    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commandslist,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
}

export default loadCommands;
