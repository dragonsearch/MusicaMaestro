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
import Replier from "./replies/replier.mjs";

const replier = new reply_class();

type Bot = {
  client: typeof client;
  replier: Replier;
  queues: Collection<unknown, unknown>;
  commands: Collection<unknown, unknown>;
  events: Collection<unknown, unknown>;
  eventsLoader: Function;
  commandsLoader: Function;
  bot_loader: Function;
};

let bot: Bot = {
  client: client,
  replier: replier,
  queues: new Collection(),
  commands: new Collection(),
  events: new Collection(),
  eventsLoader: eventsLoader,
  commandsLoader: commandsLoader,
  bot_loader: botLoader
};

(async () => {
  await bot.bot_loader(bot);

  /* function sleepFor(sleepDuration){
      var now = new Date().getTime();
      while(new Date().getTime() < now + sleepDuration){ }
  }

  sleepFor(10000); */
  //client.eventsLoader(bot)

  bot.client.login(process.env.TOKEN);
})();

