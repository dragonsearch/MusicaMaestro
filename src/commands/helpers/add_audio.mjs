import { spawn } from 'child_process';
import { Readable } from 'stream';
import fs from 'fs';
/**
 * Creates a readable stream from the stdout of a spawned process.
 *
 * @param {string} command The command to execute.
 * @param {string[]} args The arguments to pass to the command.
 * @param {object} [options] Options to pass to spawn (optional).
 * @returns {Readable} A readable stream representing the stdout of the process.
 *                    The stream also emits 'error' and 'close' events similar to the child process.
 */
function createReadableStreamFromProcess(player, command, args, options = {}) {
    
  const childProcess = spawn(command, args, options);

  // Create a custom Readable stream
  const stdoutStream = new Readable({
    read(size) {
      // No specific action needed here, as data will be pushed
      // by the 'data' event handler of childProcess.stdout.
      // However, a read() method is required for a Readable Stream.
    }
  });


  childProcess.stdout.on('data', (data) => {
    // Push data to the readable stream.  push(null) signals end of stream.
    if (!stdoutStream.push(data)) {
        // Pause the childProcess.stdout if backpressure is encountered
        player.pause();
        childProcess.stdout.pause();
    }
  });

  // Handle the end of the child process's stdout.
  childProcess.stdout.on('end', () => {
    stdoutStream.push(null); // Signal the end of the stream.
  });

  // Handle errors from the child process.
  childProcess.on('error', (err) => {
    stdoutStream.emit('error', err); // Forward the error.
  });
  
    childProcess.stderr.on('data', (data) => {
        // You *could* emit this as an error or a separate event, but it's
        // *very* important to handle it somehow.  If you ignore stderr,
        // and the process writes a lot to stderr, the underlying OS pipes
        // can fill up, and the process can deadlock.  The *simplest* thing
        // is to just log it:
        console.error(`stderr: ${data}`);
    });

  // Handle the child process exiting.
  childProcess.on('close', (code, signal) => {
      let closeError;
      if (code !== 0) {
          closeError = new Error(`Child process exited with code ${code}`);
      } else if (signal) {
          closeError = new Error(`Child process was terminated by signal ${signal}`);
      }
    stdoutStream.emit('close', code, signal, closeError);  // Forward the close event.
  });


    // Important:  Handle backpressure. If our ReadableStream's internal buffer
    // is full, the .push() call inside the 'data' event handler will return
    // `false`.  When that happens, we need to pause the underlying stream
    // from the child process, and resume it when our ReadableStream is ready
    // for more data.
    stdoutStream.on('drain', () => {
        childProcess.stdout.resume();
        player.resume();
    });

  return stdoutStream;
}
async function stream_audio_from_yt_url(player,yt_url) {

    const stream = createReadableStreamFromProcess(player,'yt-dlp', ['-o', '-','--format', 'bestaudio', yt_url]);
    return stream;
}



import { Application, ApplicationCommand, ApplicationCommandOptionType, User } from 'discord.js';


import loadCommands from '../../loaders/commands/commandsLoader.mjs';
export async function add_audio(player,interaction) {

    await interaction.reply({ content: "Downloading...", ephemeral: true });
    // Download the audio from the youtube url
    let audioStream = await stream_audio_from_yt_url(player,interaction.options.get('yt_url').value);
    //console.log('Title:', title);
    interaction.followUp({ content: `Added to the list`, ephemeral: true });
    console.log('Added audio');
    return audioStream;
}