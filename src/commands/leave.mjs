import { getVoiceConnection } from "@discordjs/voice";
import createInteractionConnection from "../voice/connections/InteractionConnection.mjs";
export const name = "leave";
export const description = "leave a voice channel";
import { run as stop } from "./stop.mjs";
export async function run(interaction) {
  stop(interaction);
}
