const discord = require('discord.js');
require('dotenv').config();



const client = new discord.Client({ 
    
    intents: [  
        discord.IntentsBitField.Flags.GuildMessages,
        discord.IntentsBitField.Flags.Guilds,
        discord.IntentsBitField.Flags.GuildMessageReactions,
        discord.IntentsBitField.Flags.MessageContent,
        discord.IntentsBitField.Flags.GuildVoiceStates,
] });

const config = require('./Data/config.json');

const reply_class = require('./replies/replier.js');

const replier = new reply_class();

let bot = {
    client: client,
    replier: replier
};



client.commands = new discord.Collection();
client.events = new discord.Collection();

client.eventsLoader = require('./loaders/events/eventsLoader.js');
client.commandsLoader = require('./loaders/commands/commandsLoader.js');

client.bot_loader = require('./loaders/botloader.js');


client.bot_loader(bot);


/* function sleepFor(sleepDuration){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ }
}

sleepFor(10000); */
//client.eventsLoader(bot)

module.exports = bot;
client.login(process.env.TOKEN);