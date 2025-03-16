
import { initializeEvents } from './functions/initializeEvents.mjs';
import discord from 'discord.js';
import { getAllInDir } from '../../utils/getAllInDir.mjs';

export default async (bot) =>{

    const {client} = bot
    let events = getAllInDir('./src/events/','.mjs','events') // This uses the working directory as the root folder (where the bot is running)
    for await (const file of events) {   
        console.log(`Loading file event ${file}`);
        const event = await import(`../../events/${file}`);
        client.removeAllListeners(event.name)
        client.events.set(event.name,event)
        console.log(`File event ${file} loaded`)
    }

    initializeEvents(bot)
}