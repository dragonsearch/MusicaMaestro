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

    this.queueState = {
      status: "idle",
      // Keeps track of the error state, which is set to true on error
      // and set to false when the queue is replayed
      errored: false,
    };
    //Keeps track of the tracks that were errored and retried to be played
    // 3 times before skipping
    this.queueState.replay = {
      replaying: false,
      last_replayed: null,
      tries: 0,
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
        ...this.queueState,
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
    if (this.queueState.replay.replaying) {
      // If the queue was replayed, we need to set the pointer to the
      // current song.
      this._pointer = this.currentIndex;
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
        //Skipping to the end of the queue is also considered
        newValue = this.items.length;
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
      ...this.queueState,
      status: "idle",
      errored: false,
    };
    this.pointer = 0;
    return true;
  }

  replay() {
    if (this.queueState.last_replayed != this.currentIndex) {
      // The replay feature is added by using a new state: replayed.
      // We need a song-> n errors map.
      // We should abstract functionality and refactor code into classes
      // and methods on a later updater.
      this.queueState.replay = {
        replaying: true,
        last_replayed: this.currentIndex,
        tries: 0,
      };
    }
    if (this.queueState.replay.tries > 3) {
      this.queueState.replay.tries = 0;
      this.queueState.replay.replaying = false;
      this.skip();
      return;
    } else {
      this.pointer--; // This will set the pointer to the previous song
      // because replaying is enabled, not because of the value of the pointer.
      this.queueState.replay.tries++;
      this.queueState.replay.replaying = true;
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
      `Skipping to item:
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

    try {
      logger.debug("Extracting URL");
      const url = this.items[this.pointer].orig_url;

      let resource = await this.urlExtractor.createAudioResource(url);

      logger.debug(`Playing next item: ${url} with pointer: ${this.pointer}`);
      this.currentIndex = this.pointer;
      this.pointer++;
      this.resource = resource;
      await this.player.play(resource);
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

    if (this.queueState.errored && !this.queueState.replay.replaying) {
      logger.debug("Player errored, trying to replay");
      this.replay();
      this.queueState.replay.replaying = false;
      this.queueState.errored = false;
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
