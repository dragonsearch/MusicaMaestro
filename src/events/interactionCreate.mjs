export const name = "interactionCreate";
export async function run(bot, interaction) {
  if (interaction.client.commands.get(interaction.commandName)) {
    interaction.client.commands.get(interaction.commandName).run(interaction);
  } else {
    console.log("Interaction not in the command list", interaction);
  }
}
