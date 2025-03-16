import { getVoiceConnection } from '@discordjs/voice';
import InteractionConnection from '../voice/connections/InteractionConnection.mjs';
import {InteractionConnectionReply} from '../replies/reply_classes/InteractionConnectionReply.mjs';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import fs from 'fs';
import { Application, ApplicationCommand, ApplicationCommandOptionType, User } from 'discord.js';
import { getAllInDir } from '../utils/getAllInDir.mjs';
import UserNotInVoiceChannelError from '../errors/UserNotInVoiceChannelError.mjs';
import { type } from 'os';

function InVoiceChannel(interaction){
    if (interaction.member.guild.available) {
        if (interaction.member.voice.channelId){
            return true
        }
    }
    return false;
}
export const name = "sound";
export const description = "Soundboard";
export const options = [
    {
        name: "sound",
        description: "Sound to play",
        type: ApplicationCommandOptionType.String,
        choices: getAllInDir('./audio', '.mp3', 'sounds').map(file => {
            return {
                name: file,
                value: file
            };
        }),
        required: true,
    }
];
export async function run(interaction) {
    console.log(typeof UserNotInVoiceChannelError);
    if (!InVoiceChannel(interaction)) throw new UserNotInVoiceChannelError('');


    let re = new RegExp('[\\/]'); // No backslashes or forwardslashes allowed in file names
    let name = interaction.options.get('sound').value.replace(re, ' ');
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
        await interaction.reply({ content: 'No connection :(', ephemeral: true });
        return;
    }

    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });

    const resource = createAudioResource('audio/' + name); // This uses the working directory as the root folder (where the bot is running)

    player.play(resource);
    connection.subscribe(player);
    await interaction.reply({ content: "TCM!", ephemeral: true });
    return;
}


