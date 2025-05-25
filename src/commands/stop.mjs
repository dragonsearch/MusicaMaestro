import { getVoiceConnection } from "@discordjs/voice";
export const name = "stop";
export const description =
  "Stops and disconnects the bot from the voice channel";
export const options = [];
export async function run(interaction) {
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply({
    content: "Stopping playback and disconnecting from the voice channel...",
  });

  const queue = interaction.client.queues.get(interaction.guild.id);
  if (!queue) {
    await interaction.editReply({
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
      await interaction.editReply({
        content: "Playback stopped and disconnected from the voice channel.",
      });
    }
  }
}
