import { getVoiceConnection } from '@discordjs/voice';
export const name = "stop";
export const description = "Stops and disconnects the bot from the voice channel";
export const options = [
];
export async function run(interaction) {
    const queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue) {
        await interaction.reply({ content: 'The bot is not connected to a voice channel!', ephemeral: true });
        return;
    }

    queue.stop();
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
        connection.destroy();
    }
    await interaction.reply({ content: 'Stopped and disconnected from the voice channel!', ephemeral: true });
}