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
  // This is not really needed, but just in case
  player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Stop,
    },
  });

  let connection = new InteractionConnection(interaction);
  console.log("Creating connection");
  let connected = await connection.createConnection();
  console.log("Connection created");
  console.log("Got voice connection");

  if (connected) {
    console.log("Playing audio");
    const connection = getVoiceConnection(interaction.guild.id);
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10000);
      console.log("Connected: ");
    } catch (error) {
      console.log("Voice Connection not ready within 10s.", error);
      return null;
    }
    if (!connection) {
      await interaction.reply({ content: "No connection :(", ephemeral: true });
      return;
    }
    //check if the player is already subscribed
    // TODO: check if this approach is really correct.

    // This is a key part that can lead to problems
    //  It is important to always subscribe before, as the queue relies
    // on the Idle state. If there are no subscribers,
    // and the behaviour is to stop whenever there are no subscribers,
    // the effect is that a loop happens. It tries to play the next,
    // but it stops after doing that as there are no subscribers,
    // which leads into playing again. Possible solution
    // -> Check for suscribers on idle state change event
    if (connection._state.subscription) {
      console.log("Player already subscribed");
    } else {
      console.log("Player not subscribed");
      connection.subscribe(player);
    }

    let queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue) {
      queue = new Queue(player, null);
      interaction.client.queues.set(interaction.guild.id, queue);
    }
    let extractor = new Yt_dlp_Extractor();
    let items = [];
    try {
      items = await extractor.getItems(url);
      console.log("queueing");
      queue.enqueue(items);
      queue.emit("play");
    } catch (error) {
      console.log("Error:", error.message);
      await interaction.followUp({
        content: "Error: " + error.message,
        ephemeral: true,
      });
      return;
    }
  }
  return;
}
