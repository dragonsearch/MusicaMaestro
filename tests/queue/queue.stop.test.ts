import { describe, expect, it } from "vitest";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * stop() is a hard reset: it must leave the queue exactly as a fresh one.
 *
 * Why the state is asserted as a whole object: several methods read
 * `queueState` (the pointer setter, the player error handler), so a partial
 * reset leaves stale flags that crash later. Comparing the entire object
 * catches a newly added field that stop() forgot to reset.
 *
 * The last two tests are the real point: after stop(), the queue must still be
 * usable. They assert "does not throw" rather than a specific value because
 * the failure mode was a crash on undefined state.
 */
describe("Queue.stop", () => {
  // Whole-object comparison on purpose: if a field is added to queueState and
  // stop() forgets it, this fails. Field-by-field assertions would not.
  it("resets the full queue state", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.queueState.status = "playing";

    queue.stop();

    expect(queue.queueState).toEqual({
      status: "idle",
      errored: false,
      skipped: false,
      replay: { replaying: false, last_replayed: null, tries: 0 },
    });
  });

  // stop() writes `_pointer` directly rather than through the setter, because
  // the setter can redirect to currentIndex during replay or ignore the write
  // in current loop mode. This test proves the direct write wins.
  it("resets pointer and currentIndex", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));
    queue.queueState.status = "playing";
    queue.skip(2);

    queue.stop();

    expect(queue.pointer).toBe(0);
    expect(queue.currentIndex).toBe(0);
  });

  it("clears items and resource", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"));
    queue.resource = { url: "x" } as never;

    queue.stop();

    expect(queue.items).toEqual([]);
    expect(queue.resource).toBeNull();
  });

  // Without this, an in-flight playlist extraction would keep emitting
  // "resolve" after stop() and repopulate the queue the user just cleared.
  it("stops pending resolve requests", () => {
    const { queue, extractor } = makeQueue();

    queue.stop();

    expect(extractor.stopped).toBe(true);
  });

  it("emits queueEnd", () => {
    const { queue } = makeQueue();
    let emitted = 0;
    queue.on("queueEnd", () => emitted++);

    queue.stop();

    expect(emitted).toBe(1);
  });

  // Regression guard: a partial state reset used to leave the pointer setter
  // reading undefined and throwing on the next skip.
  it("leaves the queue usable: skip() does not throw after stop()", () => {
    const { queue } = makeQueue();
    queue.stop();

    expect(() => queue.skip(0)).not.toThrow();
  });

  // Same regression guard for the other reader of queueState. The error
  // handler runs on a library event, so a throw here would be an uncaught
  // exception rather than a rejected promise.
  it("leaves the queue usable: player error handler does not throw after stop()", () => {
    const { queue, player } = makeQueue();
    queue.stop();

    expect(() => player.emit("error", new Error("boom"))).not.toThrow();
  });
});
