import InteractionConnection from "../voice/connections/InteractionConnection.mjs";
import { InteractionConnectionReply } from "../replies/reply_classes/InteractionConnectionReply.mjs";
import {
  getVoiceConnection,
  createAudioPlayer,
  NoSubscriberBehavior,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import { ApplicationCommandOptionType } from "discord.js";
import Queue from "../queue/queue.mjs";

import Yt_dlp_Extractor from "../extractor/Yt-dlp_Extractor.mjs";
import { logger } from "../utils/logger/logger.mjs";
export const name = "play";
export const description =
  "plays a video in a voice channel from a supported link";
export const options = [
  {
    name: "yt_url",
    description: "Yt_url of the sound to download",
    type: ApplicationCommandOptionType.String,
    required: true,
  },
];

export async function run(interaction) {
  // Should do an instant reply so interaction doesn't time out
  await interaction.reply({ content: "Playing audio...", ephemeral: true });
  let url = interaction.options.getString("yt_url");
  let player = interaction.client.audio_player;
  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
  });

  let connection = new InteractionConnection(interaction);

  logger.debug("Creating connection");
  let connected = await connection.createConnection();

  if (connected) {
    logger.debug("Connected to voice channel");
    const connection = getVoiceConnection(interaction.guild.id);
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10000);
      logger.debug("Voice connection ready");
    } catch (error) {
      logger.debug("Voice Connection not ready within 10s.", error);
      await interaction.followUp({
        content: "Voice Connection not ready within 10s.",
        ephemeral: true,
      });
      return null;
    }
    if (!connection) {
      logger.debug(
        `No connection to voice channel for ${interaction.guild.id}`
      );
      await interaction.followUp({
        content: "No connection to voice channel",
        ephemeral: true,
      });
      return;
    }

    if (connection._state.subscription) {
      logger.debug("Player already subscribed");
    } else {
      logger.debug("Player not subscribed");
      connection.subscribe(player);
    }

    let queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue) {
      let extractor = new Yt_dlp_Extractor();
      queue = new Queue(player, extractor);
      interaction.client.queues.set(interaction.guild.id, queue);
    }

    let items = [];
    try {
      //urls = await queue.urlExtractor.getItems(url);
      logger.debug("Items length:", items.length);
      logger.debug("Queueing items");
      queue.enqueue(url);
    } catch (error) {
      logger.debug("Error:", error.message);
      await interaction.followUp({
        content: "Error: " + error.message,
        ephemeral: true,
      });
      return;
    }
  }
  return;
}
