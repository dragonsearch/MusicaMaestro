import { describe, expect, it } from "vitest";
import Queue from "../../src/queue/queue.js";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * Small surface area and the wiring that is not obvious from any one method.
 *
 * The resolve-listener tests are the important ones here: enqueue() does not
 * add items, the extractor's "resolve" event does. That listener also starts
 * playback when the queue was idle, which is the only path that begins audio
 * without a command calling playNext directly.
 *
 * The loop-control tests cover the flags only. What those flags DO to the
 * pointer is in queue.pointer.test.ts.
 */
describe("Queue basics", () => {
  it("reports empty and size", () => {
    const { queue } = makeQueue();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);

    queue.items.push(makeItem("a"));
    expect(queue.isEmpty()).toBe(false);
    expect(queue.size()).toBe(1);
  });

  it("peek throws on an empty queue", () => {
    const { queue } = makeQueue();
    expect(() => queue.peek()).toThrow("Queue is empty");
  });

  it("peek returns the item at the pointer", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue._pointer = 1;

    expect(queue.peek().original_url).toBe("b");
  });

  // enqueue() does not add items; this listener does. See queue.enqueue.test.ts.
  it("adds resolved items to the queue", () => {
    const { queue, extractor } = makeQueue();

    extractor.resolveItem(makeItem("a"));

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0].original_url).toBe("a");
  });

  // The only path that starts audio without a command calling playNext.
  // The idle -> playing flip and the play call both happen inside the
  // resolve listener, which is why this test awaits a macrotask.
  it("starts playing when the first item resolves on an idle queue", async () => {
    const { queue, player, extractor } = makeQueue();

    extractor.resolveItem(makeItem("a"));
    // playNext is fire-and-forget from the resolve handler, so let it settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queue.queueState.status).toBe("playing");
    expect(player.played).toHaveLength(1);
  });

  // Adding a song to a playing queue must not interrupt the current song.
  // The item is queued; playback continues untouched.
  it("does not start playback when an item resolves while already playing", async () => {
    const { queue, player, extractor } = makeQueue();
    queue.queueState.status = "playing";

    extractor.resolveItem(makeItem("a"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queue.items).toHaveLength(1);
    expect(player.played).toHaveLength(0);
  });
});

describe("Queue construction", () => {
  // The extractor argument is optional. Production constructs Queue with only
  // a player, so the default must be a working extractor, not undefined.
  it("creates a real extractor when none is injected", () => {
    const { player } = makeQueue();

    const queue = new Queue(player);

    // The default is the yt-dlp extractor, which is an EventEmitter.
    expect(typeof queue.urlExtractor.on).toBe("function");
    expect(typeof queue.urlExtractor.requestItems).toBe("function");
  });

  it("starts idle with an empty queue and no resource", () => {
    const { queue } = makeQueue();

    expect(queue.queueState.status).toBe("idle");
    expect(queue.items).toEqual([]);
    expect(queue.resource).toBeNull();
    expect(queue.pointer).toBe(0);
    expect(queue.currentIndex).toBe(0);
  });
});

describe("Queue loop controls", () => {
  it("sets the loop mode", () => {
    const { queue } = makeQueue();

    queue.setLoopMode("current");

    expect(queue.loop.mode).toBe("current");
  });

  it("enables and disables looping", () => {
    const { queue } = makeQueue();

    queue.toggleLoop();
    expect(queue.loop.enabled).toBe(true);

    queue.disableLoop();
    expect(queue.loop.enabled).toBe(false);
  });

  // _reachedEnd() short-circuits on loop.enabled, so a pointer past the end
  // does not end the queue while looping. The pointer setter wraps it instead.
  it("never reports the end while looping", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"));
    queue._pointer = 1;
    queue.toggleLoop();

    expect(queue._reachedEnd()).toBe(false);
  });

  it("reports the end when the pointer passes the last item", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"));
    queue._pointer = 1;

    expect(queue._reachedEnd()).toBe(true);
  });
});
