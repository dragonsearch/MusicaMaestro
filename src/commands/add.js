const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function download_audio_from_yt_url( yt_url) {
    // Output in audio folder with the name of the video
    const { stdout, stderr } = await exec('yt-dlp -x --audio-format mp3 --audio-quality 0 --output "./audio/%(title)s.%(ext)s" ' + yt_url);
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
}


const { Application, ApplicationCommand, ApplicationCommandOptionType, User } = require('discord.js');


const loadCommands = require('../loaders/commands/commandsLoader.js');

module.exports = {
    
    name: "add",
    description: "Soundboard", 
    options : [
        {
            name: "yt_url",
            description: "Yt_url of the sound to download",
            type: ApplicationCommandOptionType.String,
            required: true,
        }],
    run: async (interaction) => {
        interaction.reply({content:"Downloading...", ephemeral: true});
        // Download the audio from the youtube url
        await download_audio_from_yt_url(interaction.options.get('yt_url').value);
        console.log('Downloaded audio from youtube url');
        bot = {
            client: interaction.client,

        }
        loadCommands(bot);
        interaction.followUp({content:"Successfully added to the list", ephemeral: true});

    }
}

