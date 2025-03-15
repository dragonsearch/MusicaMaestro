// Description: reloads commands

const loadCommands = require('../loaders/commands/commandsLoader.js');


module.exports = {

    name: "reload",
    description: "reload commands", 
    run: async (interaction) => {
        bot = {
            client: interaction.client,

        }
        loadCommands(bot);
        interaction.reply({content:"Reloaded commands", ephemeral: true});
    }
}


