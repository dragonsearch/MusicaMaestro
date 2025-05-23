
import { getVoiceConnection } from '@discordjs/voice';

async function isAlreadyInVoiceChannel(interaction){
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection){
        await interaction.reply("Already in a voice channel");
        return true;
    }else{
        return false;
    }
}

export default isAlreadyInVoiceChannel;