const { joinVoiceChannel } = require('@discordjs/voice');
require('dotenv').config();

const connection = joinVoiceChannel({
	channelId: process.env.CHANNEL_ID,
	guildId: process.env.GUILD_ID,
	adapterCreator: channel.guild.voiceAdapterCreator,
});
