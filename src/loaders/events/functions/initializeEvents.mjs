import { triggerEvent } from './triggerEvent.mjs'
function initializeEvents(bot){
    const {client} = bot
    client.events.forEach((e) => {
        console.log(`Event ${e.name} initialized`)
        client.on(e.name, (...args) =>{
            triggerEvent(bot,e, ...args)
        })
    })    
}

export  {initializeEvents}
