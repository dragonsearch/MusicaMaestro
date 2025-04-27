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

  if (!queue || queue.isEmpty()) {
    await interaction.reply({
      content: "There is no song to skip!",
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({
    content: "Skipped the current song!",
    ephemeral: true,
  });
  const to = interaction.options.getNumber("to");
  if (typeof to === "number" && !isNaN(to)) {
    queue.skip(to - 1);
  } else {
    queue.skip(queue.pointer);
  }
}
