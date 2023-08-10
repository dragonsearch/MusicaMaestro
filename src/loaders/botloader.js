function load_bot(bot){
    const loadCommands = require('./commands/commandsLoader.js')
    const loadEvents = require('./events/eventsLoader.js')
    loadEvents(bot)
    loadCommands(bot)

} 

module.exports = load_bot

















