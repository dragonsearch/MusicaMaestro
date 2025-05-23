import { Client, IntentsBitField, Collection } from "discord.js";
import {
  getVoiceConnection,
  demuxProbe,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
  StreamType,
} from "@discordjs/voice";
import eventsLoader from "./loaders/events/eventsLoader.mjs";
import commandsLoader from "./loaders/commands/commandsLoader.mjs";
import botLoader from "./loaders/botloader.mjs";
import { logger } from "./utils/logger/logger.mjs";
import dotenv from "dotenv";
dotenv.config();
const client = new Client({
  intents: [
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});
import reply_class from "./replies/replier.mjs";

const replier = new reply_class();

let bot = {
  client: client,
  replier: replier,
};
client.queues = new Collection();
client.commands = new Collection();
client.events = new Collection();

client.eventsLoader = eventsLoader;
client.commandsLoader = commandsLoader;
client.bot_loader = botLoader;

await client.bot_loader(bot);

/* function sleepFor(sleepDuration){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ }
}

sleepFor(10000); */
//client.eventsLoader(bot)

client.login(process.env.TOKEN);
