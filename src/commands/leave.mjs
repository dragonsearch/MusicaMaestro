import { getVoiceConnection } from '@discordjs/voice';
import createInteractionConnection from '../voice/connections/InteractionConnection.mjs';
export const name = "leave";
export const description = "leave a voice channel";
export async function run(interaction) {

    if (interaction.member.guild.available) {
        if (interaction.member.voice.channelId) {
            const connection = getVoiceConnection(interaction.guild.id);
            if (connection) {
                connection.destroy();
            }
            await interaction.reply({ content: "Left, connection destroyed", ephemeral: true });
            return;
        } else {
            await interaction.reply("Bot");
            return;
        }
    }

}

