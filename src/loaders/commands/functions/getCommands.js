const {iscached} = require('../../../utils/iscached.js')
function getSaveCommands(bot){
    const {getAllInDir} = require('../../../utils/getAllInDir.js')
    commands = getAllInDir('./commands/','.js','commands') // This uses the working directory as the root folder (where the bot is running)
    let commandslist = [];
    commands.forEach( (file)=>
    {   
        console.log(`Loading file command ${file}`)
        iscached(file,'commands')
        const command = require(`../../../commands/${file}`)
        bot.client.commands.set(command.name,command)
        commandslist.push(command)
        console.log(`File command ${file} loaded`)

        

    });
    return commandslist
}

module.exports = {getSaveCommands}