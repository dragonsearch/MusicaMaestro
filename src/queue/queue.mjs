import Yt_dlp_Extractor from "../extractor/Yt-dlp_Extractor.mjs";
import EventEmitter from "events";
import { AudioPlayerStatus } from "@discordjs/voice";
import { YtDlpExtractError } from "../extractor/Yt-dlp_Extractor.mjs";
import { logger } from "../utils/logger/logger.mjs";
class Queue extends EventEmitter {
  constructor(
    player,
    urlExtractor = null,
    loop = { enabled: false, mode: null }
  ) {
    super();
    this.loop = loop;
    this.player = player;
    this.items = [];
    this.replaytries = 0;
    this.queueState = {
      status: "idle",
      errored: false,
    };
    // Resource being played. Probably could make a class
    // that handles resources instead of hardcoding.
    this.resource = null;
    this.on("start", () => {
      // This should only be called for starting an Idle queue.
      if (this.queueState.status !== "idle") {
        return;
      }
      logger.info("Queue initializing");
      this.queueState = {
        status: "playing",
        errored: false,
      };
      this.playNext();
    });

    this.player.on("error", (error) => {
      this.queueState.errored = true;
      logger.error("Error:", error);
      logger.error("Error message:", error.message);
      //Print stream
    });

    this.player.on("stateChange", (old, newstate) => {
      if (newstate.status === AudioPlayerStatus.Idle) {
        this._onIdle();
      }
    });
    this.currentIndex = 0;
    // Points to the next item to be played.
    this._pointer = 0;
    if (!urlExtractor) {
      this.urlExtractor = new Yt_dlp_Extractor();
    }
  }
  set pointer(newValue) {
    // Using this approach of setting the pointer differently based on conditions
    //  allows us to handle the loop, replay, skip and idle
    // in a single place, thus minimizing the amount of code needed to handle
    // these events, less prone to errors and reducing the semantics of each function
    const isCurrentLoop = this.loop.enabled && this.loop.mode === "current";
    const isPlaylistLoop = this.loop.enabled && this.loop.mode === "playlist";
    const isCurrentLoopSkipped = this.queueState.skipped && isCurrentLoop;
    if (this.queueState.replayed) {
      // If the queue was replayed, we need to set the pointer to the
      // current song.
      this._pointer = this.currentIndex;
      this.queueState.replayed = false;
      return;
    }
    if (isCurrentLoop) {
      if (!this.queueState.skipped) {
        // No change needed, it is following the current song.
        return;
      }
    }
    if (this.isEmpty()) {
      this._pointer = 0;
      return;
    }
    if (newValue < 0) {
      this._pointer = 0;
      return;
    }
    if (newValue >= this.items.length) {
      if (isPlaylistLoop || isCurrentLoopSkipped) {
        newValue = 0;
      } else {
        newValue = this.items.length - 1;
      }
    }
    this._pointer = newValue;
  }
  get pointer() {
    return this._pointer;
  }
  setLoopMode(mode) {
    // playlist, current, null
    this.loop.mode = mode;
  }
  toggleLoop() {
    this.loop.enabled = true;
  }
  disableLoop() {
    this.loop.enabled = false;
  }
  _onQueueEnd() {
    this.emit("queueEnd");
    logger.info("Queue end");
    this.queueState = {
      status: "idle",
      errored: false,
    };
    return true;
  }

  replay() {
    if (this.replaytries > 3) {
      this.replaytries = 0;
      this.skip();
      return;
    } else {
      this.queueState.replayed = true;
      this.pointer--;
      this.replaytries++;
      this._restartPlaying();
    }
  }
  stop() {
    this.items = [];
    this.pointer = 0;
    this.player.stop(true);
    this.emit("queueEnd");
    this.queueState = {
      status: "idle",
      errored: false,
    };
  }

  skip(to = this.pointer) {
    this.queueState.skipped = true;
    this.pointer = to;
    this.queueState.skipped = false;
    logger.info(
      `Skipping to item:${this.items[this.pointer].orig_url}
            with pointer: ${this.pointer}`
    );
    this._restartPlaying();
  }
  _restartPlaying() {
    if (this.queueState.status === "playing") {
      if (this.player.state.status === AudioPlayerStatus.Playing) {
    this.player.stop(true);
      } else if (this.player.state.status === AudioPlayerStatus.Idle) {
        this._onIdle();
      }
    }
  }
  _reachedEnd() {
    if (this.loop.enabled) {
      return false;
    }
    if (this.pointer >= this.items.length) {
      return true;
    }
    return false;
  }
  _checkPlayConditions() {
    // This shouldn't act if the player is already playing, that is handled
    //  by other methods such as replay, skip, stop, etc.
    if (this.queueState.status !== "playing") {
      logger.debug("Queue is not playing songs");
      return false;
    }
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
    // The entry points to this function are limited to these:
    // Calls from within this function, whenever there is an error loading the url
    // _onIdle calls
    // the play initial event
    // Skip function whenever it is not onIdle

    try {
      logger.debug("Extracting URL");
      const url = this.items[this.pointer].orig_url;

      let resource = await this.urlExtractor.createAudioResource(url);

      logger.debug(`Playing next item: ${url} with pointer: ${this.pointer}`);
      this.currentIndex = this.pointer;
      this.pointer++;
      this.paused = true;
      this.resource = resource;
      await this.player.stop(true);
      await this.player.play(resource);
      this.state = {
        status: "playing",
        errored: false,
      };
    } catch (error) {
      if (error instanceof YtDlpExtractError) {
        logger.error("Error extracting URL:", error);
        this.skip(this.pointer + 1);
      } else {
        logger.error("Unexpected error:", error.message);
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
  _onQueueEmpty() {
    //TODO: When we add a remove from playlist we will need to handle queue empty
    return;
  }
  _onIdle() {
      logger.debug("Player is idle! Event was fired");
    if (this.player.subscribers.length === 0) {
      return;
    }

    if (this.queueState.errored) {
      this.replay();
      return;
    }
    logger.debug("Checking play conditions");
    if (this._checkPlayConditions()) {
          this.playNext();
      return;
    }
  }
}

export default Queue;
