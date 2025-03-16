class InteractionConnectionReply{


    // I dont like this. Reconsider a refactor.
    constructor(connection){
        this.connection = connection;
    }

    async reply_guild_available(){
        if (!this.connection.guild_available){
            await this.connection.interaction.reply({content: "Guild not available", ephemeral: true});
            return true
        }
    }

    async reply_member_in_voice_channel(){
        if (!this.connection.member_in_voice_channel){
            await this.connection.interaction.reply({content: "You are not in a voice channel", ephemeral: true});
            return true
        }
    }

    async reply_bot_in_voice_channel(){
        if (this.connection.bot_in_voice_channel){
            await this.connection.interaction.reply({content: "I am already in a voice channel", ephemeral: true});
            return true
        }
    }

    async reply_possible_to_join(){
        if (!this.connection.possible_to_join){
            await this.connection.interaction.reply({content: "I can't join your voice channel", ephemeral: true});
            return true
        }
    }

    async reply_connection_created(){
        if (this.connection.connection != undefined){
            await this.connection.interaction.reply({content: "Joined your voice channel", ephemeral: true});
            return true
        }
    }

    async reply_connection_destroyed(){
        if (this.connection.connection == undefined){
            await this.connection.interaction.reply({content: "Left your voice channel", ephemeral: true});
            return true
        }
    }
    async reply_on_creation(){
        if (await this.reply_guild_available()){
            return
        }else if (await this.reply_member_in_voice_channel()){
            return
        }else if (await this.reply_bot_in_voice_channel()){
            return
        }else if (await this.reply_possible_to_join()){
            return
        }else if (await this.reply_connection_created()){
            return
        }
    }



}

export { InteractionConnectionReply};