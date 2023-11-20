const UserError = require('./UserError');

class UserNotInVoiceChannelError extends UserError {
  constructor(message) {
    super('You are not in a voice channel');
    this.name = 'UserNotInVoiceChannelError';
  }
}

module.exports = UserNotInVoiceChannelError;
