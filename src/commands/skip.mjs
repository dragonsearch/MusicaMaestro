export const name = "skip";
export const description = "Skips the currently playing song";
export const options = [
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
