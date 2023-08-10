const { getVoiceConnection } = require('@discordjs/voice');
createInteractionConnection = require('../voice/connections/InteractionConnection.js');
const interactionCreate = require('../events/interactionCreate');
module.exports = {
    
    name: "leave",
    description: "leave a voice channel", 
    run: async (interaction) => {

        if (interaction.member.guild.available) {
            if (interaction.member.voice.channelId){
                const connection = getVoiceConnection(interaction.guild.id);
                connection.destroy();
                await interaction.reply({content:"Left, connection destroyed", ephemeral: true});
                return;
            }else{
                await interaction.reply("Bot");
                return;
            }
        }

    }
}

