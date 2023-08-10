function triggerEvent (bot,event, ...args){
    const {client} = bot
    try {
        if(client.events.has(event.name))
            client.events.get(event.name).run(bot, ...args)
        else
            throw new Error(`Event ${event.name} does not exist`)
    }
    catch(error){
        console.error(error)
    }
}

module.exports = {triggerEvent}