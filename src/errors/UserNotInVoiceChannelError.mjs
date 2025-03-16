import UserError from './UserError.mjs';

class UserNotInVoiceChannelError extends UserError {
  constructor(message) {
    super('You are not in a voice channel');
    this.name = 'UserNotInVoiceChannelError';
  }
}

export default UserNotInVoiceChannelError;
