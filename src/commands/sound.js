const { getVoiceConnection } = require('@discordjs/voice');
const InteractionConnection = require('../voice/connections/InteractionConnection.js');
const interactionCreate = require('../events/interactionCreate');
const InteractionConnectionReply = require('../replies/reply_classes/InteractionConnectionReply.js');
const { createAudioPlayer,createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const fs  = require('fs');
const { Application, ApplicationCommand, ApplicationCommandOptionType, User } = require('discord.js');
const { getAllInDir } = require('../utils/getAllInDir.js');
const { UserNotInVoiceChannelError } = require('../errors/UserNotInVoiceChannelError.js');

function InVoiceChannel(interaction){
    if (interaction.member.guild.available) {
        if (interaction.member.voice.channelId){
            return true
        }
    }
    return false;
}
module.exports = {
    
    name: "sound",
    description: "Soundboard", 
    options : [
        {
            name: "sound",
            description: "Sound to play",
            type: ApplicationCommandOptionType.String,
            choices: getAllInDir('audio','.mp3','sounds').map(file => {
                return {
                    name: file,
                    value: file
                }
            }),
            required: true,
        }],
    run: async (interaction) => {

        if (!InVoiceChannel(interaction)) throw new UserNotInVoiceChannelException();


        let re = new RegExp('[/\/\\//]'); // No backslashes or forwardslashes allowed in file names
        let name = interaction.options.get('sound').value.replace(re,' ');
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            await interaction.reply({content:'No connection :(', ephemeral: true});
            return;
        }

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
            },
        });

        const resource = createAudioResource('audio/'+ name); // This uses the working directory as the root folder (where the bot is running)

        player.play(resource);
        connection.subscribe(player);
        await interaction.reply({content:"TCM!", ephemeral: true});
        return;
    }
}


