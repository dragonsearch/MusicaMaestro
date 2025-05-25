export const name = "skip";
export const description = "Skips the currently playing song";
import { ApplicationCommandOptionType } from "discord.js";
export const options = [
  {
    name: "to",
    description: "where to skip",
    type: ApplicationCommandOptionType.Number,
    required: false,
  },
];

export async function run(interaction) {
  const queue = interaction.client.queues.get(interaction.guild.id);
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply({
    content: "Skipping the current song...",
  });
  if (!queue || queue.isEmpty()) {
    await interaction.editReply({
      content: "No active queue found for this guild.",
      ephemeral: true,
    });
    return;
  }

  const to = interaction.options.getNumber("to");
  if (typeof to === "number" && !isNaN(to)) {
    queue.skip(to - 1);
  } else {
    queue.skip(queue.pointer);
  }
  await interaction.editReply({
    content: `Skipped to song ${queue.pointer + 1} in the queue.`,
  });
}
