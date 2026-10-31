import { AudioPlayerStatus } from "@discordjs/voice";
import { describe, expect, it } from "vitest";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * Queue reacts to two AudioPlayer events, both registered in the constructor:
 *
 *   "stateChange" -> when the new state is Idle, call _onPlayerIdle()
 *   "error"       -> replay the current track (unless a replay is in flight)
 *
 * Why these tests: this is the bot's event loop. A song ending, a song failing,
 * and the queue running dry all arrive here. The guard chain in
 * _onPlayerIdle() decides whether to play the next item, end the queue, or do
 * nothing, and each guard has a test below.
 *
 * The fake player does not emit "stateChange" on stop(), so tests emit it
 * explicitly through emitIdle(). The player's own `state` is left untouched by
 * the helper so a test can set it first (e.g. to Playing or Buffering).
 */
function emitIdle(player: ReturnType<typeof makeQueue>["player"]) {
  player.emit("stateChange", {}, { status: AudioPlayerStatus.Idle });
}

describe("Queue player events", () => {
  // Guard 1: nobody is listening. Playing would consume the queue silently,
  // so the handler bails before touching the pointer.
  it("does nothing when there is no playable connection", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";
    player.playable = [];

    emitIdle(player);

    expect(player.played).toHaveLength(0);
  });

  // Guard 2: an idle queue has nothing to advance. This is the state after
  // stop() or after the queue ended, so the handler must stay quiet.
  it("does nothing when the queue is not playing", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));

    emitIdle(player);

    expect(player.played).toHaveLength(0);
  });

  // Guard 3: a stale Idle event while the player is actually playing must not
  // start a second track on top of the first.
  it("does nothing when the player is already playing", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";
    player.state = { status: AudioPlayerStatus.Playing };

    emitIdle(player);

    expect(player.played).toHaveLength(0);
  });

  // Guard 4: nothing queued. _onQueueEmpty() is a no-op today, so the queue
  // stays "playing" and waits for the next resolve event.
  it("does nothing when the queue is empty", () => {
    const { queue, player } = makeQueue();
    queue.queueState.status = "playing";

    emitIdle(player);

    expect(player.played).toHaveLength(0);
  });

  it("keeps the queue playing when it is empty but not ended", () => {
    const { queue, player } = makeQueue();
    queue.queueState.status = "playing";
    // _onQueueEmpty is a no-op today, so the status must stay untouched.
    // Pinned here so adding removal logic later is a visible change.
    emitIdle(player);

    expect(queue.queueState.status).toBe("playing");
    expect(queue.pointer).toBe(0);
  });

  // Guard 5: the last song finished. The queue emits "queueEnd" (the bot uses
  // it to leave the voice channel) and flips back to idle.
  it("ends the queue when the pointer reached the end", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";
    queue._pointer = 1;
    let ended = 0;
    queue.on("queueEnd", () => ended++);

    emitIdle(player);

    expect(ended).toBe(1);
    expect(queue.queueState.status).toBe("idle");
    expect(player.played).toHaveLength(0);
  });

  // All guards pass: this is the normal "song ended, play the next one" path.
  it("plays the next item when idle and conditions allow it", async () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";

    emitIdle(player);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(player.played).toHaveLength(1);
    expect(queue.pointer).toBe(1);
  });

  it("ignores a player error while a replay is already in progress", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";
    queue.queueState.replay.replaying = true;

    player.emit("error", new Error("boom"));

    // The guard exists so one failure does not stack replays on top of
    // each other. Nothing about the retry budget may change here.
    expect(queue.queueState.replay.tries).toBe(0);
    expect(queue.queueState.replay.replaying).toBe(true);
  });

  // The error handler delegates to replay() and then clears the flags it set,
  // so the next error is treated as a fresh failure rather than a duplicate.
  it("replays the current song on a player error", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    queue.currentIndex = 0;
    queue._pointer = 0;

    player.emit("error", new Error("boom"));

    expect(queue.queueState.replay.tries).toBe(1);
    expect(queue.queueState.replay.last_replayed).toBe(0);
    // The handler clears the flag so the next error can trigger a replay.
    expect(queue.queueState.replay.replaying).toBe(false);
    expect(queue.queueState.errored).toBe(false);
  });
});

describe("Queue._restartPlaying", () => {
  // _restartPlaying is the shared "make the player reflect the new pointer"
  // step used by skip() and replay(). Playing -> stop, which lets the real
  // player emit Idle and re-enter _onPlayerIdle.
  it("stops the player when it is playing", () => {
    const { queue, player } = makeQueue();
    queue.queueState.status = "playing";
    player.state = { status: AudioPlayerStatus.Playing };

    queue._restartPlaying();

    expect(player.state.status).toBe(AudioPlayerStatus.Idle);
  });

  it("plays the next item when the player is idle", async () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";

    queue._restartPlaying();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(player.played).toHaveLength(1);
  });

  it("does nothing when the queue is not playing", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));

    queue._restartPlaying();

    expect(player.played).toHaveLength(0);
  });

  // Buffering is neither Playing nor Idle. Neither branch matches, so the
  // player is left alone rather than being stopped mid-buffer.
  it("does nothing while the player is buffering", () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";
    player.state = { status: AudioPlayerStatus.Buffering };

    queue._restartPlaying();

    expect(player.played).toHaveLength(0);
    expect(player.state.status).toBe(AudioPlayerStatus.Buffering);
  });
});
