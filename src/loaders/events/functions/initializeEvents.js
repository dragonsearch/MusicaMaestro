const {triggerEvent} = require('./triggerEvent')
function initializeEvents(bot){
    const {client} = bot
    client.events.forEach((e) => {

        client.on(e.name, (...args) =>{
            triggerEvent(bot,e, ...args)
        })
    })    
}

module.exports = {initializeEvents}
