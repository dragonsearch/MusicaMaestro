module.exports = {
    name: "interactionCreate",
    run: async(bot,interaction) =>{
        interaction.client.commands.get(interaction.commandName).run(interaction)
    }

}