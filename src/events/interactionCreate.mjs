export const name =  "interactionCreate";
export async function run(bot, interaction) {
    interaction.client.commands.get(interaction.commandName).run(interaction);
}