
import { getAllInDir } from '../../../utils/getAllInDir.mjs';
async function getSaveCommands(bot){
    
    let commands = getAllInDir('./src/commands/','.mjs','commands') // This uses the working directory as the root folder (where the bot is running)
    let commandslist = [];
    for await (const file of commands) {   
        console.log(`Loading file command ${file}`);
        const command = await import(`../../../commands/${file}`);
        bot.client.commands.set(command.name, command);
        commandslist.push(command);
        console.log(`File command ${file} loaded`);
    }
    console.log(`Total commands loaded: ${commandslist
        .map(command => command.name)
        .join(', ')}`);
    return commandslist
}

export { getSaveCommands };