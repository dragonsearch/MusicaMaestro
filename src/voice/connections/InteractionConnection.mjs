import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";

class InteractionConnection {
  // Interactions last 3 seconds so this is not meant to be reused
  constructor(interaction) {
    this.interaction = interaction;
    this.guild_available = this.guildAvailable();
    this.member_in_voice_channel = this.memberInVoiceChannel();
    this.bot_in_voice_channel = this.botInVoiceChannel();
    this.possible_to_join =
      this.guild_available &&
      this.member_in_voice_channel &&
      !this.bot_in_voice_channel;
    this.connection = undefined;
  }

  async createConnection() {
    if (this.possible_to_join) {
      this.connection = joinVoiceChannel({
        channelId: this.interaction.member.voice.channelId,
        guildId: this.interaction.guild.id,
        adapterCreator: this.interaction.guild.voiceAdapterCreator,
      });
      return true;
    } else if (this.InTheSameVoiceChannel()) {
      return true;
    }
    return false;
  }

  guildAvailable() {
    return this.interaction.member.guild.available;
  }

  memberInVoiceChannel() {
    return this.interaction.member.voice.channelId != null;
  }

  InTheSameVoiceChannel() {
    const connection = getVoiceConnection(this.interaction.guild.id);
    if (connection != undefined) {
      return (
        connection.joinConfig.channelId ==
        this.interaction.member.voice.channelId
      );
    } else {
      return false;
    }
  }

  botInVoiceChannel() {
    const connection = getVoiceConnection(this.interaction.guild.id);
    if (connection != undefined && this.InTheSameVoiceChannel()) {
      return true;
    } else {
      return false;
    }
  }
}

export default InteractionConnection;
