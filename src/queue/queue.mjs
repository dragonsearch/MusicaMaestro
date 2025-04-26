import Yt_dlp_Extractor from "../extractor/Yt-dlp_Extractor.mjs";
import EventEmitter from "events";
import { AudioPlayerStatus } from "@discordjs/voice";
import { YtDlpExtractError } from "../extractor/Yt-dlp_Extractor.mjs";

class Queue extends EventEmitter {
  constructor(player, urlExtractor = null, loop = false) {
    super();
    this.loop = loop;
    this.player = player;
    this.items = [];
    this.state = "idle";
    this.replaytries = 0;
    // Resource being played. Probably could make a class
    // that handles resources instead of hardcoding.
    this.resource = null;
    this.on("play", () => {
      // get player status
      console.log("Queue starting");
      console.log(this.player._state);
      if (this.player.state.status === AudioPlayerStatus.Idle) {
        console.log("Queue start");
        this.playNext();
      }
    });
    this.player.on("error", (error) => {
      //TODO: reset replay tries
      //TODO: replay should ideally be as seamless as possible.
      // highWaterMark option could help in yt-dlp or discordjs
      this.replay();
      console.log("Error:", error.message);
    });
    //note: DISCORD PLAYER HANDLES THE DESTRUCTION OF THE STREAM WHENEVER
    // A NEW AUDIO RESOURCE IS CALLED FROM THE IDLE STATE. This means
    // there is really only 1 stream that could be left "online"
    // even after the player has stopped, as whenever a new one "enters"
    // the one before is cleaned up.
    this.player.on(AudioPlayerStatus.Idle, () => {
      // This is a key part that can lead to problems
      //  It is important to always subscribe before, as the queue relies
      // on the Idle state. If there are no subscribers,
      // and the behaviour is to stop whenever there are no subscribers,
      // the effect is that a loop happens. It tries to play the next,
      // but it stops after doing that as there are no subscribers,
      // which leads into playing again. Possible solution
      // -> Check for suscribers on idle state change event
      console.log("Player is idle! Event was fired");
      if (!this.paused && this.player.subscribers.length != 0) {
        if (this.resource && this.resource.ended) {
          if (this._reachedEnd()) {
            this._onQueueEnd();
          } else {
            this.playNext();
          }
        } else if (this.resource && !this.resource.ended) {
          // This means either
          // -> A potential error? (should re-check)
          // -> A skipped song (not really, resource is ended
          //  playnext is not called and relies on
          // the above conditions)
          // -> A paused queue
          // On error or skipped ->
          this.playNext();
        }
      }
    });
    this.pointer = 0;
    if (!urlExtractor) {
      this.urlExtractor = new Yt_dlp_Extractor();
    }
  }

  // Set the loop mode
  setLoop(loop) {
    this.loop = loop;
  }

  _onQueueEnd() {
    this.emit("queueEnd");
    console.log("Queue end");
    this.pointer = 0;
    if (this.loop) {
      this.state = "playing";
      this.pointer = 0;
      this.playNext();
    } else {
      this.state = "ended";
    }
    return true;
  }

  // Play the last item that was queued
  replay() {
    if (this.replaytries > 3) {
      this.skip();
      return;
    } else {
      this.pointer--;
      if (this.pointer < 0) {
        this.pointer = 0;
      }
      this.player.stop();
    }
  }
  stop() {
    // clear the queue
    this.items = [];
    this.pointer = 0;
    this.player.stop(true);
    this.emit("queueEnd");
  }
  skip(to) {
    //Skips to the nth item
    if (to < 0) {
      to = 0;
    }
    if (to >= this.items.length) {
      //This wont make the playlist able to stop using skip
      to = this.items.length - 1;
    }
    this.pointer = to;
    console.log(`Skipping to item:${this.items[this.pointer].orig_url} 
            with pointer: ${this.pointer}`);
    //OLD
    // This state is set to skipping to avoid a recursive call to playNext
    //  when the player is already playing. This should not cause side effects
    //  because the state is set to 'playing' before stopping the player.
    this.state = "skipping";
    this.player.stop(true);
    //this.playNext();
  }
  _reachedEnd() {
    // This function checks if the queue has reached the end
    if (this.pointer >= this.items.length) {
      return true;
    }
    return false;
  }
  _checkPlayConditions() {
    //player status?
    console.log(`player status: ${this.player.state.status}`);
    // This shoulndt act if the player is already playing, that is handled
    //  by other methods such as replay, skip, stop, etc.
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      console.log("Player is already playing");
      return false;
    }
    if (this.isEmpty()) {
      console.log("Queue is empty");
      this._onQueueEmpty(); // Probably could be
      // made an event so others can listen to it
      return false;
    }
    if (this._reachedEnd()) {
      console.log("Reached end of queue");
      this._onQueueEnd();
      return false;
    }
    return true;
  }

  // Play the next item in the queue
  //TODO: PROMISES
  async playNext() {
    console.log("Checking...");
    if (!this._checkPlayConditions()) {
      return;
    }
    try {
      console.log("Extracting...");
      const url = this.items[this.pointer].orig_url;
      //We should minimize the number of times we call yt-dlp
      // as it is slow. Youtube URLs specifically have a pretty
      // long expiration so we could cache most of the queue and
      // whenever get an error or similar then we re-do for the
      // next elements
      let resource = await this.urlExtractor.createAudioResource(url);

      console.log("Playing next item:", url);
      this.pointer++;
      this.state = "playing";
      this.paused = true;
      await this.player.stop(true);
      //play will perform a stop leading into idle state
      //  thus emiting the idle event. This should be handled
      this.resource = resource;
      await this.player.play(resource);
      this.paused = false;
    } catch (error) {
      if (error instanceof YtDlpExtractError) {
        console.error("Error extracting URL:", error);
        this.pointer++;
        this.playNext();
      } else {
        console.error("Unexpected error:", error);
      }
    }
  }
  // Add an item to the queue
  // Could be a single URL or an array of URLs
  enqueue(items) {
    if (Array.isArray(items)) {
      for (const item of items) {
        this._enqueueSingle(item);
      }
    } else {
      this._enqueueSingle(items);
    }
  }
  _enqueueSingle(item) {
    if (this.items.length === 0) {
      this.pointer = 0;
    }
    this.items.push(item);
    this.emit("added", item);
  }

  // Peek at the first item without removing it
  peek() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.items[this.pointer];
  }

  // Check if the queue is empty
  isEmpty() {
    return this.items.length === 0;
  }

  // Get the size of the queue
  size() {
    return this.items.length;
  }
}

export default Queue;
