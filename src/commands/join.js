const { getVoiceConnection } = require('@discordjs/voice');
const InteractionConnection = require('../voice/connections/InteractionConnection.js');
const interactionCreate = require('../events/interactionCreate');
const InteractionConnectionReply = require('../replies/reply_classes/InteractionConnectionReply.js');

module.exports = {
    
    name: "join",
    description: "join a voice channel", 
    run: async (interaction) => {

        connection = new InteractionConnection(interaction);
        connection.createConnection();
        reply = new InteractionConnectionReply(connection);
        reply.reply_on_creation();

    }
}


