import { promisify } from 'util';
const { exec } = await import('child_process');
const execPromise = promisify(exec);

async function download_audio_from_yt_url( yt_url) {
    // Output in audio folder with the name of the video
    const { stdout, stderr } = await exec('yt-dlp -x --audio-format mp3 --audio-quality 0 --output "./audio/%(title)s.%(ext)s" ' + yt_url);
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
}


import { Application, ApplicationCommand, ApplicationCommandOptionType, User } from 'discord.js';


import loadCommands from '../loaders/commands/commandsLoader.mjs';

export const name = "add";
export const description = "Soundboard";
export const options = [
    {
        name: "yt_url",
        description: "Yt_url of the sound to download",
        type: ApplicationCommandOptionType.String,
        required: true,
    }
];
export async function run(interaction) {
    await interaction.reply({ content: "Downloading...", ephemeral: true });
    // Download the audio from the youtube url
    await download_audio_from_yt_url(interaction.options.get('yt_url').value);
    console.log('Downloaded audio from youtube url');
    let bot = {
        client: interaction.client,
    };
    await loadCommands(bot);
    interaction.followUp({ content: "Successfully added to the list", ephemeral: true });

}

