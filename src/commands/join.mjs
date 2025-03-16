import { getVoiceConnection } from '@discordjs/voice';
import InteractionConnection from '../voice/connections/InteractionConnection.mjs';
import {InteractionConnectionReply} from '../replies/reply_classes/InteractionConnectionReply.mjs';

export const name = "join";
export const description = "join a voice channel";
export async function run(interaction) {

    let connection = new InteractionConnection(interaction);
    connection.createConnection();
    let reply = new InteractionConnectionReply(connection);
    reply.reply_on_creation();

}


