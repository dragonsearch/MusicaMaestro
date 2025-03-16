

module.exports = (bot) =>{
    const {initializeEvents} = require('./functions/initializeEvents.js')
    const discord = require('discord.js')
    const {iscached} = require('../../utils/iscached.js')

    const {getAllInDir} = require('../../utils/getAllInDir.js')

    const {client} = bot
    events = getAllInDir('./src/events/','.js','events') // This uses the working directory as the root folder (where the bot is running)
    events.forEach( (file)=>
    {
        iscached(file,'events')

        const event = require(`../../events/${file}`)    

        client.removeAllListeners(event.name)
        client.events.set(event.name,event)
        console.log(`File event ${file} loaded`)

    })
    initializeEvents(bot)
}