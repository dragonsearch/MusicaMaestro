import loadCommands from './commands/commandsLoader.mjs';
import loadEvents from './events/eventsLoader.mjs';
async function load_bot(bot){
    await loadEvents(bot)
    await loadCommands(bot)

} 

export default load_bot

















