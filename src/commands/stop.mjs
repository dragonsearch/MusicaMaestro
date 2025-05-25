import { getVoiceConnection } from "@discordjs/voice";
export const name = "stop";
export const description =
  "Stops and disconnects the bot from the voice channel";
export const options = [];
export async function run(interaction) {
  // Should do an instant reply so interaction doesn't time out
  await interaction.reply({ content: "Stopping audio...", ephemeral: true });

  const queue = interaction.client.queues.get(interaction.guild.id);
  if (!queue) {
    await interaction.followUp({
      content: "No active queue found for this guild.",
      ephemeral: true,
    });
    return;
  }

  queue.stop();
  if (interaction.member.guild.available) {
    if (interaction.member.voice.channelId) {
      const connection = getVoiceConnection(interaction.guild.id);
      if (connection) {
        connection.destroy();
      }
      // Notify the user that the bot has stopped playing
      await interaction.followUp({
        content:
          "The bot has stopped playing and disconnected from the voice channel.",
        ephemeral: true,
      });
    }
  }
}
