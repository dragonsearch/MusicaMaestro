import InteractionConnection from "../voice/connections/InteractionConnection.mjs";
import { InteractionConnectionReply } from "../replies/reply_classes/InteractionConnectionReply.mjs";
import {
  getVoiceConnection,
  createAudioPlayer,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { ApplicationCommandOptionType } from "discord.js";
import Queue from "../queue/queue.mjs";

import Yt_dlp_Extractor from "../extractor/Yt-dlp_Extractor.mjs";

export const name = "play";
export const description =
  "plays a video in a voice channel from a supported link";
export const options = [
    {
        name: "yt_url",
        description: "Yt_url of the sound to download",
        type: ApplicationCommandOptionType.String,
        required: true,
  },
];

export async function run(interaction) {
    
    // Should do an instant reply so interaction doesn't time out
    await interaction.reply({ content: 'Playing audio...', ephemeral: true });
    let url = interaction.options.getString('yt_url');
    let player = interaction.client.audio_player;
    // This is not really needed, but just in case
    player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
            },
    });

    let queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue) {
        queue = new Queue(player, null);
        interaction.client.queues.set(interaction.guild.id, queue);
    }
    let extractor = new Yt_dlp_Extractor();
    let items = [];
    try{
        items = await extractor.getItems(url);
    } catch (error) {
        console.log('Error:', error.message);
        await interaction.reply({ content: 'Error: ' + error.message, ephemeral: true });
        return;
    }
    queue.enqueue(items);
    queue.emit('play');
    player.on('error', error => {
        queue.replay();
        console.log('Error:', error.message);
    })
    let connection = new InteractionConnection(interaction);
    console.log('Creating connection');
    let connected = connection.createConnection();
    console.log('Connection created');
    //const voice_connection = getVoiceConnection(interaction.guild.id);
    //let audio = await add_audio(player,interaction);
    console.log('Got voice connection');

    if (connected) {
        console.log('Playing audio');
        //play_sound(voice_connection, audio);


        //let re = new RegExp('[\\/]'); // No backslashes or forwardslashes allowed in file names
        //let name = audio;
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

        //const resource = createAudioResource(audio); // This uses the working directory as the root folder (where the bot is running)
        connection.subscribe(player);

        
    
    }
    return;
    


}


