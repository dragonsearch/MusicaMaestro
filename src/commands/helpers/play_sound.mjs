
import { getVoiceConnection } from '@discordjs/voice';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import fs from 'fs';
import { Application, ApplicationCommand, ApplicationCommandOptionType, User } from 'discord.js';
import { getAllInDir } from '../../utils/getAllInDir.mjs';
import UserNotInVoiceChannelError from '../../errors/UserNotInVoiceChannelError.mjs';
import { type } from 'os';
import path from 'path';

function InVoiceChannel(interaction){
    if (interaction.member.guild.available) {
        if (interaction.member.voice.channelId){
            return true
        }
    }
    return false;
}

export async function play_sound(voice_connection,name) {
    // TODO: FIX
    //console.log(typeof UserNotInVoiceChannelError);
    //if (!InVoiceChannel(interaction)) throw new UserNotInVoiceChannelError('');


    let re = new RegExp('[\\/]'); // No backslashes or forwardslashes allowed in file names

    if (!voice_connection) {
        console.log('No connection');
        return;
    }

    const player = createAudioPlayer({
         behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        }, 
    });
    const __dirname = new URL('.', import.meta.url).pathname;
    console.log('dirname:',__dirname);

    const resource = createAudioResource('./../../audio/' + name); // This uses the working directory as the root folder (where the bot is running)
    // Resolve

    console.log(`playing ${name} in path ${path.resolve(__dirname, './../../audio/' + name)}`);
    // This doesnt play anything Idont know why

    player.play(resource);
    voice_connection.subscribe(player);
    return;
}