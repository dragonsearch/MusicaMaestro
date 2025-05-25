export const name = "loop";
export const description = "Set the loop mode of the queue";
import { ApplicationCommandOptionType } from "discord.js";
import { logger } from "../utils/logger/logger.mjs";
export const options = [
  {
    name: "mode",
    description: "The mode to set the queue loop to",
    type: ApplicationCommandOptionType.String,
    required: false,
    choices: [
      {
        name: "none",
        value: "none",
      },
      {
        name: "song",
        value: "song",
      },
      {
        name: "playlist",
        value: "playlist",
      },
    ],
  },
];

export async function run(interaction) {
  const queue = interaction.client.queues.get(interaction.guild.id);
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply({
    content: "Setting loop mode...",
  });
  if (!queue) {
    await interaction.editReply({
      content: "No active queue found for this guild.",
      ephemeral: true,
    });
    return;
  }
  let mode = interaction.options.getString("mode");
  await interaction.editReply({
    content: `Loop mode set to ${mode}`,
  });

  if (mode === "none") {
    queue.disableLoop();
  } else if (mode === "song") {
    queue.setLoopMode("current");
    queue.toggleLoop();
  } else if (mode === "playlist") {
    queue.setLoopMode("playlist");
    queue.toggleLoop();
  } else {
    logger.warn(`Invalid loop mode ${mode} for server ${interaction.guild.id}`);
    return;
  }
}
