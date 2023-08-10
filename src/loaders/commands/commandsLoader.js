require('dotenv').config();
const discord = require('discord.js');
const {REST, Routes} = require('discord.js');

const {getSaveCommands} = require('./functions/getCommands.js')
const rest = new REST({version: '10'}).setToken(process.env.TOKEN);


async function loadCommands(bot){
    commandslist = getSaveCommands(bot)
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID),
            {body: commandslist},
        );
        console.log('Successfully reloaded application (/) commands.');
    }catch(error){
        console.error(error);
    }
}

module.exports = loadCommands