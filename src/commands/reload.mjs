// Description: reloads commands

import loadCommands from '../loaders/commands/commandsLoader.mjs';


export const name = "reload";
export const description = "reload commands";
export async function run(interaction) {
    let bot = {
        client: interaction.client,
    };
    await loadCommands(bot);
    interaction.reply({ content: "Reloaded commands", ephemeral: true });
}


