import Yt_dlp_Extractor from "../extractor/Yt-dlp_Extractor.mjs";
import EventEmitter from "events";
import { AudioPlayerStatus } from "@discordjs/voice";
import { YtDlpExtractError } from "../extractor/Yt-dlp_Extractor.mjs";
import { logger } from "../utils/logger/logger.mjs";
class Queue extends EventEmitter {
  constructor(player, urlExtractor = null, loop = false) {
    super();
    this.loop = loop;
    this.player = player;
    this.items = [];
    this.replaytries = 0;
    // Resource being played. Probably could make a class
    // that handles resources instead of hardcoding.
    this.resource = null;
    this.on("play", () => {
      // get player status
      logger.info("Queue initializing");
      this.playNext();
    });
    this.player.on("error", (error) => {
      this.replay();
      logger.error("Error:", error.message);
    });

    this.player.on(AudioPlayerStatus.Idle, this._onIdle.bind(this));
    this.pointer = 0;
    if (!urlExtractor) {
      this.urlExtractor = new Yt_dlp_Extractor();
    }
  }

  setLoop(loop) {
    this.loop = loop;
  }

  _onQueueEnd() {
    this.emit("queueEnd");
    logger.info("Queue end");
    this.pointer = 0;
    if (this.loop) {
      this.pointer = 0;
      this.playNext();
    } else {
      return true;
    }
    return true;
  }

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
    this.items = [];
    this.pointer = 0;
    this.player.stop(true);
    this.emit("queueEnd");
  }
  skip(to) {
    if (to < 0) {
      to = 0;
    }
    if (to >= this.items.length) {
      //This wont make the playlist able to stop using skip
      to = this.items.length - 1;
    }
    this.pointer = to;
    logger.info(
      `Skipping to item:${this.items[this.pointer].orig_url}
            with pointer: ${this.pointer}`
    );
    this.player.stop(true);
  }
  _reachedEnd() {
    if (this.pointer >= this.items.length) {
      return true;
    }
    return false;
  }
  _checkPlayConditions() {
    // This shouldn't act if the player is already playing, that is handled
    //  by other methods such as replay, skip, stop, etc.
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      logger.debug("Player is already playing");
      return false;
    }
    if (this.isEmpty()) {
      logger.debug("Queue is empty");
      this._onQueueEmpty();
      return false;
    }
    if (this._reachedEnd()) {
      logger.debug("Reached end of queue");
      this._onQueueEnd();
      return false;
    }
    return true;
  }

  async playNext() {
    logger.debug("Checking play conditions");
    if (!this._checkPlayConditions()) {
      return;
    }
    try {
      logger.debug("Extracting URL");
      const url = this.items[this.pointer].orig_url;

      let resource = await this.urlExtractor.createAudioResource(url);

      logger.debug(`Playing next item: ${url} with pointer: ${this.pointer}`);
      this.pointer++;
      this.paused = true;
      this.resource = resource;
      await this.player.stop(true);
      await this.player.play(resource);
      this.paused = false;
    } catch (error) {
      if (error instanceof YtDlpExtractError) {
        logger.error("Error extracting URL:", error);
        this.pointer++;
        this.playNext();
      } else {
        logger.error("Unexpected error:", error);
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

  peek() {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.items[this.pointer];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
  _onIdle() {
    {
      logger.debug("Player is idle! Event was fired");
      if (!this.paused && this.player.subscribers.length > 0) {
        if (this.resource && this.resource.ended) {
          if (this._reachedEnd()) {
            this._onQueueEnd();
          } else {
            this.playNext();
          }
        } else if (this.resource && !this.resource.ended) {
          this.playNext();
        }
      }
    }
  }
}

export default Queue;
