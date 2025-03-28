import InteractionConnection from '../voice/connections/InteractionConnection.mjs';
import {InteractionConnectionReply} from '../replies/reply_classes/InteractionConnectionReply.mjs';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { Application, ApplicationCommand, ApplicationCommandOptionType, User } from 'discord.js';
import fs from 'fs';
import path from 'path';
import {add_audio} from './helpers/add_audio.mjs';
export const name = "play";
export const description = "plays a video in a voice channel from a youtube link";
export const options = [
    {
        name: "yt_url",
        description: "Yt_url of the sound to download",
        type: ApplicationCommandOptionType.String,
        required: true,
    }
];
import {play_sound} from './helpers/play_sound.mjs';
import { getVoiceConnection } from '@discordjs/voice';
export async function run(interaction) {
    
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop,
        },
    });
    // Should do an instant reply so interaction doesn't time out
    let connection = new InteractionConnection(interaction);
    console.log('Creating connection');
    let connected = connection.createConnection();
    console.log('Connection created');
    //const voice_connection = getVoiceConnection(interaction.guild.id);
    let audio = await add_audio(player,interaction);
    console.log('Got voice connection');

    if (connected) {
        console.log('Playing audio');
        //play_sound(voice_connection, audio);


        let re = new RegExp('[\\/]'); // No backslashes or forwardslashes allowed in file names
        let name = audio;
        const connection = getVoiceConnection(interaction.guild.id);
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 10000);
            console.log("Connected: " );
        } catch (error) {
            console.log("Voice Connection not ready within 10s.", error);
            return null;
        }
        if (!connection) {
            await interaction.reply({ content: 'No connection :(', ephemeral: true });
            return;
        }

        const resource = createAudioResource(audio); // This uses the working directory as the root folder (where the bot is running)


        connection.subscribe(player);
        player.play(resource);
    
    }
    return;
    


}


