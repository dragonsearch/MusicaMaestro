module.exports = {
    
        name: "test",
        description: "test command",
        run: async (interaction) => {
                await interaction.reply("test");
        }
}